import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type {
  PolicyMutation,
  PolicyPreview,
  PolicySeed,
  SuppressionMutation,
} from '../../shared/api/types'
import { useApi } from '../../shared/api/context'
import { Button } from '../../shared/ui/button'
import { Modal } from '../../shared/ui/modal'
import { ApiErrorPanel } from '../observability/components'
import { formatCount } from '../tenant/format'
import {
  createPolicy,
  createSuppression,
  getPolicySeed,
  policyKeys,
  previewPolicy,
} from './queries'
import { placementSummary } from './components'

type Source = { groupId: string } | { itemId: string }

export function ObservationPolicyActions({
  projectId,
  applicationId,
  source,
}: {
  projectId: string
  applicationId: string
  source: Source
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'policy' | 'suppression'>()
  const [seed, setSeed] = useState<PolicySeed>()
  const [name, setName] = useState('Expected observed behavior')
  const [reason, setReason] = useState('Temporarily hidden while this behavior is reviewed')
  const [expiresAt, setExpiresAt] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 16),
  )
  const [preview, setPreview] = useState<PolicyPreview>()
  const load = useMutation({
    mutationFn: (next: 'policy' | 'suppression') =>
      getPolicySeed(api, projectId, applicationId, source).then((value) => ({ next, value })),
    onSuccess: ({ next, value }) => {
      setSeed(value)
      setPreview(undefined)
      setMode(next)
    },
  })
  const revision =
    seed?.state === 'available'
      ? ({
          source_inventory_item_id: seed.seed.source_inventory_item_id!,
          ...(seed.seed.source_runtime_group_id
            ? { source_runtime_group_id: seed.seed.source_runtime_group_id }
            : {}),
          placement: seed.seed.placement,
          inside_effect: seed.seed.inside_effect,
          ...(seed.seed.outside_effect ? { outside_effect: seed.seed.outside_effect } : {}),
        } satisfies PolicyMutation['revision'])
      : undefined
  const previewMutation = useMutation({
    mutationFn: () => previewPolicy(api, projectId, applicationId, revision!),
    onSuccess: setPreview,
  })
  const create = useMutation({
    mutationFn: () =>
      createPolicy(api, projectId, applicationId, { name: name.trim(), revision: revision! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: policyKeys.all(projectId, applicationId) })
      setMode(undefined)
    },
  })
  const suppress = useMutation({
    mutationFn: () =>
      createSuppression(api, projectId, applicationId, {
        source_inventory_item_id: revision!.source_inventory_item_id,
        ...(revision!.source_runtime_group_id
          ? { source_runtime_group_id: revision!.source_runtime_group_id }
          : {}),
        placement: revision!.placement,
        reason: reason.trim(),
        expires_at: new Date(expiresAt).toISOString(),
      } satisfies SuppressionMutation),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: policyKeys.all(projectId, applicationId) })
      setMode(undefined)
    },
  })
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" disabled={load.isPending} onClick={() => load.mutate('policy')}>
          Create policy from observation
        </Button>
        <Button
          variant="outline"
          disabled={load.isPending}
          onClick={() => load.mutate('suppression')}
        >
          Temporarily suppress
        </Button>
        <Button asChild variant="ghost">
          <a href={`/projects/${projectId}/applications/${applicationId}/policies`}>
            Manage policies
          </a>
        </Button>
      </div>
      {load.isError && (
        <div className="mt-3">
          <ApiErrorPanel title="Policy seed unavailable" error={load.error} />
        </div>
      )}
      {mode && seed && (
        <Modal
          title={mode === 'policy' ? 'Create managed policy' : 'Temporarily suppress observation'}
          description="Observed facts and discovery lifecycle remain unchanged."
          onClose={() => setMode(undefined)}
          closeDisabled={create.isPending || suppress.isPending}
        >
          {seed.state === 'unavailable' ? (
            <p role="alert">
              This observation cannot seed a policy: {seed.reason.replaceAll('_', ' ')}.
            </p>
          ) : mode === 'policy' ? (
            <div className="space-y-4">
              <label className="block text-sm">
                Policy name
                <input
                  value={name}
                  maxLength={160}
                  onChange={(event) => {
                    setName(event.target.value)
                    setPreview(undefined)
                  }}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                />
              </label>
              <p className="text-sm text-slate-400">
                Scope: {placementSummary(seed.seed.placement)}
              </p>
              {preview && (
                <div
                  className="rounded-lg border border-cyan-800 bg-cyan-950/30 p-3"
                  aria-label="Policy preview"
                >
                  <strong>Preview at {new Date(preview.snapshot_at).toLocaleString()}</strong>
                  <p className="mt-1 text-sm">
                    {formatCount(preview.group_count)} groups and{' '}
                    {formatCount(preview.sighting_count)} sightings affected;{' '}
                    {formatCount(preview.expected_count)} expected,{' '}
                    {formatCount(preview.requires_review_count)} require review.
                  </p>
                </div>
              )}
              {(previewMutation.error || create.error) && (
                <ApiErrorPanel
                  title="Policy command failed"
                  error={previewMutation.error ?? create.error}
                />
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!name.trim() || previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                >
                  Preview impact
                </Button>
                <Button disabled={!preview || create.isPending} onClick={() => create.mutate()}>
                  Create policy
                </Button>
              </div>
              {!preview && (
                <p className="text-xs text-slate-400">Preview is required before creation.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm">
                Reason
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1 min-h-24 w-full rounded border border-slate-700 bg-slate-950 p-2"
                />
              </label>
              <label className="block text-sm">
                Expires at
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
                />
              </label>
              <p className="text-sm text-slate-400">
                Scope: {placementSummary(seed.seed.placement)}. Maximum duration is 90 days.
              </p>
              {suppress.error && (
                <ApiErrorPanel title="Suppression failed" error={suppress.error} />
              )}
              <Button
                disabled={!reason.trim() || !expiresAt || suppress.isPending}
                onClick={() => suppress.mutate()}
              >
                Create suppression
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

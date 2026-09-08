import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'
import {
  cancelSuppression,
  policiesOptions,
  policyKeys,
  policyRevisionsOptions,
  setPolicyEnabled,
  suppressionsOptions,
} from '../features/policies/queries'
import { formatTimestamp } from '../features/tenant/format'
import {
  placementSummary,
  PolicyEffectBadge,
  suppressionBehaviorSummary,
} from '../features/policies/components'

export const Route = createFileRoute('/projects/$projectId/applications/$applicationId/policies')({
  component: PoliciesPage,
})

function PoliciesPage() {
  const { projectId, applicationId } = Route.useParams()
  const api = useApi()
  const queryClient = useQueryClient()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))
  const policies = useQuery(policiesOptions(api, projectId, applicationId))
  const suppressions = useQuery(suppressionsOptions(api, projectId, applicationId))
  const [historyPolicyId, setHistoryPolicyId] = useState<string>()
  const [renderedAt] = useState(() => Date.now())
  const history = useQuery({
    ...policyRevisionsOptions(api, projectId, applicationId, historyPolicyId ?? 'none'),
    enabled: Boolean(historyPolicyId),
  })
  const enabled = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      setPolicyEnabled(api, projectId, applicationId, id, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: policyKeys.all(projectId, applicationId) }),
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelSuppression(api, projectId, applicationId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: policyKeys.suppressions(projectId, applicationId),
      }),
  })
  if (project.isPending || application.isPending || policies.isPending || suppressions.isPending)
    return <Loading label="Loading managed runtime policies…" />
  if (project.isError || application.isError || policies.isError || suppressions.isError)
    return (
      <ErrorState
        title="Managed runtime policies unavailable"
        error={project.error ?? application.error ?? policies.error ?? suppressions.error}
      />
    )
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/projects/$projectId" params={{ projectId }}>
          {project.data.name}
        </Link>
        <span>/</span>
        <Link
          to="/projects/$projectId/applications/$applicationId"
          params={{ projectId, applicationId }}
        >
          {application.data.name}
        </Link>
        <span>/</span>
        <span aria-current="page">Managed policies</span>
      </nav>
      <header>
        <p className="eyebrow">Application intent</p>
        <h1 className="mt-2 text-4xl font-semibold">Managed runtime policies</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Policies classify observed behavior. They do not change discovery lifecycle or delete
          evidence.
        </p>
      </header>
      <section aria-labelledby="policies-title" className="space-y-3">
        <h2 id="policies-title" className="text-2xl font-semibold">
          Policies
        </h2>
        {policies.data.items.length === 0 && (
          <Card>
            <p>No policies yet. Create one from a Runtime Group or inventory observation.</p>
          </Card>
        )}
        {policies.data.items.map((policy) => (
          <Card key={policy.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{policy.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {policy.inventory_kind ?? 'No current revision'} · revision{' '}
                  {policy.revision_number ?? '—'} · {policy.enabled ? 'enabled' : 'disabled'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setHistoryPolicyId(policy.id)}>
                  Revision history
                </Button>
                <Button
                  variant="outline"
                  disabled={enabled.isPending || policy.enabled === null}
                  onClick={() => enabled.mutate({ id: policy.id, value: !policy.enabled })}
                >
                  {policy.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
            <dl className="details mt-4">
              <dt>Inside scope</dt>
              <dd>
                <PolicyEffectBadge effect={policy.inside_effect} />
              </dd>
              <dt>Outside scope</dt>
              <dd>
                <PolicyEffectBadge effect={policy.outside_effect} />
              </dd>
              <dt>Updated</dt>
              <dd>{formatTimestamp(policy.updated_at)}</dd>
            </dl>
          </Card>
        ))}
      </section>
      {historyPolicyId && (
        <section aria-labelledby="history-title" className="space-y-3">
          <div className="flex justify-between gap-3">
            <h2 id="history-title" className="text-2xl font-semibold">
              Revision history
            </h2>
            <Button variant="ghost" onClick={() => setHistoryPolicyId(undefined)}>
              Close
            </Button>
          </div>
          {history.isPending && <Loading label="Loading revision history…" />}
          {history.data?.items.map((revision) => (
            <Card key={revision.id}>
              <h3 className="font-semibold">Revision {revision.revision_number}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {revision.enabled ? 'Enabled' : 'Disabled'} · {formatTimestamp(revision.created_at)}
              </p>
              <dl className="details mt-3">
                <dt>Inside scope</dt>
                <dd>
                  <PolicyEffectBadge effect={revision.inside_effect} />
                </dd>
                <dt>Outside scope</dt>
                <dd>
                  <PolicyEffectBadge effect={revision.outside_effect} />
                </dd>
              </dl>
            </Card>
          ))}
        </section>
      )}
      <section aria-labelledby="suppressions-title" className="space-y-3">
        <h2 id="suppressions-title" className="text-2xl font-semibold">
          Suppression history
        </h2>
        {suppressions.data.items.length === 0 && (
          <Card>
            <p>No suppressions recorded.</p>
          </Card>
        )}
        {suppressions.data.items.map((suppression) => {
          const active =
            !suppression.cancelled_at && Date.parse(suppression.expires_at) > renderedAt
          const status = active ? 'Active' : suppression.cancelled_at ? 'Cancelled' : 'Expired'
          const statusTone = active
            ? 'border-emerald-700 bg-emerald-950 text-emerald-200'
            : suppression.cancelled_at
              ? 'border-slate-600 bg-slate-900 text-slate-200'
              : 'border-amber-700 bg-amber-950 text-amber-200'
          return (
            <Card key={suppression.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{suppression.reason}</h3>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone}`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    expires {formatTimestamp(suppression.expires_at)}
                  </p>
                </div>
                {active && (
                  <Button
                    variant="outline"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(suppression.id)}
                  >
                    Cancel suppression
                  </Button>
                )}
              </div>
              <dl className="details mt-3">
                <dt>Suppressed observation</dt>
                <dd className="break-all font-mono">{suppressionBehaviorSummary(suppression)}</dd>
                <dt>Scope</dt>
                <dd>
                  {placementSummary({
                    cluster_ids: suppression.cluster_ids,
                    namespaces: suppression.namespaces,
                    workload_kinds: suppression.workload_kinds,
                    workload_names: suppression.workload_names,
                  })}
                </dd>
                {(suppression.source_runtime_group_id || suppression.source_inventory_item_id) && (
                  <>
                    <dt>Source</dt>
                    <dd>
                      <a
                        className="text-cyan-300 hover:text-cyan-200"
                        href={
                          suppression.source_runtime_group_id
                            ? `/projects/${projectId}/applications/${applicationId}/runtime-groups/${suppression.source_runtime_group_id}`
                            : `/projects/${projectId}/applications/${applicationId}/runtime-inventory/${suppression.source_inventory_item_id}?kind=${suppression.inventory_kind}`
                        }
                      >
                        Open source observation
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

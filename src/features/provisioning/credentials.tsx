import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApplicationCredential, IssuedApplicationCredential } from '../../shared/api/types'
import { useApi } from '../../shared/api/context'
import { ApiClientError } from '../../shared/api/client'
import {
  applicationCredentialsOptions,
  issueApplicationCredential,
  provisioningKeys,
  revokeApplicationCredential,
} from '../../shared/api/provisioning'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { Modal } from '../../shared/ui/modal'
import { formatTimestamp } from '../tenant/format'

export const credentialStatus = (credential: ApplicationCredential) =>
  credential.revoked_at ? 'revoked' : credential.last_used_at ? 'active' : 'never-used'

export function AgentCredentials({
  projectId,
  applicationId,
}: {
  projectId: string
  applicationId: string
}) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const query = useQuery(applicationCredentialsOptions(api, projectId, applicationId))
  const [issuing, setIssuing] = useState(false)
  const [issued, setIssued] = useState<IssuedApplicationCredential | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApplicationCredential | null>(null)
  const issue = useMutation({
    retry: false,
    mutationFn: (name: string) =>
      issueApplicationCredential(api, projectId, applicationId, { name }),
    onSuccess: (credential) => {
      setIssued(credential)
      setIssuing(false)
      issue.reset()
      void queryClient.invalidateQueries({
        queryKey: provisioningKeys.credentials(projectId, applicationId),
      })
    },
  })
  const revoke = useMutation({
    retry: false,
    mutationFn: (credentialId: string) =>
      revokeApplicationCredential(api, projectId, applicationId, credentialId),
    onSuccess: () => {
      setRevokeTarget(null)
      void queryClient.invalidateQueries({
        queryKey: provisioningKeys.credentials(projectId, applicationId),
      })
    },
  })
  if (query.isPending) return <Loading label={t('loadingCredentials')} />
  if (query.isError)
    return (
      <ErrorState
        title={t('credentialsLoadFailed')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const activeCount = query.data.items.filter((item) => !item.revoked_at).length
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t('agentCredentials')}</p>
          <h2 className="mt-2 text-2xl font-semibold">{t('agentCredentials')}</h2>
        </div>
        <Button onClick={() => setIssuing(true)}>{t('issueCredential')}</Button>
      </div>
      {query.data.items.length === 0 ? (
        <p className="mt-5 text-slate-400">{t('noCredentials')}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-2">{t('name')}</th>
                <th className="p-2">{t('tokenHint')}</th>
                <th className="p-2">{t('created')}</th>
                <th className="p-2">{t('lastUsed')}</th>
                <th className="p-2">{t('status')}</th>
                <th className="p-2">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((credential) => {
                const status = credentialStatus(credential)
                return (
                  <tr key={credential.id} className="border-t border-slate-800">
                    <td className="p-2">{credential.name}</td>
                    <td className="p-2 font-mono">{credential.token_hint}</td>
                    <td className="p-2">{formatTimestamp(credential.created_at)}</td>
                    <td className="p-2">
                      {credential.last_used_at ? formatTimestamp(credential.last_used_at) : '—'}
                    </td>
                    <td className="p-2">
                      {status === 'revoked'
                        ? t('revoked')
                        : status === 'active'
                          ? t('active')
                          : t('neverUsed')}
                    </td>
                    <td className="p-2">
                      {status !== 'revoked' && (
                        <Button variant="outline" onClick={() => setRevokeTarget(credential)}>
                          {t('revoke')}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {issuing && (
        <IssueDialog
          pending={issue.isPending}
          error={issue.error}
          onIssue={issue.mutate}
          onClose={() => {
            issue.reset()
            setIssuing(false)
          }}
        />
      )}
      {issued && <TokenModal credential={issued} onClose={() => setIssued(null)} />}
      {revokeTarget && (
        <Modal
          title={t('revokeCredential')}
          description={
            activeCount === 1
              ? t('lastCredentialWarning')
              : t('revokeWarning', { name: revokeTarget.name })
          }
          onClose={() => {
            revoke.reset()
            setRevokeTarget(null)
          }}
          closeDisabled={revoke.isPending}
        >
          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(revokeTarget.id)}
            >
              {revoke.isPending ? t('revoking') : t('confirmRevoke')}
            </Button>
          </div>
          {revoke.error && <ErrorState error={revoke.error} />}
        </Modal>
      )}
    </Card>
  )
}

function IssueDialog({
  pending,
  error,
  onIssue,
  onClose,
}: {
  pending: boolean
  error: unknown
  onIssue: (name: string) => void
  onClose: () => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name)) {
      setLocalError(t('credentialNameInvalid'))
      return
    }
    onIssue(name)
  }
  const apiError =
    error instanceof ApiClientError && error.detail.kind === 'api' ? error.detail : null
  return (
    <Modal
      title={t('issueCredential')}
      description={t('issueCredentialHelp')}
      onClose={onClose}
      closeDisabled={pending}
    >
      <form onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="credential-name">
          {t('name')}
        </label>
        <input
          autoFocus
          id="credential-name"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setLocalError('')
          }}
          aria-invalid={Boolean(localError || apiError)}
        />
        {(localError || apiError) && (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            {localError || apiError?.fields?.name || apiError?.message}
          </p>
        )}
        <Button className="mt-4" type="submit" disabled={pending}>
          {pending ? t('issuing') : t('issueCredential')}
        </Button>
      </form>
    </Modal>
  )
}

function TokenModal({
  credential,
  onClose,
}: {
  credential: IssuedApplicationCredential
  onClose: () => void
}) {
  const t = useT()
  const [announcement, setAnnouncement] = useState('')
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error()
      await navigator.clipboard.writeText(credential.token)
      setAnnouncement(t('tokenCopied'))
    } catch {
      setAnnouncement(t('copyFailed'))
    }
  }
  return (
    <Modal title={t('saveTokenNow')} description={t('tokenShownOnce')} onClose={onClose}>
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-cyan-200">
        {credential.token}
      </pre>
      <Button className="mt-4" onClick={() => void copy()}>
        {t('copyToken')}
      </Button>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </Modal>
  )
}

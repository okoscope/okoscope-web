import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentUser, selectActiveOrganization } from '../../shared/api/auth'
import { useApi } from '../../shared/api/context'
import { authenticationSession, useAuthentication } from '../../shared/auth/session'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'

export function OrganizationSelection() {
  const auth = useAuthentication()
  const api = useApi()
  const navigate = useNavigate()
  const t = useT()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  if (auth.status !== 'authenticated') return null

  const select = async (organizationId: string) => {
    setPendingId(organizationId)
    setError(null)
    try {
      await selectActiveOrganization(api, { organization_id: organizationId })
      authenticationSession.authenticate(await getCurrentUser(api))
      await navigate({ to: '/' })
    } catch (failure) {
      setError(failure)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="mx-auto max-w-3xl" aria-labelledby="organization-selection-title">
      <p className="eyebrow">OKOSCOPE</p>
      <h1 id="organization-selection-title" className="mt-2 text-4xl font-semibold">
        {auth.context.organizations.length ? t('chooseOrganization') : t('noOrganizations')}
      </h1>
      <p className="mt-3 text-slate-400">
        {auth.context.organizations.length ? t('chooseOrganizationHelp') : t('noOrganizationsHelp')}
      </p>
      {error !== null && (
        <div className="mt-6">
          <ErrorState title={t('organizationSwitchFailed')} error={error} />
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {auth.context.organizations.map((organization) => (
          <Card key={organization.id} className="flex flex-col">
            <h2 className="text-xl font-semibold">{organization.name}</h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{organization.slug}</p>
            <p className="mt-3 text-sm text-slate-300">
              {t('effectiveRole', { role: t(roleKey(organization.role)) })}
            </p>
            <Button
              className="mt-5"
              disabled={pendingId !== null}
              onClick={() => void select(organization.id)}
            >
              {pendingId === organization.id ? t('switchingOrganization') : t('openOrganization')}
            </Button>
          </Card>
        ))}
      </div>
      {auth.context.platform_role === 'super_admin' && (
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => void navigate({ to: '/platform' })}
        >
          {t('openPlatformConsole')}
        </Button>
      )}
    </section>
  )
}

export const roleKey = (role: 'owner' | 'admin' | 'member') =>
  ({ owner: 'roleOwner', admin: 'roleAdmin', member: 'roleMember' })[role] as
    'roleOwner' | 'roleAdmin' | 'roleMember'

import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  acceptInvitationAsExistingUser,
  acceptInvitationAsNewUser,
  inspectInvitation,
  refreshAuthContext,
} from '../../shared/api/access'
import { getCurrentUser, isAnonymousResponse, login } from '../../shared/api/auth'
import { ApiClientError } from '../../shared/api/client'
import { useApi } from '../../shared/api/context'
import type { InvitationInspection } from '../../shared/api/types'
import { authenticationSession, useAuthentication } from '../../shared/auth/session'
import { useLocalization } from '../../shared/i18n'
import { LanguageSelector } from '../../shared/i18n/language-selector'
import { Brand } from '../../shared/ui/brand'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { clearInvitationToken, peekInvitationToken } from './invitation-token'
import { roleKey } from './organization-selection'

type InviteState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; invitation: InvitationInspection }
  | { kind: 'unusable'; error: unknown }
  | { kind: 'accepted'; organizationId: string; projectId: string | null }

export function InvitationScreen() {
  const api = useApi()
  const navigate = useNavigate()
  const { locale, t } = useLocalization()
  const auth = useAuthentication()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [token] = useState(peekInvitationToken)
  const [state, setState] = useState<InviteState>(token ? { kind: 'loading' } : { kind: 'missing' })
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    document.title = `${t('invitationTitle')} · Okoscope`
    if (!token) return
    void inspectInvitation(api, token)
      .then((invitation) => setState({ kind: 'ready', invitation }))
      .catch((failure) => setState({ kind: 'unusable', error: failure }))
  }, [api, t, token])

  useEffect(() => {
    if (authenticationSession.get().status !== 'checking') return
    void getCurrentUser(api)
      .then(authenticationSession.authenticate)
      .catch((failure: unknown) => {
        if (isAnonymousResponse(failure)) authenticationSession.anonymous()
        else authenticationSession.fail(failure)
      })
  }, [api])

  useEffect(() => headingRef.current?.focus(), [state.kind])

  const finish = async (organizationId: string, projectId: string | null) => {
    clearInvitationToken()
    const context = await refreshAuthContext(api)
    authenticationSession.authenticate(context)
    setState({ kind: 'accepted', organizationId, projectId })
  }

  const acceptNewUser = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || state.kind !== 'ready') return
    setPending(true)
    setError(null)
    try {
      const result = await acceptInvitationAsNewUser(api, {
        token,
        password,
        display_name: displayName.trim(),
        locale,
      })
      setPassword('')
      await finish(result.organization_id, result.project_id)
    } catch (failure) {
      setPassword('')
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const context = await login(api, { email: email.trim(), password })
      setPassword('')
      authenticationSession.authenticate(context)
    } catch (failure) {
      setPassword('')
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  const acceptExistingUser = async () => {
    if (pending || state.kind !== 'ready') return
    setPending(true)
    setError(null)
    try {
      const result = await acceptInvitationAsExistingUser(api, token)
      await finish(result.organization_id, result.project_id)
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  const openAcceptedScope = async () => {
    if (state.kind !== 'accepted') return
    const context = authenticationSession.get()
    if (context.status === 'authenticated' && context.context.requires_organization_selection) {
      await navigate({ to: '/organizations' })
    } else if (state.projectId) {
      await navigate({ to: '/projects/$projectId', params: { projectId: state.projectId } })
    } else {
      await navigate({ to: '/projects' })
    }
  }

  return (
    <main id="main-content" className="auth-layout min-h-screen p-6">
      <section className="max-w-xl self-center">
        <Brand />
        <p className="eyebrow mt-6">OKOSCOPE</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-4xl font-semibold">
          {t('invitationTitle')}
        </h1>
        <p className="mt-4 text-slate-300">{t('invitationSafetyHelp')}</p>
      </section>
      <Card className="w-full max-w-lg self-center">
        <div className="mb-5 flex justify-end">
          <LanguageSelector />
        </div>
        {state.kind === 'loading' && <Loading label={t('invitationInspecting')} />}
        {state.kind === 'missing' && <InviteUnavailable message={t('invitationMissing')} />}
        {state.kind === 'unusable' && (
          <InviteUnavailable
            message={
              isInviteMismatch(state.error)
                ? t('invitationAccountMismatch')
                : t('invitationUnusable')
            }
            {...(isTransient(state.error)
              ? {
                  retry: () => {
                    setState({ kind: 'loading' })
                    void inspectInvitation(api, token)
                      .then((invitation) => setState({ kind: 'ready', invitation }))
                      .catch((failure) => setState({ kind: 'unusable', error: failure }))
                  },
                }
              : {})}
          />
        )}
        {state.kind === 'ready' && (
          <>
            <InvitationSummary invitation={state.invitation} />
            {state.invitation.account_state === 'new_user' ? (
              <form className="mt-6 space-y-4" onSubmit={(event) => void acceptNewUser(event)}>
                <FormField id="invite-display-name" label={t('displayName')}>
                  <input
                    id="invite-display-name"
                    className="input"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </FormField>
                <FormField id="invite-password" label={t('password')} help={t('passwordHelp')}>
                  <input
                    id="invite-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={256}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormField>
                {error !== null && <ErrorState title={t('invitationAcceptFailed')} error={error} />}
                <Button className="w-full" type="submit" disabled={pending}>
                  {pending ? t('acceptingInvitation') : t('createAccountAndAccept')}
                </Button>
              </form>
            ) : auth.status === 'authenticated' ? (
              <div className="mt-6">
                <p className="text-sm text-slate-300">
                  {t('invitationSignedInAs', { email: auth.context.user.email })}
                </p>
                {error !== null && (
                  <div className="mt-4">
                    {isInviteMismatch(error) ? (
                      <p role="alert" className="text-sm text-amber-200">
                        {t('invitationAccountMismatch')}
                      </p>
                    ) : (
                      <ErrorState title={t('invitationAcceptFailed')} error={error} />
                    )}
                  </div>
                )}
                <Button
                  className="mt-5 w-full"
                  disabled={pending}
                  onClick={() => void acceptExistingUser()}
                >
                  {pending ? t('acceptingInvitation') : t('acceptInvitation')}
                </Button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(event) => void signIn(event)}>
                <p className="text-sm text-slate-300">{t('invitationSignInHelp')}</p>
                <FormField id="invite-email" label={t('email')}>
                  <input
                    id="invite-email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </FormField>
                <FormField id="invite-current-password" label={t('password')}>
                  <input
                    id="invite-current-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormField>
                {error !== null && <ErrorState title={t('signInFailed')} error={error} />}
                <Button className="w-full" type="submit" disabled={pending}>
                  {pending ? t('authenticating') : t('signInToAccept')}
                </Button>
              </form>
            )}
          </>
        )}
        {state.kind === 'accepted' && (
          <section aria-live="polite">
            <h2 className="text-2xl font-semibold">{t('invitationAccepted')}</h2>
            <p className="mt-3 text-slate-300">{t('invitationAcceptedHelp')}</p>
            <Button className="mt-6 w-full" onClick={() => void openAcceptedScope()}>
              {t('continue')}
            </Button>
          </section>
        )}
      </Card>
    </main>
  )
}

function InvitationSummary({ invitation }: { invitation: InvitationInspection }) {
  const { locale, t } = useLocalization()
  const role = t(roleKey(invitation.role))
  return (
    <section aria-labelledby="invitation-summary-title">
      <p className="eyebrow">{t('invitationReview')}</p>
      <h2 id="invitation-summary-title" className="mt-2 text-2xl font-semibold">
        {invitation.project_name ?? invitation.organization_name}
      </h2>
      <dl className="details mt-5">
        <dt>{t('organization')}</dt>
        <dd>{invitation.organization_name}</dd>
        {invitation.project_name && (
          <>
            <dt>{t('project')}</dt>
            <dd>{invitation.project_name}</dd>
          </>
        )}
        <dt>{t('membershipRole')}</dt>
        <dd>{role}</dd>
        <dt>{t('invitedBy')}</dt>
        <dd>{invitation.inviter_display_name}</dd>
        <dt>{t('expires')}</dt>
        <dd>
          {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(invitation.expires_at),
          )}
        </dd>
      </dl>
    </section>
  )
}

function FormField({
  id,
  label,
  help,
  children,
}: {
  id: string
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
    </div>
  )
}

function InviteUnavailable({ message, retry }: { message: string; retry?: () => void }) {
  const t = useLocalization().t
  return (
    <section role="alert">
      <h2 className="text-2xl font-semibold">{t('invitationUnavailable')}</h2>
      <p className="mt-3 text-slate-300">{message}</p>
      {retry && (
        <Button className="mt-5" onClick={retry}>
          {t('tryAgain')}
        </Button>
      )}
      <Link to="/" className="mt-6 inline-block text-cyan-300 underline">
        {t('returnToSignIn')}
      </Link>
    </section>
  )
}

function isInviteMismatch(error: unknown) {
  return (
    error instanceof ApiClientError &&
    error.detail.kind === 'api' &&
    error.detail.code === 'invitation_account_mismatch'
  )
}

function isTransient(error: unknown) {
  return !(error instanceof ApiClientError) || error.detail.kind !== 'api'
}

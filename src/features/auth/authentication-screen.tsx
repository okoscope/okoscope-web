import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  login,
  register,
  requestEmailVerification,
  requestPasswordReset,
} from '../../shared/api/auth'
import { ApiClientError } from '../../shared/api/client'
import { useApi } from '../../shared/api/context'
import type { LoginRequest, RegisterRequest } from '../../shared/api/types'
import { authenticationSession } from '../../shared/auth/session'
import { useLocalization } from '../../shared/i18n'
import { LanguageSelector } from '../../shared/i18n/language-selector'
import { BrandMark } from '../../shared/ui/brand'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'

type AuthenticationMode = 'login' | 'register' | 'forgot' | 'check-email'

export function AuthenticationScreen({ expired }: { expired: boolean }) {
  const { locale, t } = useLocalization()
  const api = useApi()
  const queryClient = useQueryClient()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [mode, setMode] = useState<AuthenticationMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationSlug, setOrganizationSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const [resent, setResent] = useState(false)
  const [checkEmailKind, setCheckEmailKind] = useState<'verification' | 'reset'>('verification')

  useEffect(() => {
    if (mode === 'forgot' || mode === 'check-email') headingRef.current?.focus()
  }, [mode])

  const switchMode = (next: AuthenticationMode) => {
    setMode(next)
    setError(null)
    setResent(false)
    setPassword('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(api, { email: email.trim() })
        setCheckEmailKind('reset')
        switchMode('check-email')
        return
      }
      const body = { email: email.trim(), password }
      if (mode === 'register') {
        await register(api, {
          ...body,
          organization_name: organizationName,
          organization_slug: organizationSlug,
          locale,
        } satisfies RegisterRequest)
        setCheckEmailKind('verification')
        switchMode('check-email')
        return
      }
      const context = await login(api, body satisfies LoginRequest)
      setPassword('')
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'build-info' })
      authenticationSession.authenticate(context)
    } catch (failure) {
      setPassword('')
      if (
        mode === 'login' &&
        failure instanceof ApiClientError &&
        failure.detail.kind === 'api' &&
        failure.detail.status === 403
      ) {
        setCheckEmailKind('verification')
        switchMode('check-email')
      } else {
        setError(failure)
      }
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await requestEmailVerification(api, { email: email.trim() })
      setResent(true)
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  const changeName = (name: string) => {
    setOrganizationName(name)
    if (!slugEdited) setOrganizationSlug(slugify(name))
  }

  return (
    <main id="main-content" className="auth-layout min-h-screen p-6">
      <section className="max-w-xl self-center" aria-labelledby="auth-product-title">
        <BrandMark className="mb-6 h-24 w-32" />
        <p className="eyebrow">OKOSCOPE</p>
        <h1 id="auth-product-title" className="mt-3 text-4xl font-semibold sm:text-5xl">
          {t('authProductTitle')}
        </h1>
        <p className="mt-5 max-w-lg text-lg text-slate-300">{t('authProductHelp')}</p>
        <Link to="/docs" className="mt-6 inline-block text-cyan-300 underline">
          {t('documentation')}
        </Link>
      </section>
      <Card className="w-full max-w-md self-center">
        <div className="mb-5 flex justify-end">
          <LanguageSelector />
        </div>
        {mode === 'login' || mode === 'register' ? (
          <AuthenticationForm
            mode={mode}
            email={email}
            password={password}
            organizationName={organizationName}
            organizationSlug={organizationSlug}
            expired={expired}
            pending={pending}
            error={error}
            onMode={switchMode}
            onEmail={setEmail}
            onPassword={setPassword}
            onOrganizationName={changeName}
            onOrganizationSlug={(value) => {
              setSlugEdited(true)
              setOrganizationSlug(value)
            }}
            onForgot={() => switchMode('forgot')}
            onSubmit={(event) => void submit(event)}
          />
        ) : mode === 'forgot' ? (
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
              {t('forgotPasswordTitle')}
            </h2>
            <p className="text-sm leading-6 text-slate-400">{t('forgotPasswordHelp')}</p>
            <Field label={t('email')} id="recovery-email">
              <input
                id="recovery-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            {error !== null && <ErrorState title={t('passwordResetRequestFailed')} error={error} />}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? t('sendingEmail') : t('sendResetLink')}
            </Button>
            <BackToSignIn onClick={() => switchMode('login')} />
          </form>
        ) : (
          <section aria-labelledby="check-email-title">
            <h2
              ref={headingRef}
              id="check-email-title"
              tabIndex={-1}
              className="text-2xl font-semibold"
            >
              {t('checkEmailTitle')}
            </h2>
            <p role="status" className="mt-3 text-sm leading-6 text-slate-300">
              {t('checkEmailHelp')}
            </p>
            <p className="mt-2 break-all text-sm font-medium text-cyan-200">{email}</p>
            {resent && (
              <p role="status" className="mt-4 text-sm text-emerald-200">
                {t('verificationResent')}
              </p>
            )}
            {error !== null && (
              <div className="mt-4">
                <ErrorState title={t('verificationResendFailed')} error={error} />
              </div>
            )}
            {checkEmailKind === 'verification' && (
              <Button
                className="mt-6 w-full"
                type="button"
                variant="outline"
                disabled={pending || !email.trim()}
                onClick={() => void resend()}
              >
                {pending ? t('sendingEmail') : t('resendVerification')}
              </Button>
            )}
            <BackToSignIn onClick={() => switchMode('login')} />
          </section>
        )}
      </Card>
    </main>
  )
}

type AuthenticationFormProps = {
  mode: 'login' | 'register'
  email: string
  password: string
  organizationName: string
  organizationSlug: string
  expired: boolean
  pending: boolean
  error: unknown
  onMode: (mode: AuthenticationMode) => void
  onEmail: (value: string) => void
  onPassword: (value: string) => void
  onOrganizationName: (value: string) => void
  onOrganizationSlug: (value: string) => void
  onForgot: () => void
  onSubmit: (event: FormEvent) => void
}

function AuthenticationForm(props: AuthenticationFormProps) {
  const t = useLocalization().t
  const registerMode = props.mode === 'register'
  return (
    <>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('authenticationMode')}>
        <Button
          type="button"
          variant={!registerMode ? 'default' : 'outline'}
          onClick={() => props.onMode('login')}
        >
          {t('signIn')}
        </Button>
        <Button
          type="button"
          variant={registerMode ? 'default' : 'outline'}
          onClick={() => props.onMode('register')}
        >
          {t('registerOrganization')}
        </Button>
      </div>
      <h2 className="mt-6 text-2xl font-semibold">
        {registerMode ? t('registerTitle') : t('signInTitle')}
      </h2>
      {props.expired && !registerMode && (
        <p role="status" className="mt-3 text-amber-200">
          {t('sessionExpired')}
        </p>
      )}
      <form className="mt-5 space-y-4" onSubmit={props.onSubmit}>
        <Field label={t('email')} id="auth-email">
          <input
            id="auth-email"
            className="input"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={props.email}
            onChange={(event) => props.onEmail(event.target.value)}
          />
        </Field>
        <Field
          label={t('password')}
          id="auth-password"
          {...(registerMode ? { help: t('passwordHelp') } : {})}
        >
          <input
            id="auth-password"
            className="input"
            type="password"
            autoComplete={registerMode ? 'new-password' : 'current-password'}
            required
            minLength={registerMode ? 12 : 1}
            maxLength={256}
            value={props.password}
            onChange={(event) => props.onPassword(event.target.value)}
          />
        </Field>
        {registerMode && (
          <>
            <Field label={t('organizationName')} id="organization-name">
              <input
                id="organization-name"
                className="input"
                required
                maxLength={120}
                value={props.organizationName}
                onChange={(event) => props.onOrganizationName(event.target.value)}
              />
            </Field>
            <Field label={t('organizationSlug')} id="organization-slug" help={t('slugInvalid')}>
              <input
                id="organization-slug"
                className="input"
                required
                maxLength={63}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={props.organizationSlug}
                onChange={(event) => props.onOrganizationSlug(event.target.value)}
              />
            </Field>
          </>
        )}
        {props.error !== null && (
          <ErrorState
            title={registerMode ? t('registrationFailed') : t('signInFailed')}
            error={props.error}
          />
        )}
        <Button className="w-full" type="submit" disabled={props.pending}>
          {props.pending ? t('authenticating') : registerMode ? t('createAccount') : t('signIn')}
        </Button>
        {!registerMode && (
          <button
            type="button"
            className="w-full text-sm text-cyan-300 underline"
            onClick={props.onForgot}
          >
            {t('forgotPassword')}
          </button>
        )}
      </form>
    </>
  )
}

export function Field({
  label,
  id,
  help,
  children,
}: {
  label: string
  id: string
  help?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
    </div>
  )
}

function BackToSignIn({ onClick }: { onClick: () => void }) {
  const t = useLocalization().t
  return (
    <button type="button" className="mt-4 w-full text-sm text-cyan-300 underline" onClick={onClick}>
      {t('returnToSignIn')}
    </button>
  )
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

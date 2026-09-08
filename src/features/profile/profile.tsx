import { RuntimeRetention } from '../runtime-retention/settings'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { NotificationRetention } from '../notifications/retention'
import {
  changePassword,
  logout,
  requestEmailVerification,
  updateUserPreferences,
} from '../../shared/api/auth'
import { useApi } from '../../shared/api/context'
import { authenticationSession, useAuthentication } from '../../shared/auth/session'
import { supportedLocales, useLocalization, useT, type Locale } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'

export function Profile() {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const auth = useAuthentication()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    document.title = `${t('profileTitle')} · Okoscope`
  }, [t])
  if (auth.status !== 'authenticated') return null
  const { user, organization, role } = auth.context

  const signOut = async () => {
    setPending(true)
    setError(null)
    try {
      await logout(api)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'build-info' })
      authenticationSession.anonymous()
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="w-full" aria-labelledby="profile-heading">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Okoscope</p>
          <h1 id="profile-heading" className="mt-2 text-4xl font-semibold sm:text-5xl">
            {t('profileTitle')}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">{t('profileHelp')}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
          {t('profileSessionActive')}
        </div>
      </header>

      <Card className="mt-8 overflow-hidden p-0">
        <div className="border-b border-sky-400/10 bg-gradient-to-r from-cyan-400/10 via-blue-500/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-slate-950/45 text-cyan-200 shadow-[0_12px_35px_rgba(8,145,178,0.18)]">
              <UserRound aria-hidden="true" className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-cyan-200">{t('profileAccount')}</p>
              <h2 className="mt-1 truncate text-2xl font-semibold text-white">{user.email}</h2>
              <p className="mt-2 text-sm text-slate-400">{t('profileAccountHelp')}</p>
              <EmailVerificationStatus email={user.email} verified={user.email_verified} />
            </div>
          </div>
        </div>

        <div className="grid items-stretch gap-px bg-sky-300/10 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.65fr)]">
          <div className="grid gap-px bg-sky-300/10 sm:grid-cols-2 lg:grid-cols-1">
            <dl className="bg-[#08182b] p-6 sm:p-8">
              <dt className="flex items-center gap-2 text-sm text-slate-400">
                <Building2 aria-hidden="true" className="h-4 w-4 text-cyan-300" />
                {t('organization')}
              </dt>
              <dd className="mt-3 text-lg font-semibold text-slate-100">{organization.name}</dd>
              <dd className="mt-1 font-mono text-xs text-slate-400">{organization.slug}</dd>
            </dl>
            <dl className="bg-[#08182b] p-6 sm:p-8">
              <dt className="flex items-center gap-2 text-sm text-slate-400">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-cyan-300" />
                {t('membershipRole')}
              </dt>
              <dd className="mt-3 text-lg font-semibold text-slate-100">
                {role === 'owner' ? t('roleOwner') : t('roleMember')}
              </dd>
              <dd className="mt-1 text-sm text-slate-400">{t('profileRoleHelp')}</dd>
            </dl>
          </div>

          <section className="flex min-h-72 flex-col bg-[#08182b] p-6 sm:p-8">
            <div>
              <div>
                <EmailLocalePreference />
              </div>
            </div>
            {error !== null && (
              <div className="mt-6">
                <ErrorState
                  title={t('signOutFailed')}
                  error={error}
                  onRetry={() => void signOut()}
                />
              </div>
            )}
            <div className="mt-auto flex justify-end pt-8">
              <Button variant="outline" disabled={pending} onClick={() => void signOut()}>
                {pending ? t('signingOut') : t('endSession')}
              </Button>
            </div>
          </section>
        </div>
      </Card>
      <PasswordChange />
      <NotificationRetention />
      <RuntimeRetention />
    </section>
  )
}

function EmailVerificationStatus({ email, verified }: { email: string; verified: boolean }) {
  const t = useT()
  const api = useApi()
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const resend = async () => {
    setPending(true)
    setError(null)
    try {
      await requestEmailVerification(api, { email })
      setSent(true)
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="mt-3">
      <p className={`text-sm ${verified ? 'text-emerald-200' : 'text-amber-200'}`}>
        {verified ? t('emailVerified') : t('emailNotVerified')}
      </p>
      {!verified && (
        <Button
          className="mt-3"
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void resend()}
        >
          {pending ? t('sendingEmail') : t('resendVerification')}
        </Button>
      )}
      {sent && (
        <p role="status" className="mt-2 text-sm text-emerald-200">
          {t('verificationResent')}
        </p>
      )}
      {error !== null && (
        <div className="mt-3">
          <ErrorState title={t('verificationResendFailed')} error={error} />
        </div>
      )}
    </div>
  )
}

function EmailLocalePreference() {
  const { locale, setLocale, t } = useLocalization()
  const api = useApi()
  const auth = useAuthentication()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  if (auth.status !== 'authenticated') return null

  const updateLocale = async (next: Locale) => {
    if (pending || next === auth.context.user.preferred_locale) return
    setPending(true)
    setSaved(false)
    setError(null)
    try {
      const context = await updateUserPreferences(api, { locale: next })
      authenticationSession.authenticate(context)
      setLocale(context.user.preferred_locale)
      setSaved(true)
    } catch (failure) {
      setLocale(auth.context.user.preferred_locale)
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <span>{t('emailLanguage')}</span>
        <select
          aria-label={t('emailLanguage')}
          value={locale}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value
            if (supportedLocales.includes(next as Locale)) {
              setLocale(next as Locale)
              void updateLocale(next as Locale)
            }
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
        >
          <option value="en">{t('english')}</option>
          <option value="ru">{t('russian')}</option>
        </select>
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-400">{t('profileLanguageHelp')}</p>
      {saved && (
        <p role="status" className="mt-2 text-sm text-emerald-200">
          {t('emailLanguageSaved')}
        </p>
      )}
      {error !== null && (
        <div className="mt-3">
          <ErrorState title={t('emailLanguageFailed')} error={error} />
        </div>
      )}
    </div>
  )
}

function PasswordChange() {
  const t = useT()
  const api = useApi()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const mismatch = confirmation.length > 0 && newPassword !== confirmation

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || mismatch) return
    setPending(true)
    setSuccess(false)
    setError(null)
    try {
      const context = await changePassword(api, {
        current_password: currentPassword,
        new_password: newPassword,
      })
      authenticationSession.authenticate(context)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess(true)
      headingRef.current?.focus()
    } catch (failure) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setError(failure)
      headingRef.current?.focus()
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="mt-8">
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
        {t('changePasswordTitle')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t('changePasswordHelp')}</p>
      <form className="mt-6 max-w-xl space-y-4" onSubmit={(event) => void submit(event)}>
        <PasswordField
          id="current-password"
          label={t('currentPassword')}
          value={currentPassword}
          autoComplete="current-password"
          minLength={1}
          onChange={setCurrentPassword}
        />
        <PasswordField
          id="profile-new-password"
          label={t('newPassword')}
          value={newPassword}
          autoComplete="new-password"
          minLength={12}
          help={t('passwordHelp')}
          onChange={setNewPassword}
        />
        <PasswordField
          id="profile-confirm-password"
          label={t('confirmNewPassword')}
          value={confirmation}
          autoComplete="new-password"
          minLength={12}
          invalid={mismatch}
          {...(mismatch ? { help: t('passwordsDoNotMatch') } : {})}
          onChange={setConfirmation}
        />
        {success && (
          <p role="status" className="text-sm text-emerald-200">
            {t('passwordChanged')}
          </p>
        )}
        {error !== null && <ErrorState title={t('passwordChangeFailed')} error={error} />}
        <Button type="submit" disabled={pending || mismatch}>
          {pending ? t('saving') : t('changePassword')}
        </Button>
      </form>
    </Card>
  )
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  minLength,
  help,
  invalid = false,
  onChange,
}: {
  id: string
  label: string
  value: string
  autoComplete: string
  minLength: number
  help?: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input mt-2"
        type="password"
        required
        minLength={minLength}
        maxLength={256}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && (
        <p className={`mt-1 text-xs ${invalid ? 'text-rose-300' : 'text-slate-400'}`}>{help}</p>
      )}
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { confirmEmailVerification, completePasswordReset } from '../../shared/api/auth'
import { useApi } from '../../shared/api/context'
import { useLocalization } from '../../shared/i18n'
import { LanguageSelector } from '../../shared/i18n/language-selector'
import { Brand } from '../../shared/ui/brand'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Field } from './authentication-screen'

type ActionKind = 'verify' | 'reset'

export function SecurityActionPage({ kind }: { kind: ActionKind }) {
  const { t } = useLocalization()
  const api = useApi()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [token] = useState(captureFragmentToken)
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const passwordMismatch =
    kind === 'reset' && passwordConfirmation.length > 0 && newPassword !== passwordConfirmation

  useEffect(() => {
    headingRef.current?.focus()
  }, [complete, error])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || pending || passwordMismatch) return
    setPending(true)
    setError(null)
    try {
      if (kind === 'verify') await confirmEmailVerification(api, { token })
      else await completePasswordReset(api, { token, new_password: newPassword })
      setNewPassword('')
      setPasswordConfirmation('')
      setComplete(true)
    } catch (failure) {
      setNewPassword('')
      setPasswordConfirmation('')
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  const title = complete
    ? kind === 'verify'
      ? t('verificationCompleteTitle')
      : t('passwordResetCompleteTitle')
    : kind === 'verify'
      ? t('verifyEmailTitle')
      : t('resetPasswordTitle')

  return (
    <main id="main-content" className="page flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <header className="flex items-start justify-between gap-4">
          <Brand />
          <LanguageSelector showLabel={false} />
        </header>
        <h1 ref={headingRef} tabIndex={-1} className="mt-8 text-3xl font-semibold">
          {title}
        </h1>
        {complete ? (
          <>
            <p role="status" className="mt-4 leading-7 text-slate-300">
              {kind === 'verify' ? t('verificationCompleteHelp') : t('passwordResetCompleteHelp')}
            </p>
            <Link to="/" className="mt-6 inline-flex text-cyan-300 underline">
              {t('returnToSignIn')}
            </Link>
          </>
        ) : !token ? (
          <>
            <p role="alert" className="mt-4 leading-7 text-amber-200">
              {t('actionLinkMissing')}
            </p>
            <Link to="/" className="mt-6 inline-flex text-cyan-300 underline">
              {t('requestNewLink')}
            </Link>
          </>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
            <p className="leading-7 text-slate-300">
              {kind === 'verify' ? t('verifyEmailHelp') : t('resetPasswordHelp')}
            </p>
            {kind === 'reset' && (
              <>
                <Field label={t('newPassword')} id="new-password" help={t('passwordHelp')}>
                  <input
                    id="new-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={256}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </Field>
                <Field
                  label={t('confirmNewPassword')}
                  id="confirm-new-password"
                  {...(passwordMismatch ? { help: t('passwordsDoNotMatch') } : {})}
                >
                  <input
                    id="confirm-new-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={256}
                    aria-invalid={passwordMismatch}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                  />
                </Field>
              </>
            )}
            {error !== null && (
              <ErrorState
                title={kind === 'verify' ? t('verificationFailed') : t('passwordResetFailed')}
                error={error}
              />
            )}
            <Button className="w-full" type="submit" disabled={pending || passwordMismatch}>
              {pending
                ? t('confirming')
                : kind === 'verify'
                  ? t('confirmEmail')
                  : t('setNewPassword')}
            </Button>
            <p className="text-xs leading-5 text-slate-400">{t('actionLinkExpiryHelp')}</p>
          </form>
        )}
      </Card>
    </main>
  )
}

export function captureFragmentToken(): string | null {
  const fragment = window.location.hash.slice(1)
  const parameters = new URLSearchParams(fragment)
  const token = parameters.get('token') ?? (fragment && !fragment.includes('=') ? fragment : null)
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  return token && token.length >= 40 && token.length <= 128 ? token : null
}

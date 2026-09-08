import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { getCurrentUser } from '../../shared/api/auth'
import { useApi } from '../../shared/api/context'
import { completeSetup, onboardingKeys } from '../../shared/api/onboarding'
import { authenticationSession } from '../../shared/auth/session'
import { useT } from '../../shared/i18n'
import { LanguageSelector } from '../../shared/i18n/language-selector'
import { Button } from '../../shared/ui/button'
import { Brand } from '../../shared/ui/brand'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { clearSetupTokenFragment, peekSetupTokenFragment } from './setup-token-memory'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)

export function FirstRunSetup() {
  const api = useApi()
  const t = useT()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [setupToken, setSetupToken] = useState(peekSetupTokenFragment)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationSlug, setOrganizationSlug] = useState('')
  const [projectName, setProjectName] = useState('Default')
  const [projectSlug, setProjectSlug] = useState('default')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    clearSetupTokenFragment()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await completeSetup(api, {
        setup_token: setupToken,
        email: email.trim(),
        password,
        organization_name: organizationName.trim(),
        organization_slug: organizationSlug,
        project_name: projectName.trim(),
        project_slug: projectSlug,
      })
      setSetupToken('')
      setPassword('')
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.setup })
      authenticationSession.authenticate(await getCurrentUser(api))
      await navigate({ to: '/onboarding' })
    } catch (failure) {
      setPassword('')
      setError(failure)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-layout min-h-screen p-6">
      <section className="max-w-xl self-center">
        <Brand />
        <h1 className="mt-6 text-4xl font-semibold">{t('setupWelcome')}</h1>
        <p className="mt-4 text-slate-300">{t('setupWelcomeHelp')}</p>
      </section>
      <Card className="w-full max-w-lg self-center">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
          <SetupField
            label={t('setupToken')}
            type="password"
            value={setupToken}
            onChange={setSetupToken}
            autoComplete="off"
          />
          <SetupField
            label={t('email')}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <SetupField
            label={t('password')}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <SetupField
            label={t('organizationName')}
            value={organizationName}
            onChange={(value) => {
              setOrganizationName(value)
              setOrganizationSlug(slugify(value))
            }}
          />
          <SetupField
            label={t('organizationSlug')}
            value={organizationSlug}
            onChange={setOrganizationSlug}
          />
          <SetupField
            label={t('projectName')}
            value={projectName}
            onChange={(value) => {
              setProjectName(value)
              setProjectSlug(slugify(value))
            }}
          />
          <SetupField label={t('projectSlug')} value={projectSlug} onChange={setProjectSlug} />
          {Boolean(error) && <ErrorState title={t('setupFailed')} error={error} />}
          <Button
            className="w-full"
            type="submit"
            disabled={pending || setupToken.length < 32 || password.length < 12}
          >
            {pending ? t('creating') : t('completeSetup')}
          </Button>
        </form>
      </Card>
    </main>
  )
}

function SetupField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
  const id = `setup-${label.toLowerCase().replaceAll(' ', '-')}`
  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { IssuedApplicationCredential, ProvisionedApplication } from '../../shared/api/types'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'

async function copy(
  value: string,
  setAnnouncement: (value: string) => void,
  success: string,
  failure: string,
) {
  try {
    if (!navigator.clipboard) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(value)
    setAnnouncement(success)
  } catch {
    setAnnouncement(failure)
  }
}

export function ConnectAgent({
  application,
  credential,
  onClose,
}: {
  application: ProvisionedApplication
  credential: IssuedApplicationCredential
  onClose: () => void
}) {
  const t = useT()
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => () => setAnnouncement(''), [])
  return (
    <Card className="border-amber-700/70">
      <p className="eyebrow">{t('connectAgent')}</p>
      <h2 className="mt-2 text-2xl font-semibold">{application.name}</h2>
      <p role="alert" className="mt-3 font-semibold text-amber-200">
        {t('tokenShownOnce')}
      </p>
      <SecretBlock
        label={t('applicationToken')}
        value={credential.token}
        onCopy={() =>
          void copy(credential.token, setAnnouncement, t('tokenCopied'), t('copyFailed'))
        }
        button={t('copyToken')}
      />
      <p className="mt-5 text-sm text-slate-300">{t('connectInOnboardingHelp')}</p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/onboarding">{t('continueInOnboarding')}</Link>
        </Button>
        <Button variant="outline" onClick={onClose}>
          {t('done')}
        </Button>
      </div>
    </Card>
  )
}

function SecretBlock({
  label,
  value,
  onCopy,
  button,
}: {
  label: string
  value: string
  onCopy: () => void
  button: string
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">{label}</h3>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-cyan-200">
        {value}
      </pre>
      <Button className="mt-2" onClick={onCopy}>
        {button}
      </Button>
    </div>
  )
}

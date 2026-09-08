import { useState } from 'react'
import { Button } from '../../shared/ui/button'
import { Modal } from '../../shared/ui/modal'

export function SecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [announcement, setAnnouncement] = useState('')
  const copy = async () => {
    await navigator.clipboard?.writeText(secret)
    setAnnouncement('Secret copied to clipboard.')
  }
  return (
    <Modal
      title="Save the signing secret now"
      description="This secret is shown once and cannot be retrieved again after this dialog closes. Store it in your receiver's secret manager."
      onClose={onClose}
    >
      <code className="block overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-cyan-200">
        {secret}
      </code>
      <Button className="mt-4" onClick={() => void copy()}>
        Copy secret
      </Button>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </Modal>
  )
}

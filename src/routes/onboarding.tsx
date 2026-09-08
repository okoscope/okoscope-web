import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { OnboardingWizard } from '../features/provisioning/onboarding'

export const Route = createFileRoute('/onboarding')({ component: OnboardingPage })

function OnboardingPage() {
  useEffect(() => {
    document.title = 'Onboarding · Okoscope'
  }, [])
  return <OnboardingWizard />
}

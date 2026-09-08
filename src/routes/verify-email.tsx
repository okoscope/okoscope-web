import { createFileRoute } from '@tanstack/react-router'
import { SecurityActionPage } from '../features/auth/security-action'

export const Route = createFileRoute('/verify-email')({
  component: () => <SecurityActionPage kind="verify" />,
})

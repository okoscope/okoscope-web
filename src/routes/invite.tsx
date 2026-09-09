import { createFileRoute } from '@tanstack/react-router'
import { InvitationScreen } from '../features/access/invitation-screen'
import { captureInvitationTokenFragment } from '../features/access/invitation-token'

export const Route = createFileRoute('/invite')({
  component: InviteRoute,
})

function InviteRoute() {
  captureInvitationTokenFragment()
  return <InvitationScreen />
}

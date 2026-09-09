let invitationToken = ''

export function captureInvitationTokenFragment() {
  if (window.location.pathname !== '/invite' || !window.location.hash) return
  const fragment = window.location.hash.slice(1)
  const parameters = new URLSearchParams(fragment)
  const candidate = parameters.get('token') ?? (fragment.includes('=') ? '' : fragment)
  invitationToken = candidate.trim()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
}

export const peekInvitationToken = () => invitationToken
export const clearInvitationToken = () => {
  invitationToken = ''
}

let pendingSetupToken = ''

export function captureSetupTokenFragment() {
  if (!window.location.hash) return
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  if (!token) return
  pendingSetupToken = token
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

export function peekSetupTokenFragment() {
  return pendingSetupToken
}

export function clearSetupTokenFragment() {
  pendingSetupToken = ''
}

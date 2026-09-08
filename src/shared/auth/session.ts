import { useSyncExternalStore } from 'react'
import type { AuthContext } from '../api/types'

export type AuthenticationState =
  | { status: 'checking' }
  | { status: 'anonymous'; reason?: 'expired' }
  | { status: 'authenticated'; context: AuthContext }
  | { status: 'error'; error: unknown }

let state: AuthenticationState = { status: 'checking' }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

const setState = (next: AuthenticationState) => {
  state = next
  emit()
}

export const authenticationSession = {
  get: () => state,
  checking: () => setState({ status: 'checking' }),
  authenticate: (context: AuthContext) => setState({ status: 'authenticated', context }),
  anonymous: (reason?: 'expired') => {
    state = reason ? { status: 'anonymous', reason } : { status: 'anonymous' }
    emit()
  },
  fail: (error: unknown) => setState({ status: 'error', error }),
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  reset: () => setState({ status: 'checking' }),
}

export function useAuthentication() {
  return useSyncExternalStore(
    authenticationSession.subscribe,
    authenticationSession.get,
    authenticationSession.get,
  )
}

export function useIsOwner() {
  const authentication = useAuthentication()
  return authentication.status === 'authenticated' && authentication.context.role === 'owner'
}

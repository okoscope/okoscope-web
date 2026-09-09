import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticationSession } from './session'
import { createAuthContext } from '../../test/auth-context'

describe('authentication session', () => {
  afterEach(() => authenticationSession.reset())
  it('publishes safe server context without browser persistence', () => {
    const persist = vi.spyOn(Storage.prototype, 'setItem')
    const listener = vi.fn()
    const unsubscribe = authenticationSession.subscribe(listener)
    authenticationSession.authenticate(
      createAuthContext({
        user: { id: 'u' },
        organizations: [{ id: 'o', name: 'Acme', slug: 'acme', role: 'owner' }],
      }),
    )
    expect(authenticationSession.get()).toMatchObject({
      status: 'authenticated',
      context: { active_role: 'owner' },
    })
    expect(persist).not.toHaveBeenCalled()
    authenticationSession.anonymous('expired')
    expect(authenticationSession.get()).toEqual({ status: 'anonymous', reason: 'expired' })
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })
})

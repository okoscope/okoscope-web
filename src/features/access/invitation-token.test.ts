import { afterEach, describe, expect, it } from 'vitest'
import {
  captureInvitationTokenFragment,
  clearInvitationToken,
  peekInvitationToken,
} from './invitation-token'

afterEach(() => {
  clearInvitationToken()
  window.history.replaceState(null, '', '/')
})

describe('invitation token fragment handling', () => {
  it('captures a named token and removes it from browser history before use', () => {
    window.history.replaceState({ preserved: true }, '', '/invite?locale=ru#token=invite_secret')

    captureInvitationTokenFragment()

    expect(peekInvitationToken()).toBe('invite_secret')
    expect(window.location.href).toBe('http://localhost:3000/invite?locale=ru')
    expect(window.history.state).toEqual({ preserved: true })
  })

  it('accepts a bare fragment but ignores fragments on every other route', () => {
    window.history.replaceState(null, '', '/invite#bare_invitation')
    captureInvitationTokenFragment()
    expect(peekInvitationToken()).toBe('bare_invitation')

    clearInvitationToken()
    window.history.replaceState(null, '', '/docs#token=not_an_invitation')
    captureInvitationTokenFragment()
    expect(peekInvitationToken()).toBe('')
    expect(window.location.hash).toBe('#token=not_an_invitation')
  })

  it('does not capture unrelated or empty invitation fragment parameters', () => {
    window.history.replaceState(null, '', '/invite#locale=ru')
    captureInvitationTokenFragment()
    expect(peekInvitationToken()).toBe('')
    expect(window.location.hash).toBe('')
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  changePassword,
  completePasswordReset,
  confirmEmailVerification,
  getCurrentUser,
  login,
  logout,
  register,
  requestEmailVerification,
  requestPasswordReset,
  updateUserPreferences,
} from './auth'
import type { ApiClient } from './client'

describe('generated authentication operations', () => {
  it('uses the published paths and endpoint-specific unauthorized behavior', async () => {
    const context = {
      user: {
        id: 'user',
        email: 'owner@example.com',
        email_verified: true,
        preferred_locale: 'en',
      },
      organization: { id: 'organization', name: 'Acme', slug: 'acme' },
      role: 'owner' as const,
    }
    const get = vi.fn().mockResolvedValue(context)
    const post = vi
      .fn()
      .mockResolvedValueOnce(context)
      .mockResolvedValueOnce(context)
      .mockResolvedValueOnce(undefined)
    const api = {
      get,
      post,
    } as unknown as ApiClient
    await getCurrentUser(api)
    await login(api, { email: 'owner@example.com', password: 'password' })
    await register(api, {
      email: 'owner@example.com',
      password: 'long password',
      organization_name: 'Acme',
      organization_slug: 'acme',
      locale: 'en',
    })
    await logout(api)
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me', { protected: true, unauthorized: 'ignore' })
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/login',
      expect.objectContaining({ unauthorized: 'ignore' }),
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/register',
      expect.objectContaining({ unauthorized: 'ignore' }),
    )
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/auth/logout', {
      protected: true,
      unauthorized: 'ignore',
    })
  })

  it('calls every security and preference endpoint with the published protection', async () => {
    const post = vi.fn().mockResolvedValue({ status: 'accepted' })
    const put = vi.fn().mockResolvedValue({
      user: {
        id: 'user',
        email: 'owner@example.com',
        email_verified: true,
        preferred_locale: 'en',
      },
      organization: { id: 'organization', name: 'Acme', slug: 'acme' },
      role: 'owner',
    })
    const api = { post, put } as unknown as ApiClient

    await requestEmailVerification(api, { email: 'owner@example.com' })
    await confirmEmailVerification(api, { token: 'v'.repeat(40) })
    await requestPasswordReset(api, { email: 'owner@example.com' })
    await completePasswordReset(api, { token: 'r'.repeat(40), new_password: 'long new password' })
    await changePassword(api, { current_password: 'old', new_password: 'long new password' })
    await updateUserPreferences(api, { locale: 'ru' })

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/email-verification-requests',
      expect.anything(),
    )
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/auth/email-verifications', expect.anything())
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/api/v1/auth/password-reset-requests',
      expect.anything(),
    )
    expect(post).toHaveBeenNthCalledWith(4, '/api/v1/auth/password-resets', expect.anything())
    expect(put).toHaveBeenNthCalledWith(
      1,
      '/api/v1/auth/password',
      expect.objectContaining({ protected: true }),
    )
    expect(put).toHaveBeenNthCalledWith(
      2,
      '/api/v1/auth/preferences',
      expect.objectContaining({ protected: true }),
    )
  })
})

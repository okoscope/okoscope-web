import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import type { AuthContext } from '../../shared/api/types'
import { authenticationSession } from '../../shared/auth/session'
import { LocalizationProvider } from '../../shared/i18n'
import { Profile } from './profile'

vi.mock('../notifications/retention', () => ({ NotificationRetention: () => null }))
vi.mock('../runtime-retention/settings', () => ({ RuntimeRetention: () => null }))

const context: AuthContext = {
  user: {
    id: 'user-1',
    email: 'owner@example.com',
    email_verified: true,
    preferred_locale: 'en',
  },
  organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
  role: 'owner',
}

afterEach(() => authenticationSession.reset())

function setup() {
  authenticationSession.authenticate(context)
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const put = vi.spyOn(api, 'put').mockResolvedValue(context)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale="en">
          <Profile />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return put
}

describe('Profile email security settings', () => {
  it('changes the password and explains session rotation', async () => {
    const user = userEvent.setup()
    const put = setup()

    expect(screen.getByText(/rotates this session and signs out every other device/)).toBeVisible()
    expect(screen.getByText('Email verified')).toBeVisible()
    await user.type(screen.getByLabelText('Current password'), 'old password')
    await user.type(screen.getByLabelText('New password'), 'correct horse battery')
    await user.type(screen.getByLabelText('Confirm new password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText(/This session was rotated/)).toBeVisible()
    expect(put).toHaveBeenCalledWith('/api/v1/auth/password', {
      body: { current_password: 'old password', new_password: 'correct horse battery' },
      protected: true,
    })
  })

  it('persists the selected email locale through the authenticated API', async () => {
    const user = userEvent.setup()
    const put = setup()
    const russianContext: AuthContext = {
      ...context,
      user: { ...context.user, preferred_locale: 'ru' },
    }
    put.mockResolvedValueOnce(russianContext)

    await user.selectOptions(screen.getByLabelText('Email language'), 'ru')

    expect(put).toHaveBeenCalledWith('/api/v1/auth/preferences', {
      body: { locale: 'ru' },
      protected: true,
    })
    expect(await screen.findByText('Язык писем сохранён.')).toBeVisible()
  })
})

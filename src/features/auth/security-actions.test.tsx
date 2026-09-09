import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { LocalizationProvider } from '../../shared/i18n'
import { AuthenticationScreen } from './authentication-screen'
import { SecurityActionPage } from './security-action'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

function renderWithApi(
  node: React.ReactNode,
  policy = {
    public_signup_enabled: false,
    invitation_registration_enabled: true,
    organization_mode: 'single',
  },
) {
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const post = vi.spyOn(api, 'post')
  const get = vi.spyOn(api, 'get')
  get.mockResolvedValue(policy)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale="en">{node}</LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, post }
}

describe('email security flows', () => {
  it('hides uninvited account creation when public signup is disabled', async () => {
    renderWithApi(<AuthenticationScreen expired={false} />)

    expect(await screen.findAllByRole('button', { name: 'Sign in' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Create organization' })).not.toBeInTheDocument()
  })

  it('registers with locale and shows the check-email state without authenticating', async () => {
    const user = userEvent.setup()
    const { post } = renderWithApi(<AuthenticationScreen expired={false} />, {
      public_signup_enabled: true,
      invitation_registration_enabled: true,
      organization_mode: 'multiple',
    })
    post.mockResolvedValue({ status: 'accepted' })

    await user.click(await screen.findByRole('button', { name: 'Create organization' }))
    await user.type(screen.getByLabelText('Email'), 'owner@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.type(screen.getByLabelText('Display name'), 'Owner Example')
    await user.type(screen.getByLabelText('Organization name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await screen.findByRole('heading', { name: 'Check your email' })
    expect(post).toHaveBeenCalledWith('/api/v1/auth/register', {
      body: expect.objectContaining({
        email: 'owner@example.com',
        display_name: 'Owner Example',
        organization_name: 'Acme',
        organization_slug: 'acme',
        locale: 'en',
      }),
      unauthorized: 'ignore',
    })
  })

  it('uses the same accepted forgot-password state for any submitted address', async () => {
    const user = userEvent.setup()
    const { post } = renderWithApi(<AuthenticationScreen expired={false} />)
    post.mockResolvedValue({ status: 'accepted' })

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    await user.type(screen.getByLabelText('Email'), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If this address is eligible/)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/v1/auth/password-reset-requests', {
      body: { email: 'unknown@example.com' },
      unauthorized: 'ignore',
    })
  })

  it('removes a verification token fragment and waits for explicit confirmation', async () => {
    const user = userEvent.setup()
    const token = `verify_${'x'.repeat(40)}`
    window.history.replaceState(null, '', `/verify-email#token=${token}`)
    const { post } = renderWithApi(<SecurityActionPage kind="verify" />)
    post.mockResolvedValue(undefined)

    expect(window.location.hash).toBe('')
    expect(post).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirm email' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/auth/email-verifications', {
        body: { token },
        unauthorized: 'ignore',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toHaveFocus()
  })

  it('blocks mismatched reset passwords and completes with a matching password', async () => {
    const user = userEvent.setup()
    const token = `reset_${'x'.repeat(40)}`
    window.history.replaceState(null, '', `/reset-password#token=${token}`)
    const { post } = renderWithApi(<SecurityActionPage kind="reset" />)
    post.mockResolvedValue(undefined)

    await user.type(screen.getByLabelText('New password'), 'correct horse battery')
    await user.type(screen.getByLabelText('Confirm new password'), 'different password')
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDisabled()
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('heading', { name: 'Password changed' })).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/v1/auth/password-resets', {
      body: { token, new_password: 'correct horse battery' },
      unauthorized: 'ignore',
    })
  })
})

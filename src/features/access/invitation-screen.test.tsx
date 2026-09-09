import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiClientError } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import type { InvitationInspection } from '../../shared/api/types'
import { authenticationSession } from '../../shared/auth/session'
import { LocalizationProvider } from '../../shared/i18n'
import { createAuthContext } from '../../test/auth-context'
import { InvitationScreen } from './invitation-screen'
import {
  captureInvitationTokenFragment,
  clearInvitationToken,
  peekInvitationToken,
} from './invitation-token'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  useNavigate: () => navigate,
}))

const invitation: InvitationInspection = {
  scope: 'project',
  organization_name: 'Acme',
  project_name: 'Payments',
  role: 'member',
  inviter_display_name: 'Ada Admin',
  expires_at: '2026-09-16T12:00:00Z',
  account_state: 'new_user',
}

function renderInvitation(options: {
  locale?: 'en' | 'ru'
  auth?: 'anonymous' | 'authenticated'
  invitation?: InvitationInspection
  inspectFailure?: Error
}) {
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const post = vi.spyOn(api, 'post')
  const get = vi.spyOn(api, 'get')
  const inspected = options.invitation ?? invitation
  post.mockImplementation((path) => {
    if (path === '/api/v1/invitations/inspections') {
      if (options.inspectFailure) return Promise.reject(options.inspectFailure)
      return Promise.resolve(inspected)
    }
    if (path === '/api/v1/auth/login') return Promise.resolve(createAuthContext())
    if (path.includes('/acceptances/'))
      return Promise.resolve({
        status: 'accepted',
        scope: inspected.scope,
        organization_id: 'org-1',
        project_id: inspected.scope === 'project' ? 'project-1' : null,
        role: inspected.role,
        user_id: 'user-1',
      })
    return Promise.resolve(undefined)
  })
  get.mockResolvedValue(createAuthContext())
  if (options.auth === 'authenticated') authenticationSession.authenticate(createAuthContext())
  else authenticationSession.anonymous()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale={options.locale ?? 'en'}>
          <InvitationScreen />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, post }
}

beforeEach(() => {
  navigate.mockReset()
  window.history.replaceState(null, '', '/invite#token=invitation_secret')
  captureInvitationTokenFragment()
})

afterEach(() => {
  authenticationSession.reset()
  clearInvitationToken()
  window.history.replaceState(null, '', '/')
})

describe('invitation acceptance', () => {
  it('inspects fragment data without accepting until the new recipient submits', async () => {
    const user = userEvent.setup()
    const { post } = renderInvitation({ auth: 'anonymous' })

    expect(window.location.hash).toBe('')
    expect(peekInvitationToken()).toBe('invitation_secret')
    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Accept invitation' })).toHaveFocus()
    expect(screen.getByText('Acme')).toBeVisible()
    expect(screen.getByText('Ada Admin')).toBeVisible()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)

    await user.type(screen.getByLabelText('Display name'), 'New Member')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Create account and accept' }))

    await screen.findByRole('heading', { name: 'Invitation accepted' })
    expect(post).toHaveBeenCalledWith('/api/v1/invitations/acceptances/new-user', {
      body: {
        token: 'invitation_secret',
        password: 'correct horse battery',
        display_name: 'New Member',
        locale: 'en',
      },
      unauthorized: 'ignore',
    })
    expect(peekInvitationToken()).toBe('')
  })

  it('requires an existing recipient to sign in and then explicitly accept', async () => {
    const user = userEvent.setup()
    const { post } = renderInvitation({
      auth: 'anonymous',
      invitation: { ...invitation, account_state: 'existing_user' },
    })

    await user.type(await screen.findByLabelText('Email'), 'owner@example.com')
    await user.type(screen.getByLabelText('Password'), 'current password')
    await user.click(screen.getByRole('button', { name: 'Sign in to continue' }))

    expect(await screen.findByText(/Signed in as owner@example\.com\./)).toBeVisible()
    expect(
      post.mock.calls.some(([path]) => path === '/api/v1/invitations/acceptances/existing-user'),
    ).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))
    expect(await screen.findByRole('heading', { name: 'Invitation accepted' })).toBeVisible()
    expect(post).toHaveBeenCalledWith('/api/v1/invitations/acceptances/existing-user', {
      body: { token: 'invitation_secret' },
      protected: true,
    })
  })

  it('shows a safe mismatch and does not refresh or consume the in-memory token', async () => {
    const user = userEvent.setup()
    const mismatch = new ApiClientError({
      kind: 'api',
      status: 409,
      code: 'invitation_account_mismatch',
      message: 'Invitation cannot be used by this account.',
      requestId: 'request-1',
    })
    const { get, post } = renderInvitation({
      auth: 'authenticated',
      invitation: { ...invitation, account_state: 'existing_user' },
    })
    post.mockImplementation((path) => {
      if (path === '/api/v1/invitations/inspections')
        return Promise.resolve({ ...invitation, account_state: 'existing_user' })
      if (path === '/api/v1/invitations/acceptances/existing-user') return Promise.reject(mismatch)
      return Promise.resolve(undefined)
    })

    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation belongs to another account. Sign out and use the email address that received it.',
    )
    expect(get).not.toHaveBeenCalled()
    expect(peekInvitationToken()).toBe('invitation_secret')
  })

  it('shows stable unusable state for expired or revoked links without a retry action', async () => {
    const unusable = new ApiClientError({
      kind: 'api',
      status: 410,
      code: 'invitation_unusable',
      message: 'Invitation is unusable.',
      requestId: 'request-2',
    })
    renderInvitation({ auth: 'anonymous', inspectFailure: unusable })

    expect(await screen.findByRole('heading', { name: 'Invitation unavailable' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Accept invitation' })).toHaveFocus()
    expect(
      screen.getByText(
        'This invitation is invalid, expired, revoked, replaced, or already used. Ask the inviter for a new link.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers retry after a transient inspection failure', async () => {
    const user = userEvent.setup()
    const { post } = renderInvitation({ auth: 'anonymous', inspectFailure: new Error('offline') })
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible()

    post.mockResolvedValue(invitation)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeVisible()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('renders the invite flow in Russian and preserves explicit confirmation', async () => {
    const { post } = renderInvitation({ locale: 'ru', auth: 'anonymous' })

    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Создать аккаунт и принять' })).toBeVisible()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('renders a missing-token state without contacting the invitation API', async () => {
    clearInvitationToken()
    const { post } = renderInvitation({ auth: 'anonymous' })

    expect(await screen.findByRole('heading', { name: 'Invitation unavailable' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Accept invitation' })).toHaveFocus()
    expect(
      screen.getByText('The invitation token is missing. Open the complete link from your email.'),
    ).toBeVisible()
    await waitFor(() => expect(post).not.toHaveBeenCalled())
  })
})

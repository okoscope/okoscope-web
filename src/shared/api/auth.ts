import { ApiClientError, type ApiClient } from './client'
import type {
  AcceptedSecurityAction,
  AuthContext,
  EmailActionRequest,
  EmailSecurityRequest,
  LoginRequest,
  PasswordChangeRequest,
  PasswordResetRequest,
  RegisterRequest,
  UserPreferencesRequest,
} from './types'

export const getCurrentUser = (api: ApiClient) =>
  api.get<AuthContext>('/api/v1/auth/me', { protected: true, unauthorized: 'ignore' })

export const login = (api: ApiClient, body: LoginRequest) =>
  api.post<AuthContext>('/api/v1/auth/login', { body, unauthorized: 'ignore' })

export const register = (api: ApiClient, body: RegisterRequest) =>
  api.post<AcceptedSecurityAction>('/api/v1/auth/register', { body, unauthorized: 'ignore' })

export const requestEmailVerification = (api: ApiClient, body: EmailSecurityRequest) =>
  api.post<AcceptedSecurityAction>('/api/v1/auth/email-verification-requests', {
    body,
    unauthorized: 'ignore',
  })

export const confirmEmailVerification = (api: ApiClient, body: EmailActionRequest) =>
  api.post<void>('/api/v1/auth/email-verifications', { body, unauthorized: 'ignore' })

export const requestPasswordReset = (api: ApiClient, body: EmailSecurityRequest) =>
  api.post<AcceptedSecurityAction>('/api/v1/auth/password-reset-requests', {
    body,
    unauthorized: 'ignore',
  })

export const completePasswordReset = (api: ApiClient, body: PasswordResetRequest) =>
  api.post<void>('/api/v1/auth/password-resets', { body, unauthorized: 'ignore' })

export const changePassword = (api: ApiClient, body: PasswordChangeRequest) =>
  api.put<AuthContext>('/api/v1/auth/password', { body, protected: true })

export const updateUserPreferences = (api: ApiClient, body: UserPreferencesRequest) =>
  api.put<AuthContext>('/api/v1/auth/preferences', { body, protected: true })

export const logout = (api: ApiClient) =>
  api.post<void>('/api/v1/auth/logout', { protected: true, unauthorized: 'ignore' })

export const isAnonymousResponse = (error: unknown) =>
  error instanceof ApiClientError && error.detail.kind === 'api' && error.detail.status === 401

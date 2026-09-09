import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Route } from '@playwright/test'

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const capabilities = {
  manage_platform: false,
  manage_organization: false,
  create_project: false,
  manage_project_members: false,
  create_application: false,
  manage_credentials: false,
  organization_roles_grantable: [],
  project_roles_grantable: [],
}

test('accepts a fragment invitation only after explicit confirmation at a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const token = `invite_${'s'.repeat(40)}`
  const requests: Array<{ path: string; body: unknown }> = []
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    requests.push({ path, body: route.request().postDataJSON() })
    if (path === '/api/v1/invitations/inspections')
      return json(route, {
        scope: 'project',
        organization_name: 'Acme',
        project_name: 'Payments',
        role: 'member',
        inviter_display_name: 'Ada Admin',
        expires_at: '2026-09-16T12:00:00Z',
        account_state: 'new_user',
      })
    if (path === '/api/v1/invitations/acceptances/new-user')
      return json(route, {
        status: 'accepted',
        scope: 'project',
        organization_id: 'org-1',
        project_id: 'project-1',
        role: 'member',
        user_id: 'user-1',
      })
    if (path === '/api/v1/auth/me')
      return json(route, {
        user: {
          id: 'user-1',
          email: 'member@example.com',
          display_name: 'New Member',
          email_verified: true,
          preferred_locale: 'en',
        },
        platform_role: null,
        organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', role: 'member' }],
        active_organization: { id: 'org-1', name: 'Acme', slug: 'acme', role: 'member' },
        active_role: 'member',
        requires_organization_selection: false,
        privileged_until: null,
        capabilities,
      })
    return json(route, {}, 404)
  })

  await page.goto(`/invite#token=${token}`)

  await expect(page).toHaveURL('/invite')
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible()
  expect(requests.filter(({ path }) => path.includes('/acceptances/'))).toEqual([])
  await expect(page.getByLabel('Email')).toHaveCount(0)
  await page.getByLabel('Display name').fill('New Member')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Create account and accept' })).toBeFocused()
  await page.getByRole('button', { name: 'Create account and accept' }).click()

  await expect(page.getByRole('heading', { name: 'Invitation accepted' })).toBeVisible()
  expect(requests.find(({ path }) => path.endsWith('/acceptances/new-user'))?.body).toEqual({
    token,
    password: 'correct horse battery staple',
    display_name: 'New Member',
    locale: 'en',
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('keeps zero-tenant super-administrator identity explicit in platform navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let authenticated = false
  const context = {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      display_name: 'Platform Admin',
      email_verified: true,
      preferred_locale: 'en',
    },
    platform_role: 'super_admin',
    organizations: [],
    active_organization: null,
    active_role: null,
    requires_organization_selection: false,
    privileged_until: null,
    capabilities: { ...capabilities, manage_platform: true },
  }
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/build-info')
      return json(route, {
        service_version: '1',
        git_commit: 'test',
        api_version: 'v1',
        required_database_migration: 26,
      })
    if (path === '/api/v1/setup/status') return json(route, { state: 'ready' })
    if (path === '/api/v1/auth/policy')
      return json(route, {
        public_signup_enabled: false,
        invitation_registration_enabled: true,
        organization_mode: 'single',
      })
    if (path === '/api/v1/auth/login') {
      authenticated = true
      return json(route, context)
    }
    if (path === '/api/v1/auth/me')
      return authenticated
        ? json(route, context)
        : json(
            route,
            { error: 'unauthorized', message: 'Session required', request_id: 'auth' },
            401,
          )
    if (path === '/api/v1/platform/audit')
      return json(route, {
        items: [
          {
            id: 'audit-1',
            actor_kind: 'user',
            actor_user_id: 'admin-1',
            action: 'organization.created.with_a_deliberately_wide_action_name',
            outcome: 'success',
            created_at: '2026-09-09T12:00:00Z',
          },
        ],
        next_cursor: null,
      })
    if (path.startsWith('/api/v1/platform/')) return json(route, { items: [], next_cursor: null })
    return json(route, {}, 404)
  })

  await page.goto('/')
  await page.getByLabel('Email').fill('admin@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()

  await expect(page.getByRole('heading', { name: 'No Organization access yet' })).toBeVisible()
  await expect(page.getByText(/Platform access as admin@example\.com/)).toBeVisible()
  await page.getByRole('button', { name: 'Open platform console' }).click()
  await expect(page).toHaveURL('/platform')
  await expect(page.getByRole('heading', { name: 'Platform console' })).toBeVisible()
  await expect(page.getByText(/Platform access as admin@example\.com/)).toBeVisible()
  const auditRegion = page.getByRole('region', { name: 'Scrollable platform access audit' })
  await expect(auditRegion).toHaveAttribute('tabindex', '0')
  expect(await auditRegion.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await auditRegion.evaluate((element) => element.clientWidth),
  )
  await auditRegion.focus()
  await expect(auditRegion).toBeFocused()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('adds an eligible Organization member through server-derived Project grants', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const created: unknown[] = []
  const context = {
    user: {
      id: 'owner-1',
      email: 'owner@example.com',
      display_name: 'Owner',
      email_verified: true,
      preferred_locale: 'en',
    },
    platform_role: null,
    organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', role: 'owner' }],
    active_organization: { id: 'org-1', name: 'Acme', slug: 'acme', role: 'owner' },
    active_role: 'owner',
    requires_organization_selection: false,
    privileged_until: null,
    capabilities: {
      ...capabilities,
      manage_organization: true,
      create_project: true,
      manage_project_members: true,
      create_application: true,
      manage_credentials: true,
      organization_roles_grantable: ['owner', 'admin', 'member'],
      project_roles_grantable: ['admin', 'member'],
    },
  }
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/build-info')
      return json(route, {
        service_version: '1',
        git_commit: 'test',
        api_version: 'v1',
        required_database_migration: 26,
      })
    if (path === '/api/v1/setup/status') return json(route, { state: 'ready' })
    if (path === '/api/v1/auth/me') return json(route, context)
    if (path === '/api/v1/projects/project-1')
      return json(route, {
        id: 'project-1',
        slug: 'payments',
        name: 'Payments',
        created_at: '2026-09-01T00:00:00Z',
        archived_at: null,
        application_count: 0,
        runtime_group_count: 0,
        effective_project_role: 'admin',
        effective_access_source: 'organization',
        capabilities: {
          ...capabilities,
          manage_project_members: true,
          create_application: true,
          manage_credentials: true,
          project_roles_grantable: ['admin', 'member'],
        },
      })
    if (path === '/api/v1/projects/project-1/eligible-organization-members')
      return json(route, {
        items: [
          {
            user_id: 'user-2',
            email: 'member@example.com',
            display_name: 'Project Member',
            role: 'member',
            enabled: true,
            email_verified: true,
            created_at: '2026-09-01T00:00:00Z',
            can_change_role: false,
            can_remove: false,
          },
        ],
        next_cursor: null,
      })
    if (path === '/api/v1/projects/project-1/members' && route.request().method() === 'POST') {
      created.push(route.request().postDataJSON())
      return json(route, {
        user_id: 'user-2',
        email: 'member@example.com',
        display_name: 'Project Member',
        role: 'member',
        effective_role: 'member',
        access_source: 'project',
        can_change_role: true,
        can_remove: true,
      })
    }
    if (
      path === '/api/v1/projects/project-1/members' ||
      path === '/api/v1/projects/project-1/invitations'
    )
      return json(route, { items: [], next_cursor: null })
    return json(route, {}, 404)
  })

  await page.goto('/projects/project-1/access')
  await expect(page.getByRole('heading', { name: 'Project access' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Eligible Organization member' }).selectOption('user-2')
  const addForm = page.getByRole('button', { name: 'Add Organization member' }).locator('..')
  await addForm.getByRole('combobox', { name: 'Role' }).selectOption('member')
  await page.getByRole('button', { name: 'Add Organization member' }).click()

  await expect.poll(() => created).toEqual([{ user_id: 'user-2', role: 'member' }])
  await expect(page.getByRole('option', { name: 'Administrator' }).first()).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

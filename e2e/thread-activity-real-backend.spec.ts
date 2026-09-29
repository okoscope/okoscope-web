import { execFileSync } from 'node:child_process'
import { expect, request, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const origin = { Origin: 'http://127.0.0.1:4180' }
const password = 'browser test password 123456789'
test('persists ingested threads through the real API, isolates tenants and localizes unavailable counts', async ({
  page,
}) => {
  const setup = await page.request.post('/api/v1/setup/complete', {
    data: {
      setup_token: 'thread-browser-setup-token-12345678901234567890',
      email: 'thread-owner@example.com',
      password,
      display_name: 'Owner',
      locale: 'en',
    },
  })
  expect(setup.ok(), await setup.text()).toBe(true)
  const organizationResponse = await page.request.post('/api/v1/platform/organizations', {
    headers: origin,
    data: { name: 'Thread E2E', slug: 'thread-e2e', ownership: { kind: 'self_owner' } },
  })
  expect(organizationResponse.ok(), await organizationResponse.text()).toBe(true)
  const { organization } = await organizationResponse.json()
  const projectResponse = await page.request.post(
    `/api/v1/organizations/${organization.id}/projects`,
    { headers: origin, data: { name: 'Platform', slug: 'platform' } },
  )
  expect(projectResponse.ok(), await projectResponse.text()).toBe(true)
  const project = await projectResponse.json()
  const appResponse = await page.request.post(`/api/v1/projects/${project.id}/applications`, {
    headers: origin,
    data: { name: 'Gateway', slug: 'gateway' },
  })
  expect(appResponse.ok(), await appResponse.text()).toBe(true)
  const { application } = await appResponse.json()
  const path = `/api/v1/projects/${project.id}/applications/${application.id}/thread-activity`
  expect((await (await page.request.get(path)).json()).items).toEqual([])
  const seed = (second = false) =>
    execFileSync(
      'cargo',
      ['test', '-p', 'server', '--test', 'browser_thread_fixture', '--', '--ignored'],
      {
        cwd: process.env.OKOSCOPE_BACKEND_CHECKOUT,
        env: {
          ...process.env,
          E2E_ORG: organization.id,
          E2E_PROJECT: project.id,
          E2E_APP: application.id,
          ...(second ? { E2E_SECOND_EPOCH: '1' } : {}),
        },
        stdio: 'inherit',
      },
    )
  seed()
  const summaryResponse = await page.request.get(`${path}/summary`)
  expect(summaryResponse.headers()['cache-control']).toContain('no-store')
  const summary = await summaryResponse.json()
  expect(summary).toMatchObject({ window_count: 55, created: 55, exited: 0, active: 1 })
  expect(summary.names).toEqual([{ name: 'worker', created: 55, exited: 0, active: 1 }])
  const first = await (await page.request.get(`${path}?limit=50`)).json()
  expect(first.items).toHaveLength(50)
  const second = await (
    await page.request.get(`${path}?limit=50&cursor=${encodeURIComponent(first.next_cursor)}`)
  ).json()
  expect(second.items).toHaveLength(5)
  expect(
    new Set([...first.items, ...second.items].map((item: { id: string }) => item.id)).size,
  ).toBe(55)
  for (const query of [
    'limit=0',
    'limit=201',
    'process_generation=1',
    'from=2020-01-01T00:00:00Z&to=2020-03-01T00:00:00Z',
    'cursor=invalid',
  ]) {
    const response = await page.request.get(`${path}?${query}`)
    expect(response.status(), query).toBe(400)
    expect((await response.json()).error).toBeDefined()
  }
  const anonymous = await request.newContext({ baseURL: 'http://127.0.0.1:4180' })
  expect((await anonymous.get(path)).status()).toBe(401)
  await anonymous.dispose()
  execFileSync(process.env.PSQL_BIN ?? 'psql', [
    process.env.DATABASE_URL!,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    "INSERT INTO users(id,email,password_hash,email_verified_at) SELECT gen_random_uuid(),'outsider@example.com',password_hash,now() FROM users WHERE email='thread-owner@example.com'",
  ])
  const outsider = await request.newContext({ baseURL: 'http://127.0.0.1:4180' })
  const login = await outsider.post('/api/v1/auth/login', {
    headers: origin,
    data: { email: 'outsider@example.com', password },
  })
  expect(login.ok(), await login.text()).toBe(true)
  expect((await outsider.get(path)).status()).toBe(404)
  expect((await outsider.get(`${path}/summary`)).status()).toBe(404)
  await outsider.dispose()
  const emptyResponse = await page.request.post(`/api/v1/projects/${project.id}/applications`, {
    headers: origin,
    data: { name: 'Empty', slug: 'empty' },
  })
  expect(emptyResponse.ok(), await emptyResponse.text()).toBe(true)
  const empty = (await emptyResponse.json()).application
  const emptyPath = `/api/v1/projects/${project.id}/applications/${empty.id}/thread-activity`
  expect(
    (
      await page.request.get(`${emptyPath}?cursor=${encodeURIComponent(first.next_cursor)}`)
    ).status(),
  ).toBe(400)

  await page.goto('/')
  await page.getByRole('button', { name: 'Open Organization' }).click()
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?view=threads`,
  )
  await expect(page.getByRole('region', { name: 'Thread activity', exact: true })).toContainText(
    'worker',
  )
  await page.reload()
  await expect(page.getByText('55 observation windows')).toBeVisible()
  await page.getByText('Observation windows', { exact: true }).click()
  await page.getByRole('button', { name: 'Next windows' }).click()
  await expect(page.getByRole('button', { name: 'Next windows' })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous windows' }).click()
  await expect(page.getByRole('button', { name: 'Next windows' })).toBeEnabled()
  seed(true)
  const multiple = await (await page.request.get(`${path}/summary`)).json()
  expect(multiple).toMatchObject({
    window_count: 56,
    created: 56,
    active: null,
    peak_active: null,
  })
  expect(multiple.names[0].active).toBeNull()
  await page.evaluate(() => localStorage.setItem('okoscope.locale', 'ru'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('region', { name: 'Активность потоков', exact: true })).toContainText(
    'Недоступно',
  )
  await expect(page.getByText('56 окон наблюдения')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({
    path: test.info().outputPath('thread-activity-ru-mobile.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: /Потоки/ }).focus()
  await expect(page.getByRole('button', { name: /Потоки/ })).toBeFocused()
})

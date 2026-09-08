import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

test('opens resource history, preserves controls in the URL, and localizes at mobile width', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)

  await page.getByRole('link', { name: 'Application resources' }).click()
  await expect(page.getByRole('heading', { name: 'Application resources' })).toBeVisible()
  await expect(page.getByText('Missing or incomplete interval')).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Resource history chart: Memory current' }),
  ).toBeVisible()

  await page.getByRole('combobox', { name: 'Metric' }).selectOption('cpu_throttled_period_ratio')
  await expect(page).toHaveURL(/metric=cpu_throttled_period_ratio/)
  await expect(page.getByText(/percentage of performance lost/)).toBeVisible()
  await page.getByRole('combobox', { name: 'Range' }).selectOption('30d')
  await expect(page.getByRole('combobox', { name: 'Resolution' })).toHaveValue('hour')
  await expect(page).toHaveURL(/step=hour/)

  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('heading', { name: 'Ресурсы приложения' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeFocused()
  await page
    .getByRole('navigation', { name: 'Навигационная цепочка' })
    .getByRole('link', { name: application.name })
    .focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('combobox', { name: 'Метрика' })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('withholds resource observations when the scoped Application lookup returns 404', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  let resourceRequests = 0
  await page.route(`**/api/v1/projects/${project.id}/applications/${application.id}`, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers: { 'x-request-id': 'application-ownership-mismatch' },
      body: JSON.stringify({
        error: 'not_found',
        message: 'Application does not belong to this Project',
        request_id: 'application-ownership-mismatch',
      }),
    }),
  )
  await page.route(
    `**/api/v1/projects/${project.id}/applications/${application.id}/resources**`,
    (route) => {
      resourceRequests += 1
      return route.continue()
    },
  )
  await page.goto(`/projects/${project.id}/applications/${application.id}/resources`)
  await authenticate(page)

  await expect(page.getByRole('heading', { name: 'Application not found' })).toBeVisible()
  await expect(page.getByText(/application-ownership-mismatch/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Application resources' })).toHaveCount(0)
  expect(resourceRequests).toBe(0)
})

test('blocks the resource route when the backend API contract is incompatible', async ({
  page,
}) => {
  let resourceRequests = 0
  await page.route('**/api/v1/build-info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        service_version: '2.0.0',
        git_commit: 'future-resource-contract',
        api_version: 'v2',
        required_database_migration: 25,
      }),
    }),
  )
  await page.route('**/api/v1/projects/**/resources?**', (route) => {
    resourceRequests += 1
    return route.continue()
  })
  await page.goto(
    '/projects/00000000-0000-4000-8000-000000000002/applications/00000000-0000-4000-8000-000000000003/resources',
  )

  await expect(page.getByRole('heading', { name: 'Incompatible backend' })).toBeVisible()
  await expect(page.getByText('v2')).toBeVisible()
  expect(resourceRequests).toBe(0)
})

test('shows comparable release resource impact and follows Attention recommendation', async ({
  page,
}) => {
  const { project, application, releases } = await mockApi(page)
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/releases/${releases[0]!.id}/runtime-diff`,
  )
  await authenticate(page)

  await expect(page.getByRole('heading', { name: 'Resource impact' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CPU throttled periods' })).toBeVisible()
  await expect(page.getByText(/do not establish that the Release caused/)).toBeVisible()
  await expect(page.getByText(/\+17 percentage points/)).toBeVisible()
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toHaveAttribute(
    'href',
    `/projects/${project.id}/applications/${application.id}/releases/${releases[0]!.id}/runtime-diff#main-content`,
  )

  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: application.name })
    .click()
  await expect(page.getByRole('heading', { name: application.name })).toBeVisible()
  await expect(skipLink).toHaveAttribute(
    'href',
    `/projects/${project.id}/applications/${application.id}#main-content`,
  )
  await page.getByRole('link', { name: 'Requires attention' }).click()
  await expect(skipLink).toHaveAttribute(
    'href',
    `/projects/${project.id}/applications/${application.id}/attention?section=recommendations#main-content`,
  )
  await page.goto(`${page.url()}#stale-section`)
  await expect(skipLink).toHaveAttribute(
    'href',
    `/projects/${project.id}/applications/${application.id}/attention?section=recommendations#main-content`,
  )
  await expect(page.getByText('CPU throttling increased after the Release.')).toBeVisible()
  await expect(page.getByText(/correlation does not establish cause/i)).toBeVisible()
  await page.getByRole('link', { name: 'Review resource regression' }).click()
  await expect(page).toHaveURL(new RegExp(`/releases/${releases[0]!.id}/runtime-diff`))
})

test('renders resource empty and API error states without inventing zero values', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  const resourceUrl = `**/api/v1/projects/${project.id}/applications/${application.id}/resources**`
  await page.route(resourceUrl, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        metric: 'memory_current_bytes',
        unit: 'bytes',
        step: 'minute',
        normalization: 'total',
        from: '2026-09-07T11:00:00Z',
        to: '2026-09-07T12:00:00Z',
        availability: 'unsupported',
        points: [],
        releases: [],
        containers: [],
      }),
    }),
  )
  await page.goto(`/projects/${project.id}/applications/${application.id}/resources`)
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'No resource measurements' })).toBeVisible()
  await expect(page.getByText(/disabled, unsupported, outside retention/)).toBeVisible()
  await expect(page.getByText('0 B')).toHaveCount(0)

  await page.unroute(resourceUrl)
  await page.route(resourceUrl, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'unavailable', message: 'temporarily unavailable' }),
    }),
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Resource history unavailable' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

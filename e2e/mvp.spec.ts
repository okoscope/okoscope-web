import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

test('switches the interface to Russian and persists the choice', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const languageSelector = page.getByLabel('Language')
  await expect(languageSelector.locator('..').getByText('Language', { exact: true })).toBeVisible()
  await languageSelector.selectOption('ru')
  await expect(
    page.getByRole('heading', {
      name: 'Узнайте, что приложения действительно делают во время работы.',
    }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await page.reload()
  await expect(page.getByLabel('Язык')).toHaveValue('ru')
  await expect(
    page.getByLabel('Язык').locator('..').getByText('Язык', { exact: true }),
  ).toBeVisible()
})

test('keeps the application header language selector compact and accessible', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await authenticate(page)

  const header = page.locator('.app-header')
  const select = header.getByRole('combobox', { name: 'Language' })
  await expect(header.locator('.app-navigation-language > span')).toHaveCount(0)
  await expect(select).toHaveAccessibleName('Language')
  await expect(select).toHaveValue('en')

  await select.selectOption('ru')
  const russianSelect = header.getByRole('combobox', { name: 'Язык' })
  await expect(header.locator('.app-navigation-language > span')).toHaveCount(0)
  await expect(russianSelect).toHaveAccessibleName('Язык')
  await expect(russianSelect).toHaveValue('ru')
})

test('renders tenant, runtime, and notification surfaces fully in Russian', async ({ page }) => {
  test.setTimeout(60_000)
  const expectNoEnglishUi = async () =>
    expect(await page.locator('main').innerText()).not.toMatch(
      /\b(?:Loading|Create|Delivery|Deliveries|Notification|Runtime|Application|Applications|Project|Projects|View|Save|Cancel|Confirm|Could not|Failed|Status|Destination|Observed|Evidence|First|Last|Occurrences|Acknowledge|Resolve|Unavailable|Pending)\b/,
    )
  const { project, application, group, releases, destination, delivery, recoveryOperation } =
    await mockApi(page)
  const openRussian = async (path: string) => {
    await page.goto(path)
  }
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)
  await page.getByLabel('Language').selectOption('ru')

  await expect(page.getByText('Приложение', { exact: true })).toBeVisible()
  await expect(page.getByText('Никогда не наблюдалось')).toBeVisible()
  await expect(page.getByRole('link', { name: /Новые обнаружения/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Релизы и изменения/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Активность приложения/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Требует внимания/ })).toBeVisible()
  await page.getByRole('link', { name: /Требует внимания/ }).click()
  await expect(page.getByRole('heading', { name: 'Требует внимания' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Рекомендации для разбора' })).toBeVisible()
  await expect(
    page
      .getByLabel('Рекомендации для разбора')
      .getByRole('link', { name: 'Разобрать', exact: true }),
  ).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/applications/${application.id}/runtime-groups`)
  await expect(page.getByRole('heading', { name: 'Новые обнаружения' })).toBeVisible()
  await expectNoEnglishUi()
  await openRussian(
    `/projects/${project.id}/applications/${application.id}/runtime-groups/${group.id}`,
  )
  await expect(page.getByRole('heading', { name: 'История наблюдений' })).toBeVisible()
  await page.getByText('Технические данные').nth(1).click()
  await expect(page.getByText('Системный вызов выполнен успешно').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Подтвердить' })).toBeVisible()
  await expect(page.getByText(/Неоднозначно: для этого IP/).first()).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/applications/${application.id}/runtime-inventory`)
  await expect(page.getByRole('heading', { name: 'Активность приложения' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Запуски процессов/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Исходящие соединения/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Входящие соединения/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Домены/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Системные вызовы/ })).toBeVisible()
  await expect(page.getByText('Расширенные фильтры')).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/applications/${application.id}/releases`)
  await expect(page.getByRole('heading', { name: 'Релизы' })).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(
    `/projects/${project.id}/applications/${application.id}/releases/${releases[0]!.id}/runtime-diff`,
  )
  await expect(page.getByRole('heading', { name: 'Изменения после релиза' })).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/notifications`)
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Доставка работает нормально' })).toBeVisible()
  await page.getByRole('button', { name: 'Создать назначение' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'Можно изменять только поля, поддерживаемые опубликованным контрактом OpenAPI.',
  )
  await expect(page.getByLabel('URL назначения')).toBeVisible()
  await expectNoEnglishUi()
  await page.getByRole('button', { name: 'Закрыть' }).click()

  await openRussian(`/projects/${project.id}/notifications/destinations/${destination.id}`)
  await expect(page.getByText('Назначение вебхука', { exact: true })).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/notifications/deliveries/${delivery.id}`)
  await expect(page.getByText('Доставка уведомления', { exact: true })).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/notifications/recovery`)
  await expect(page.getByRole('heading', { name: 'История восстановления' })).toBeVisible()
  await expectNoEnglishUi()

  await openRussian(`/projects/${project.id}/notifications/recovery/${recoveryOperation.id}`)
  await expect(page.getByText('Операция восстановления', { exact: true }).first()).toBeVisible()
  await expectNoEnglishUi()
})

test('navigates Organization → Projects → Applications and supports a deep link', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.goto('/')
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Requires attention' })).toBeVisible()
  await page.getByRole('link', { name: 'Browse Projects' }).first().click()
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: /Platform/ }).click()
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
  await page.getByRole('link', { name: /Gateway/ }).click()
  await expect(page.getByRole('heading', { name: 'Gateway' })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(`/projects/${project.id}/applications/${application.id}`)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Platform')
})

test('shows heterogeneous worker kernels on the Application overview at a narrow viewport', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Worker nodes' })).toBeVisible()
  await page.getByText('Inactive (2)').click()
  await expect(page.getByText('worker-amd64-01')).toBeVisible()
  await expect(page.getByText('6.9.2')).toBeVisible()
  await expect(page.getByText('worker-legacy-02')).toBeVisible()
  await expect(page.getByText('Not reported')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('separates retention guidance from the empty worker state', async ({ page }) => {
  const { project, application } = await mockApi(page)
  await page.route(
    `**/api/v1/projects/${project.id}/applications/${application.id}/workers**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          next_cursor: null,
          coverage: {
            closed_before: null,
            history_expired_before: null,
            detail_scope: 'raw',
          },
        }),
      }),
  )
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)
  await page.evaluate(() => localStorage.setItem('okoscope.locale', 'ru'))
  await page.reload()

  const guidance = page.getByText(
    'Подробная активность учитывает только сохранённые исходные события. Сводки доступны отдельно в истории групп.',
  )
  const emptyState = page.getByText('Наблюдений рабочих узлов пока нет.')
  await expect(guidance).toBeVisible()
  await expect(emptyState).toBeVisible()

  const guidanceBox = await guidance.locator('..').boundingBox()
  const emptyCardBox = await emptyState.locator('..').boundingBox()
  expect(guidanceBox).not.toBeNull()
  expect(emptyCardBox).not.toBeNull()
  expect(emptyCardBox!.y - (guidanceBox!.y + guidanceBox!.height)).toBeGreaterThanOrEqual(12)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  const connectAgent = page.getByRole('link', { name: 'Подключить агента' })
  await expect(connectAgent).toBeVisible()
  await connectAgent.click()
  await expect(page).toHaveURL('/onboarding')
  await expect(page.getByRole('heading', { name: 'Проект', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Приложение', level: 2 })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Platform/ })).toBeVisible()
})

test('authentication flow and primary navigation have no detectable accessibility violations', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create organization' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Requires attention' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('keeps registration visible and shows registration_disabled without a capability probe', async ({
  page,
}) => {
  await mockApi(page)
  let capabilityRequests = 0
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      headers: { 'x-request-id': 'registration-disabled-id' },
      body: JSON.stringify({
        error: 'registration_disabled',
        message: 'registration is disabled',
        request_id: 'registration-disabled-id',
      }),
    }),
  )
  page.on('request', (request) => {
    if (request.url().includes('capabilit')) capabilityRequests += 1
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create organization' }).click()
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByLabel('Organization name').fill('Acme')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('registration is disabled')).toBeVisible()
  await expect(page.getByText('registration-disabled-id')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create organization' })).toBeVisible()
  expect(capabilityRequests).toBe(0)
})

test('registers an Organization and waits for email verification without a session', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Create organization' }).click()
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByLabel('Organization name').fill('Acme')
  await expect(page.getByLabel('Organization slug')).toHaveValue('acme')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/projects')
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toHaveCount(0)
})

test('keeps invalid login local to the form', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_credentials',
        message: 'invalid email or password',
        request_id: 'invalid-login-id',
      }),
    }),
  )
  await page.goto('/')
  await page.getByLabel('Email').fill('unknown@example.com')
  await page.getByLabel('Password').fill('wrong password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByText('invalid email or password')).toBeVisible()
  await expect(page.getByText('invalid-login-id')).toBeVisible()
  await expect(page.getByText(/session ended/i)).toHaveCount(0)
})

test('returns to sign in when a protected request expires the session', async ({ page }) => {
  const { project } = await mockApi(page)
  await page.goto('/')
  await authenticate(page)
  await page.route(`**/api/v1/projects/${project.id}`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'unauthorized',
        message: 'session expired',
        request_id: 'expired-id',
      }),
    }),
  )
  await page.goto(`/projects/${project.id}`)
  await expect(page.getByText('Your session ended. Sign in to continue.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeVisible()
})

test('shows safe profile context and logs out authoritatively', async ({ page }) => {
  await mockApi(page)
  await page.goto('/profile')
  await authenticate(page)
  await expect(page.getByText('owner@example.com')).toBeVisible()
  await expect(page.getByText('Owner', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'End session' }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeVisible()
})

test('hides owner-only creation controls from members', async ({ page }) => {
  const { project } = await mockApi(page, 'member')
  await page.goto('/projects')
  await authenticate(page)
  await expect(page.getByRole('button', { name: 'Create Project' })).toHaveCount(0)
  await page.goto(`/projects/${project.id}`)
  await expect(page.getByRole('button', { name: 'Create Application' })).toHaveCount(0)
})

test('uses a URL-backed attention window and follows typed investigation actions', async ({
  page,
}) => {
  const { group } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/?window=7d')
  await authenticate(page)
  await expect(page.getByLabel('Attention window')).toHaveValue('7d')
  await page.getByLabel('Attention window').selectOption('24h')
  await expect(page).toHaveURL('/?window=24h')
  await page
    .getByLabel('Recommendations to review')
    .getByRole('link', { name: 'Review', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/runtime-groups/${group.id}`))
  await page.goBack()
  await expect(page.getByLabel('Attention window')).toHaveValue('24h')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('blocks an incompatible backend with diagnostics', async ({ page }) => {
  await page.route('**/api/v1/build-info', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        service_version: '2.0.0',
        git_commit: 'future',
        api_version: 'v2',
        required_database_migration: 8,
      }),
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Incompatible backend' })).toBeVisible()
  await expect(page.getByText('v2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0)
})

test('shows invalid runtime configuration without API fallback', async ({ page }) => {
  await page.route('**/config.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'window.__OKOSCOPE_CONFIG__ = { apiBaseUrl: "ftp://invalid" }',
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Okoscope cannot start' })).toBeVisible()
})

test('shows correlated session errors without protected content', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    if (route.request().url().endsWith('/build-info'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          service_version: '0.1.0',
          git_commit: 'abc',
          api_version: 'v1',
          required_database_migration: 26,
        }),
      })
    if (route.request().url().endsWith('/setup/status'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ state: 'ready' }),
      })
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: { 'x-request-id': 'rejected-credential' },
      body: JSON.stringify({
        error: 'unauthorized',
        message: 'Session rejected',
        request_id: 'body-id',
      }),
    })
  })
  await page.goto('/projects')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeVisible()
})

test('reports malformed and server responses safely', async ({ page }) => {
  await page.route('**/api/v1/build-info', (route) =>
    route.fulfill({
      contentType: 'text/plain',
      headers: { 'x-request-id': 'malformed-id' },
      body: 'not-json',
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Backend unavailable' })).toBeVisible()
  await expect(page.getByText(/malformed-id/)).toBeVisible()
})

test('loads another Project page without duplicating existing items', async ({ page }) => {
  await mockApi(page)
  let pageNumber = 0
  await page.route('**/api/v1/projects?**', (route) => {
    pageNumber += 1
    const item = {
      id: `00000000-0000-4000-8000-00000000000${pageNumber + 3}`,
      slug: `project-${pageNumber}`,
      name: `Project ${pageNumber}`,
      created_at: '2026-08-17T12:00:00Z',
      archived_at: null,
      application_count: 0,
      runtime_group_count: 0,
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [item], next_cursor: pageNumber === 1 ? item.id : null }),
    })
  })
  await page.goto('/projects')
  await authenticate(page)
  await expect(page.getByText('Project 1')).toBeVisible()
  await page.getByRole('button', { name: 'Load more projects' }).click()
  await expect(page.getByText('Project 2')).toBeVisible()
  await expect(page.getByText('Project 1')).toHaveCount(1)
})

test('shows a scoped 404 recovery state', async ({ page }) => {
  await mockApi(page)
  await page.goto('/projects/00000000-0000-4000-8000-999999999999')
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Project not found' })).toBeVisible()
  await expect(page.getByText(/missing-id/)).toBeVisible()
})

test('shows a correlated server error with retry', async ({ page }) => {
  await mockApi(page)
  await page.route('**/api/v1/projects?**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      headers: { 'x-request-id': 'server-error-id' },
      body: JSON.stringify({
        error: 'internal_error',
        message: 'Internal server error',
        request_id: 'body-id',
      }),
    }),
  )
  await page.goto('/projects')
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Projects could not be loaded' })).toBeVisible()
  await expect(page.getByText(/server-error-id/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

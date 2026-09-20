import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

test('creates, edits, searches, and removes a behavior name while retaining technical evidence', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=process`,
  )
  await authenticate(page)

  await page.getByRole('button', { name: 'Add name' }).click()
  await page.getByRole('textbox', { name: 'Behavior name' }).fill('  Database connection  ')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Behavior name saved.')).toBeVisible()
  await expect(page.getByText('Database connection').first()).toBeVisible()
  await expect(page.getByText("<img src=x onerror=alert('inventory')>").first()).toBeVisible()

  await page.getByLabel('Search application activity').fill('Database connection')
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByText('Database connection').first()).toBeVisible()

  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByRole('textbox', { name: 'Behavior name' }).fill('NATS connection')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('NATS connection').first()).toBeVisible()

  await page.getByRole('link', { name: 'Observation history' }).click()
  await expect(page.getByText('NATS connection').first()).toBeVisible()
  await expect(page.getByText("<img src=x onerror=alert('inventory')>").first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByRole('button', { name: 'Remove name' }).click()
  await expect(page.getByText('Behavior name removed.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add name' })).toBeVisible()
  await expect(page.getByText("<img src=x onerror=alert('inventory')>").first()).toBeVisible()
})

test('explores Application Activity scope, views, cursors, and observation history', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)
  await page.getByRole('link', { name: /Application Activity/ }).click()
  await expect(page.getByRole('heading', { name: 'Application Activity' })).toBeVisible()
  const activitySwitcher = page.getByRole('region', { name: 'Application activity summary' })
  const activityButtons = activitySwitcher.getByRole('button')
  await expect(activityButtons).toHaveCount(7)
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Executable executions/ })).toContainText('1')
  await expect(page.getByRole('region', { name: 'Thread activity', exact: true })).toContainText(
    'tokio-rt-worker',
  )
  await expect(page.getByText(/Share of 144 matching recorded observations/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tile view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('[data-view="grid"]')).toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(page.locator('[data-view="list"]')).toBeVisible()
  await page.getByRole('button', { name: 'Tile view' }).click()

  await page.getByText('Advanced filters').click()
  await page.getByLabel('Namespace').fill('production')
  await expect(page).toHaveURL(/namespace=production/)
  await page.getByLabel('Search application activity').fill('api')
  await expect(page).toHaveURL(/search=api/)

  await page.getByRole('button', { name: /Domains/ }).click()
  await expect(page).toHaveURL(/kind=domain/)
  await expect(page.getByRole('heading', { name: 's3.twcstorage.ru (A)' })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 's3.twcstorage.ru.production.svc.cluster.local (AAAA)',
    }),
  ).toBeVisible()
  await expect(
    page.getByText(/DNS resolution variants|Kubernetes DNS search expansion/),
  ).toHaveCount(0)
  const exactDnsHistory = page.getByRole('link', { name: 'Observation history' }).first()
  await expect(exactDnsHistory).toHaveAttribute(
    'href',
    /runtime-inventory\/10000000-0000-4000-8000-000000000002\?evidence=releases/,
  )
  await exactDnsHistory.click()
  await expect(page).toHaveURL(
    /runtime-inventory\/10000000-0000-4000-8000-000000000002\?evidence=releases/,
  )
  await expect(page.getByText('s3.twcstorage.ru (A)')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Application Activity' })
    .click()
  await page.getByText('Advanced filters').click()
  await page.getByRole('button', { name: /Executable executions/ }).click()
  await expect(page.getByRole('button', { name: /<img src=x onerror=alert/ })).toBeVisible()
  await expect(page.locator('img')).toHaveCount(0)
  await page.getByRole('button', { name: /Inbound connections/ }).click()
  await expect(page).toHaveURL(/kind=inbound_endpoint/)
  await expect(page.getByText('TCP IPV6 [::]:8080')).toBeVisible()
  await expect(page.getByText('Port observed listening')).toBeVisible()
  await expect(page.getByText('Accepted connections observed')).toBeVisible()
  await page.getByLabel('Search application activity').fill('8080')
  await expect(page).toHaveURL(/search=(?:8080|%228080%22)/)
  await expect(page.getByText('TCP IPV6 [::]:8080')).toBeVisible()
  await page.getByRole('button', { name: /File Activity/ }).click()
  await expect(page).toHaveURL(/kind=file_activity/)
  await page.getByLabel('Operation').selectOption('rename')
  await expect(page).toHaveURL(/operation=rename/)
  await expect(page.getByLabel(/Old syscall path: \/tmp\/old-<script>/)).toBeVisible()
  await expect(page.getByLabel(/New syscall path: \/tmp\/new\.txt/)).toBeVisible()
  await expect(page.getByText('Unknown', { exact: true })).toBeVisible()
  await expect(page.locator('script', { hasText: '/tmp/old-' })).toHaveCount(0)
  await page.getByRole('button', { name: /Executable executions/ }).click()

  await page.getByRole('link', { name: 'Observation history' }).click()
  await expect(page.getByRole('tab', { name: 'Releases' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Observed', { exact: true })).toBeVisible()
  await expect(page.getByText('Not observed in available evidence')).toBeVisible()
  await expect(page.getByText(/absent|removed|safe/i)).toHaveCount(0)

  await page.getByRole('tab', { name: 'Where observed' }).click()
  await expect(page).toHaveURL(/evidence=sightings/)
  await expect(page.getByText("<script>alert('scope')</script>")).toBeVisible()
  await expect(page.locator('script', { hasText: "alert('scope')" })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /javascript:alert/ })).toHaveCount(0)
  const occurrencesTab = page.getByRole('tab', { name: 'Observation history' })
  await occurrencesTab.click()
  await expect(page).toHaveURL(/evidence=occurrences/)
  await expect(occurrencesTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Process command')).toBeVisible()
  await page.getByText('Technical details').first().click()
  await expect(page.getByText('203.0.113.7')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Where observed' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Application Activity' })
    .click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByRole('heading', { name: 'End of activity results' })).toBeVisible()
  await expect(page).toHaveURL(/cursor=terminal/)
  await page.getByRole('button', { name: 'Return to first page' }).first().click()
  await expect(page).not.toHaveURL(/cursor=/)
})

test('presents exact DNS identities accessibly in Russian at a narrow viewport', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)
  await page.evaluate(() => localStorage.setItem('okoscope.locale', 'ru'))
  await page.reload()

  await expect(page.getByRole('heading', { name: 's3.twcstorage.ru (A)' })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 's3.twcstorage.ru.production.svc.cluster.local (AAAA)',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /s3\.twcstorage\.ru \(A\): 18 observations/ }),
  ).toBeVisible()
  await expect(page.getByText('Кластеры')).toHaveCount(2)
  await expect(page.getByText('Пространства имён')).toHaveCount(2)
  await expect(page.getByText('Нагрузки', { exact: true })).toHaveCount(2)
  await expect(page.getByText('Контейнеры')).toHaveCount(2)
  await expect(page.getByText(/Clusters|Namespaces|Workloads|Containers/)).toHaveCount(0)
  await expect(page.getByText(/Варианты DNS-разрешения|Поисковое расширение DNS/)).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('selects, clears, paginates, and opens history for an exact DNS identity', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)

  const identity = page.getByRole('button', {
    name: /s3\.twcstorage\.ru \(A\): 18 observations/,
  })
  const search = page.getByLabel('Search application activity')
  const expandedIdentity = page.getByRole('heading', {
    name: 's3.twcstorage.ru.production.svc.cluster.local (AAAA)',
  })

  await expect(identity).toHaveAttribute('aria-pressed', 'false')
  await expect(expandedIdentity).toBeVisible()
  await identity.click()
  await expect(identity).toHaveAttribute('aria-pressed', 'true')
  await expect(search).toHaveValue('')
  await expect(page).toHaveURL(/identity_token=domain-a-identity/)
  await expect(page).not.toHaveURL(/search=/)
  await expect(expandedIdentity).toHaveCount(0)

  await page.waitForTimeout(350)
  await expect(identity).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/identity_token=domain-a-identity/)

  await identity.click()
  await expect(search).toHaveValue('')
  await expect(page).not.toHaveURL(/identity_token=/)
  await expect(page).not.toHaveURL(/search=/)
  await expect(expandedIdentity).toBeVisible()

  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByRole('heading', { name: 'End of activity results' })).toBeVisible()
  await expect(page).toHaveURL(/cursor=terminal/)
  await page.getByRole('button', { name: 'Return to first page' }).first().click()
  await expect(page).not.toHaveURL(/cursor=/)

  const exactDnsHistory = page.getByRole('link', { name: 'Observation history' }).first()
  await exactDnsHistory.click()
  await expect(page).toHaveURL(
    /runtime-inventory\/10000000-0000-4000-8000-000000000002\?evidence=releases/,
  )
  await expect(page.getByText('s3.twcstorage.ru (A)')).toBeVisible()
})

test('shows exact DNS empty states', async ({ page }) => {
  const { project, application } = await mockApi(page)
  await page.route('**/runtime-inventory/distribution**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        identity_version: 2,
        kind: 'domain',
        total_item_count: 0,
        total_occurrence_count: 0,
        entries: [],
        other: null,
      }),
    }),
  )
  await page.route(
    /\/api\/v1\/projects\/[^/]+\/applications\/[^/]+\/runtime-inventory(?:\?.*)?$/,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          next_cursor: null,
        }),
      }),
  )
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)

  await expect(page.getByRole('heading', { name: 'No activity to visualize' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No activity observed' })).toBeVisible()
})

test('shows exact DNS request errors without calling grouped APIs', async ({ page }) => {
  const { project, application } = await mockApi(page)
  let exactDomainListRequests = 0
  let exactDomainDistributionRequests = 0
  let groupedDnsRequests = 0
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.includes('/runtime-inventory/dns-groups')) groupedDnsRequests += 1
    if (
      url.pathname.startsWith('/api/v1/') &&
      url.pathname.endsWith('/runtime-inventory') &&
      url.searchParams.get('kind') === 'domain'
    )
      exactDomainListRequests += 1
    if (
      url.pathname.endsWith('/runtime-inventory/distribution') &&
      url.searchParams.get('kind') === 'domain'
    )
      exactDomainDistributionRequests += 1
  })
  await page.route('**/runtime-inventory/distribution**', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'internal', message: 'DNS distribution unavailable' }),
    }),
  )
  await page.route(
    /\/api\/v1\/projects\/[^/]+\/applications\/[^/]+\/runtime-inventory(?:\?.*)?$/,
    (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'internal', message: 'DNS inventory unavailable' }),
      }),
  )
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)

  await expect(
    page.getByRole('heading', { name: 'Could not load activity distribution' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Could not load Application Activity' }),
  ).toBeVisible()
  expect(exactDomainListRequests).toBeGreaterThan(0)
  expect(exactDomainDistributionRequests).toBeGreaterThan(0)
  expect(groupedDnsRequests).toBe(0)
})

test('Application Activity is keyboard accessible at a narrow viewport', async ({ page }) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=process`,
  )
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Application Activity' })).toBeVisible()
  await page.keyboard.press('Tab')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('withholds Application Activity observations on ownership mismatch', async ({ page }) => {
  const { project, application } = await mockApi(page)
  const itemId = '10000000-0000-4000-8000-000000000001'
  await page.route(`**/runtime-inventory/${itemId}`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: itemId,
        project_id: project.id,
        application_id: 'wrong',
        inventory_kind: 'process',
        identity_version: 2,
        semantic_summary: { executable: '/withheld' },
        user_label: null,
        first_seen_at: '2026-08-17T10:00:00Z',
        last_seen_at: '2026-08-18T10:00:00Z',
        occurrence_count: 1,
        release_count: 1,
        cluster_count: 1,
        namespace_count: 1,
        workload_count: 1,
        pod_count: 1,
        container_count: 1,
        group_count: 1,
        evidence: { releases: '', sightings: '', groups: '', occurrences: '' },
      }),
    }),
  )
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory/${itemId}?evidence=releases`,
  )
  await authenticate(page)
  await expect(page.getByRole('heading', { name: /does not belong/ })).toBeVisible()
  await expect(page.getByText('Trusted attributed occurrences')).toHaveCount(0)
})

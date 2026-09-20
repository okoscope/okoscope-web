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
    page
      .locator('[data-view="grid"]')
      .getByText(/DNS resolution variants|Kubernetes DNS search expansion/),
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

test('presents an inert grouped DNS overview and exact identities accessibly in Russian at a narrow viewport', async ({
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
    page.getByRole('list', { name: 'Наиболее наблюдаемые DNS-назначения' }),
  ).toBeVisible()
  const overview = page.getByRole('list', { name: 'Наиболее наблюдаемые DNS-назначения' })
  await expect(overview.getByText('s3.twcstorage.ru')).toBeVisible()
  await expect(overview.getByText('nats.nats.svc.cluster.local')).toBeVisible()
  await expect(overview.getByText('html-to-pdf.rstat.svc')).toBeVisible()
  await expect(overview.getByText('Прочие наблюдаемые DNS-назначения')).toBeVisible()
  await expect(overview.getByRole('button')).toHaveCount(0)
  await expect(page.getByText('Кластеры')).toHaveCount(2)
  await expect(page.getByText('Пространства имён')).toHaveCount(2)
  await expect(page.getByText('Нагрузки', { exact: true })).toHaveCount(2)
  await expect(page.getByText('Контейнеры')).toHaveCount(2)
  await expect(page.getByText(/Clusters|Namespaces|Workloads|Containers/)).toHaveCount(0)
  await expect(page.getByText(/Варианты DNS-разрешения|Поисковое расширение DNS/)).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('keeps the grouped DNS overview inert while exact identities paginate and open history', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)

  const overview = page.getByRole('list', { name: 'Most observed DNS destinations' })
  const search = page.getByLabel('Search application activity')
  const expandedIdentity = page.getByRole('heading', {
    name: 's3.twcstorage.ru.production.svc.cluster.local (AAAA)',
  })
  const originalUrl = page.url()

  await expect(overview.getByText('s3.twcstorage.ru')).toBeVisible()
  await expect(overview.getByText('nats.nats.svc.cluster.local')).toBeVisible()
  await expect(overview.getByText('html-to-pdf.rstat.svc')).toBeVisible()
  await expect(overview.getByText('Other observed DNS destinations')).toBeVisible()
  await expect(overview.getByRole('button')).toHaveCount(0)
  await expect(expandedIdentity).toBeVisible()

  await overview.getByText('s3.twcstorage.ru').click()
  await overview.getByText('Other observed DNS destinations').click()
  await expect(search).toHaveValue('')
  await expect(page).toHaveURL(originalUrl)
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

test('shows grouped DNS loading and preserves stale overview data after a refresh error', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  let releaseDistribution = () => {}
  const distributionGate = new Promise<void>((resolve) => {
    releaseDistribution = resolve
  })
  let failUnfilteredRefresh = false
  await page.route('**/runtime-inventory/dns-groups/distribution**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.searchParams.has('verdict')) {
      if (failUnfilteredRefresh)
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_parameter',
            message: 'DNS distribution refresh failed',
          }),
        })
      await distributionGate
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        total_group_count: 1,
        total_observation_count: 30,
        entries: [
          {
            group: {
              group_token: 'dns-group-s3',
              display_name: 's3.twcstorage.ru',
              process_command: '/usr/local/bin/r-api',
              grouping_reason: 'kubernetes_search_expansion',
              confidence: 'high',
              first_seen_at: '2026-08-17T10:00:00Z',
              last_seen_at: '2026-08-18T10:00:00Z',
              observation_count: 30,
              variant_count: 2,
              query_types: ['A', 'AAAA'],
              release_count: 2,
              cluster_count: 1,
              namespace_count: 1,
              workload_count: 1,
              pod_count: 2,
              container_count: 1,
            },
          },
        ],
        other: null,
      }),
    })
  })
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`,
  )
  await authenticate(page)

  await expect(page.getByText('Loading DNS destination distribution…')).toBeVisible()
  releaseDistribution()
  await expect(page.getByRole('list', { name: 'Most observed DNS destinations' })).toBeVisible()

  await page.getByLabel('Policy verdict').selectOption('expected')
  await expect(page).toHaveURL(/verdict=expected/)
  await expect(page.getByRole('list', { name: 'Most observed DNS destinations' })).toBeVisible()
  failUnfilteredRefresh = true
  await page.getByLabel('Policy verdict').selectOption('')
  await expect(page).not.toHaveURL(/verdict=/)
  await expect(
    page.getByRole('heading', { name: 'DNS destination distribution may be stale' }),
  ).toBeVisible()
  await expect(page.getByRole('list', { name: 'Most observed DNS destinations' })).toContainText(
    's3.twcstorage.ru',
  )
})

test('shows grouped-overview and exact-list DNS empty states', async ({ page }) => {
  const { project, application } = await mockApi(page)
  await page.route('**/runtime-inventory/dns-groups/distribution**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        total_group_count: 0,
        total_observation_count: 0,
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

  await expect(page.getByRole('heading', { name: 'No DNS activity to visualize' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No activity observed' })).toBeVisible()
})

test('shows grouped DNS overview and exact-list request errors without the exact distribution', async ({
  page,
}) => {
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
  await page.route('**/runtime-inventory/dns-groups/distribution**', (route) =>
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
    page.getByRole('heading', { name: 'Could not load DNS destination distribution' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Could not load Application Activity' }),
  ).toBeVisible()
  expect(exactDomainListRequests).toBeGreaterThan(0)
  expect(exactDomainDistributionRequests).toBe(0)
  expect(groupedDnsRequests).toBeGreaterThan(0)
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

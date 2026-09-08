import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'
const panel = (page: Page) =>
  page.getByRole('heading', { name: /runtime retention|Хранение runtime-событий/ }).locator('..')

test('runtime owner saves forever and restores project inheritance', async ({ page }) => {
  const { project } = await mockApi(page)
  await page.goto('/profile')
  await authenticate(page)
  const settings = panel(page)
  await expect(settings.getByLabel('Keep event details (days)')).toHaveValue('30')
  await settings.getByLabel('Automatically delete expired history').check()
  await settings.getByLabel('Keep snapshots forever').check()
  const saved = page.waitForRequest(
    (r) => r.method() === 'PUT' && r.url().endsWith('/runtime-retention'),
  )
  await settings.getByRole('button', { name: 'Save retention settings' }).click()
  expect((await saved).postDataJSON()).toEqual({ enabled: true, raw_days: 30, history_days: null })
  await page.goto(`/projects/${project.id}`)
  await expect(panel(page).getByText('Current policy: inherited from organization')).toBeVisible()
  await panel(page).getByLabel('Policy source').selectOption('project')
  await panel(page).getByLabel('Automatically delete expired history').uncheck()
  await panel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await expect(panel(page).getByText('Current policy: project override')).toBeVisible()
  await panel(page).getByLabel('Policy source').selectOption('organization')
  const reset = page.waitForRequest(
    (r) => r.method() === 'DELETE' && r.url().endsWith('/runtime-retention'),
  )
  await panel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await reset
  await expect(panel(page).getByText('Current policy: inherited from organization')).toBeVisible()
})

test('runtime member sees read-only policy and Russian mobile text is accessible', async ({
  page,
}) => {
  await mockApi(page, 'member')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/profile')
  await authenticate(page)
  await expect(
    panel(page).getByText('Only organization owners can change these settings.'),
  ).toBeVisible()
  await expect(panel(page).getByRole('button')).toHaveCount(0)
  await page.getByRole('region', { name: 'Profile' }).getByLabel('Language').selectOption('ru')
  await expect(
    panel(page).getByRole('heading', { name: 'Хранение runtime-событий организации' }),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('snapshot-only group shows numbers, filters and pagination without event details', async ({
  page,
}) => {
  const { project, application, group } = await mockApi(page)
  const coverage = {
    closed_before: '2026-08-01T00:00:00Z',
    history_expired_before: '2025-08-01T00:00:00Z',
    detail_scope: 'raw',
  }
  await page.route(`**/api/v1/runtime-groups/${group.id}`, (route) =>
    route.fulfill({
      json: {
        ...group,
        coverage,
        representative_event_id: null,
        first_seen_event_id: null,
        notification: { state: 'pending', delivery_count: 0, succeeded_count: 0, failed_count: 0 },
        representative_event: null,
        policy: {
          state: 'current',
          verdict: 'unclassified',
          reason_code: 'no_matching_policy',
          winning_revision_id: null,
          explanation: { specificity: [], related_revision_ids: [] },
          evaluated_at: '2026-08-17T12:00:00Z',
        },
      },
    }),
  )
  await page.route('**/snapshots?*', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    return route.fulfill({
      json: {
        coverage,
        granularity: 'utc_day',
        next_cursor: cursor ? null : 'next',
        items: cursor
          ? []
          : [
              {
                id: 'snapshot',
                group_id: group.id,
                release_id: null,
                day: '2026-07-20',
                format_version: 1,
                occurrence_count: 123456,
                first_observed_at: '2026-07-20T00:00:00Z',
                last_observed_at: '2026-07-20T23:59:59Z',
              },
            ],
      },
    })
  })
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-groups/${group.id}`,
  )
  await authenticate(page)
  const snapshots = page.getByRole('region', { name: 'Daily snapshots' })
  await expect(snapshots.getByRole('cell', { name: '123,456' })).toBeVisible()
  await expect(
    page
      .getByText('Event details are unavailable after history cleanup.')
      .filter({ visible: true }),
  ).toBeVisible()
  await snapshots.getByRole('button', { name: 'Next snapshot page' }).click()
  await expect(page).toHaveURL(/snapshot_cursor=next/)
  await expect(
    snapshots.getByText('No snapshots for the selected period on this page.'),
  ).toBeVisible()
  await snapshots.getByRole('button', { name: 'First snapshot page' }).click()
  await snapshots.getByLabel('From UTC day (inclusive)').fill('2026-07-01')
  await snapshots.getByLabel('Until UTC day (exclusive)').fill('2026-08-01')
  await snapshots.getByRole('button', { name: 'Apply snapshot filters' }).click()
  await expect(page).toHaveURL(/snapshot_from=2026-07-01/)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

test('explores new discoveries and release changes with history and deep links', async ({
  page,
}) => {
  const { project, application, group, releases } = await mockApi(page)
  await page.goto(`/projects/${project.id}/applications/${application.id}`)
  await authenticate(page)
  await page.getByRole('link', { name: /New discoveries/ }).click()
  await expect(page.getByRole('heading', { name: 'New discoveries' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Policy state' })).toBeVisible()
  await expect(page.getByLabel('Policy verdict')).toBeVisible()
  await expect(page.getByText('Advanced filters')).toBeVisible()
  await expect(page.locator('details')).not.toHaveAttribute('open', '')
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('link', { name: 'Исходящее соединение' })).toBeVisible()
  await page.getByLabel('Язык').selectOption('en')
  await expect(page.getByRole('link', { name: 'Outbound connection' })).toBeVisible()
  await expect(page.getByText('Исходящее соединение', { exact: true })).toHaveCount(0)
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
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/namespace=production/)
  await page.getByLabel('Event kind').fill('network.connect')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/event_kind=network.connect/)
  await page.getByRole('link', { name: 'Outbound connection' }).click()
  await expect(page.getByRole('heading', { name: 'Observation history' })).toBeVisible()
  const observationHistory = page.getByRole('region', { name: 'Observation history' })
  await expect(page.getByRole('button', { name: 'Tile view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(observationHistory.locator('[data-view="grid"]')).toBeVisible()
  await page.getByRole('button', { name: 'List view' }).click()
  await expect(observationHistory.locator('[data-view="list"]')).toBeVisible()
  await page.getByRole('button', { name: 'Tile view' }).click()
  await expect(page.getByText('node-1').first()).toBeVisible()
  await page.getByText('Technical details').nth(1).click()
  await expect(page.getByText('203.0.113.7').first()).toBeVisible()
  await expect(page.getByText('Syscall succeeded').first()).toBeVisible()
  await expect(page.getByText('Recently observed DNS evidence').first()).toBeVisible()
  await expect(page.getByText(/Ambiguous: multiple names/).first()).toBeVisible()
  await expect(page.getByText('api.example.com').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'api.example.com' })).toHaveCount(0)
  await expect(page.getByText('Pending', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Acknowledge' }).click()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible()
  await page.getByRole('button', { name: 'Resolve' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.getByRole('button', { name: 'Confirm resolve' }).click()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible()
  await page.getByRole('button', { name: 'Reopen' }).click()
  await expect(page.getByRole('button', { name: 'Acknowledge' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.goBack()
  await expect(page).toHaveURL(/namespace=production/)
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Gateway' })
    .click()
  await page.getByRole('link', { name: 'Releases' }).click()
  await page.getByRole('link', { name: 'View changes' }).first().click()
  await expect(
    page.getByRole('region', { name: 'Complete release comparison summary' }),
  ).toBeVisible()
  await expect(page.getByText('Largest observation-count changes')).toBeVisible()
  await expect(page.getByText('New', { exact: true }).last()).toBeVisible()
  await page.getByLabel('Baseline release').selectOption({ label: releases[1]!.display_name })
  await expect(page).toHaveURL(/baseline=/)
  await page.getByRole('link', { name: 'View discovery' }).click()
  await expect(page).toHaveURL(new RegExp(`${group.id}$`))
  await page.goBack()
  await page.goForward()
})

test('observability routes are keyboard accessible at a narrow viewport and axe-clean', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`/projects/${project.id}/applications/${application.id}/runtime-groups`)
  await authenticate(page)
  await page.keyboard.press('Tab')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await expect(page.getByRole('heading', { name: 'New discoveries' })).toBeVisible()
})

test('shows policy attention facts and opens a canonical review filter', async ({ page }) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/attention?section=overview`,
  )
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Policy classification' })).toBeVisible()
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('heading', { name: 'Классификация политиками' })).toBeVisible()
  await page.getByRole('link', { name: /Не классифицировано: 2/ }).click()
  await expect(page).toHaveURL(/verdict=unclassified/)
  await expect(page).toHaveURL(/suppressed=false/)
  await expect(page.getByRole('heading', { name: 'Новые обнаружения' })).toBeVisible()
})

test('navigates Application attention tabs through URL history at mobile width', async ({
  page,
}) => {
  const { project, application } = await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`/projects/${project.id}/applications/${application.id}/attention`)
  await authenticate(page)

  await expect(page.getByRole('tab', { name: /Recommendations \(\d+\)/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/section=overview/)
  await expect(page.getByRole('heading', { name: 'Observed actions' })).toBeVisible()
  await page.getByRole('tab', { name: /Priority queue \(\d+\)/ }).click()
  await expect(page).toHaveURL(/section=priority/)
  await page.reload()
  await expect(page.getByRole('tab', { name: /Priority queue \(\d+\)/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await page.goForward()
  await expect(page.getByRole('tab', { name: /Priority queue \(\d+\)/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('tab', { name: /Приоритетная очередь \(\d+\)/ })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('restores all first-seen filters and cursor through detail navigation', async ({ page }) => {
  const { project, application } = await mockApi(page)
  const search = new URLSearchParams({
    event_kind: 'network.connect',
    status: 'acknowledged',
    release_id: 'release',
    first_seen_from: '2026-08-16T00:00:00Z',
    first_seen_to: '2026-08-18T00:00:00Z',
    last_seen_to: '2026-08-18T12:00:00Z',
    cursor: 'opaque-cursor',
  })
  await page.goto(`/projects/${project.id}/applications/${application.id}/runtime-groups?${search}`)
  await authenticate(page)
  await page.getByRole('link', { name: 'Outbound connection' }).click()
  await page.goBack()
  await expect(page).toHaveURL(/status=acknowledged/)
  await expect(page).toHaveURL(/cursor=opaque-cursor/)
  await expect(page).toHaveURL(/first_seen_from=/)
})

test('investigates a restart loop from Requires attention with source-qualified evidence', async ({
  page,
}) => {
  const { project, application, group } = await mockApi(page)
  const restartGroup = {
    ...group,
    id: '00000000-0000-4000-8000-000000000099',
    event_kind: 'container.restart_loop',
    semantic_summary: {
      evidence_source: 'derived',
      projection_version: 1,
      threshold: 3,
      window_started_at: '2026-08-17T11:50:00Z',
      window_ended_at: '2026-08-17T12:00:00Z',
      observed_restart_count: 4,
      container_name: 'gateway',
      latest_waiting_reason: 'CrashLoopBackOff',
    },
  }
  const loopOccurrence = {
    id: '00000000-0000-4000-8000-000000000098',
    event_id: '00000000-0000-4000-8000-000000000097',
    observed_at: '2026-08-17T12:00:00Z',
    received_at: '2026-08-17T12:00:05Z',
    node_name: 'node-1',
    namespace: 'production',
    pod_name: 'gateway-abc',
    container_name: 'gateway',
    process_command: '',
    event_kind: 'container.restart_loop',
    payload: { type: 'ContainerRestartLoop', data: restartGroup.semantic_summary },
    correlation: { status: 'qualified', candidate_count: 1, related_event_ids: ['kernel-exit'] },
    related_evidence: [
      {
        id: 'kernel-exit',
        event_id: 'kernel-event',
        observed_at: '2026-08-17T11:59:58Z',
        received_at: '2026-08-17T12:00:01Z',
        event_kind: 'process.exit',
        source: 'kernel',
        payload: {
          type: 'ProcessExit',
          data: {
            source: 'kernel',
            raw_wait_status: 9,
            termination: {
              type: 'signaled',
              signal: 9,
              signal_name: 'SIGKILL',
              core_dump_flag: false,
              conventional_exit_code: 137,
            },
            correlation: { status: 'unresolved', reason: 'before_observation' },
          },
        },
      },
    ],
    release_id: null,
    release_version: null,
  }
  await page.route(
    `**/api/v1/projects/${project.id}/applications/${application.id}/attention-summary**`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          generated_at: '2026-08-17T12:00:00Z',
          window: { kind: '24h', from: '2026-08-16T12:00:00Z', to: '2026-08-17T12:00:00Z' },
          project: { id: project.id, name: project.name, slug: project.slug },
          application: { id: application.id, name: application.name, slug: application.slug },
          totals: {
            new_discoveries: 0,
            open_discoveries: 1,
            acknowledged_discoveries: 0,
            new_runtime_items: 0,
            disappeared_runtime_items: 0,
            unchanged_runtime_items: 0,
            total_runtime_items: 0,
            resource_regressions: 0,
            policy: {
              factual_total: 1,
              actionable_total: 1,
              evaluation_pending: 1,
              expected: 0,
              requires_review: 0,
              policy_conflict: 0,
              unclassified: 0,
            },
          },
          release_comparison: null,
          priority_items: [
            {
              id: 'restart-loop',
              kind: 'container_restart_loop',
              priority: 'normal',
              reason_code: 'container_restart_loop_observed',
              facts: {
                reason_count: 1,
                restart_loop: {
                  projection_version: 1,
                  threshold: 3,
                  observed_restart_count: 4,
                  window_started_at: '2026-08-17T11:50:00Z',
                  window_ended_at: '2026-08-17T12:00:00Z',
                  container_name: 'gateway',
                },
              },
              occurred_at: '2026-08-17T12:00:00Z',
              project: { id: project.id, name: project.name, slug: project.slug },
              application: { id: application.id, name: application.name, slug: application.slug },
              resource: {
                type: 'runtime_group',
                project_id: project.id,
                application_id: application.id,
                runtime_group_id: restartGroup.id,
                event_kind: restartGroup.event_kind,
                semantic_summary: restartGroup.semantic_summary,
              },
            },
          ],
          recommendations: [],
        }),
      }),
  )
  await page.route(`**/api/v1/runtime-groups/${restartGroup.id}`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...restartGroup,
        representative_event: loopOccurrence,
        notification: {
          state: 'not_configured',
          delivery_count: 0,
          succeeded_count: 0,
          failed_count: 0,
        },
      }),
    }),
  )
  await page.route(`**/api/v1/runtime-groups/${restartGroup.id}/occurrences**`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        items: [loopOccurrence],
        next_cursor: null,
        ordering: 'received_at_desc_observed_at_desc_id_desc',
      }),
    }),
  )
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/attention?section=priority`,
  )
  await authenticate(page)
  await expect(
    page.getByText('gateway restarted 4 times in the bounded investigation window.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Review', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Restart loop observed' })).toBeVisible()
  await expect(page.getByText('Derived finding').first()).toBeVisible()
  await page
    .getByRole('region', { name: 'Observation history' })
    .getByText('Technical details')
    .click()
  await expect(page.getByLabel(/Kernel evidence\. Observed by/).first()).toBeVisible()
  await expect(page.getByText(/cause, including OOM, are unknown/)).toBeVisible()
})

test('withholds runtime group data on route ownership mismatch', async ({ page }) => {
  const { project, application, group } = await mockApi(page)
  await page.route(`**/api/v1/runtime-groups/${group.id}`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ...group,
        project_id: 'wrong',
        representative_event: {},
        recent_occurrences: [],
      }),
    }),
  )
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-groups/${group.id}`,
  )
  await authenticate(page)
  await expect(page.getByRole('heading', { name: /does not belong/ })).toBeVisible()
  await expect(page.getByText('/app/gateway')).toHaveCount(0)
})

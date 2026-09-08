import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

const notificationPanel = (page: Page) =>
  page.getByRole('heading', { name: /notification retention|Хранение уведомлений/ }).locator('..')

test('owner edits organization policy, inherits, overrides, and resets project retention', async ({
  page,
}) => {
  const { project } = await mockApi(page)
  await page.goto('/profile')
  await authenticate(page)
  await expect(
    page.getByRole('heading', { name: 'Organization notification retention' }),
  ).toBeVisible()
  await expect(notificationPanel(page).getByLabel('Keep notification history (days)')).toHaveValue(
    '90',
  )
  await expect(notificationPanel(page).getByText('Automatic cleanup is disabled.')).toBeVisible()
  await notificationPanel(page).getByLabel('Automatically delete expired history').check()
  for (const value of ['', '0', '3651', '1.5']) {
    await notificationPanel(page).getByLabel('Keep notification history (days)').fill(value)
    await notificationPanel(page).getByRole('button', { name: 'Save retention settings' }).click()
    expect(
      await page
        .getByLabel('Keep notification history (days)')
        .evaluate((element: HTMLInputElement) => element.validity.valid),
    ).toBe(false)
    await expect(notificationPanel(page).getByText('Retention settings saved.')).toHaveCount(0)
  }
  await notificationPanel(page).getByLabel('Keep notification history (days)').fill('30')
  await expect(notificationPanel(page).getByText(/Changes apply to existing history/)).toBeVisible()
  const saved = page.waitForRequest(
    (request) => request.method() === 'PUT' && request.url().includes('/notification-retention'),
  )
  await notificationPanel(page).getByLabel('Keep notification history (days)').press('Enter')
  expect((await saved).postDataJSON()).toEqual({ enabled: true, history_days: 30 })
  await expect(notificationPanel(page).getByText('Current retention: 30 days')).toBeVisible()
  await page.goto(`/projects/${project.id}/notifications`)
  await expect(
    notificationPanel(page).getByText('Current policy: inherited from organization'),
  ).toBeVisible()
  await expect(notificationPanel(page).getByText('Current retention: 30 days')).toBeVisible()
  await notificationPanel(page).getByLabel('Policy source').selectOption('project')
  await notificationPanel(page).getByLabel('Automatically delete expired history').uncheck()
  await notificationPanel(page).getByLabel('Keep notification history (days)').fill('3650')
  await notificationPanel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await expect(notificationPanel(page).getByText('Current policy: project override')).toBeVisible()
  await expect(notificationPanel(page).getByText('Automatic cleanup is disabled.')).toBeVisible()
  await page.goto('/profile')
  await notificationPanel(page).getByLabel('Keep notification history (days)').fill('1')
  await notificationPanel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await expect(notificationPanel(page).getByText('Current retention: 1 days')).toBeVisible()
  await page.goto(`/projects/${project.id}/notifications`)
  await expect(notificationPanel(page).getByText('Current policy: project override')).toBeVisible()
  await expect(notificationPanel(page).getByText('Automatic cleanup is disabled.')).toBeVisible()
  await notificationPanel(page).getByLabel('Policy source').selectOption('organization')
  await expect(notificationPanel(page).getByText(/1 days/)).toBeVisible()
  await notificationPanel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await expect(
    notificationPanel(page).getByText('Current policy: inherited from organization'),
  ).toBeVisible()
  await expect(notificationPanel(page).getByText('Current retention: 1 days')).toBeVisible()
})

test('members read both policies without mutation controls', async ({ page }) => {
  const { project } = await mockApi(page, 'member')
  await page.goto('/profile')
  await authenticate(page)
  await expect(
    notificationPanel(page).getByText('Only organization owners can change these settings.'),
  ).toBeVisible()
  await expect(notificationPanel(page).getByText('Current retention: 90 days')).toBeVisible()
  await expect(
    notificationPanel(page).getByRole('button', { name: 'Save retention settings' }),
  ).toHaveCount(0)
  await expect(notificationPanel(page).getByRole('spinbutton')).toHaveCount(0)
  await page.goto(`/projects/${project.id}/notifications`)
  await expect(
    notificationPanel(page).getByText('Current policy: inherited from organization'),
  ).toBeVisible()
  await expect(
    notificationPanel(page).getByText('Only organization owners can change these settings.'),
  ).toBeVisible()
  await expect(notificationPanel(page).getByText('Current retention: 90 days')).toBeVisible()
  await expect(notificationPanel(page).getByLabel('Policy source')).toHaveCount(0)
})

test('retention controls localize and remain accessible on mobile', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/profile')
  await authenticate(page)
  await page.getByRole('region', { name: 'Profile' }).getByLabel('Language').selectOption('ru')
  await expect(
    page.getByRole('heading', { name: 'Хранение уведомлений организации' }),
  ).toBeVisible()
  await expect(
    notificationPanel(page).getByLabel('Хранить историю уведомлений (дней)'),
  ).toHaveValue('90')
  await expect(
    notificationPanel(page).getByText(/Изменения применяются к существующей истории/),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('retention loading, read errors, retry and mutation errors are visible', async ({ page }) => {
  await mockApi(page)
  let failRead = true
  let releaseRead: (() => void) | undefined
  const pendingRead = new Promise<void>((resolve) => {
    releaseRead = resolve
  })
  let releaseSave: (() => void) | undefined
  const pendingSave = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  await page.route('**/organizations/*/notification-retention', async (route) => {
    if (route.request().method() === 'PUT') {
      await pendingSave
      return route.fulfill({
        status: 500,
        json: { error: 'save_failed', message: 'Save unavailable', request_id: 'save-request' },
      })
    }
    await pendingRead
    if (failRead)
      return route.fulfill({
        status: 500,
        json: { error: 'read_failed', message: 'Read unavailable', request_id: 'read-request' },
      })
    return route.fulfill({ json: { enabled: false, history_days: 90 } })
  })
  await page.goto('/profile')
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Organization runtime retention' })).toBeVisible()
  await expect(page.getByText('Loading retention settings…')).toBeVisible()
  releaseRead?.()
  await expect(
    page.getByRole('heading', { name: 'Retention settings could not be loaded' }),
  ).toBeVisible()
  failRead = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(
    page.getByRole('heading', { name: 'Organization notification retention' }),
  ).toBeVisible()
  await notificationPanel(page).getByRole('button', { name: 'Save retention settings' }).click()
  await expect(notificationPanel(page).getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await expect(notificationPanel(page).getByRole('spinbutton')).toBeDisabled()
  releaseSave?.()
  await expect(
    page.getByRole('heading', { name: 'Retention settings could not be saved' }),
  ).toBeVisible()
  await expect(notificationPanel(page).getByText('Retention settings saved.')).toHaveCount(0)
})

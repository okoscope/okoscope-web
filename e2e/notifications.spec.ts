import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'

test('manages a destination and investigates its test delivery', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const { project, destination, delivery } = await mockApi(page)
  await page.goto(`/projects/${project.id}/notifications`)
  await authenticate(page)
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Delivery healthy' })).toBeVisible()
  await page.getByRole('button', { name: 'Create destination' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Name').fill('Operations')
  await page.getByLabel('Destination URL').fill('https://receiver.example/hooks')
  await page.getByRole('dialog').getByRole('button', { name: 'Create destination' }).click()
  await expect(page.getByText('one-time-signing-secret')).toBeVisible()
  await page.getByRole('button', { name: 'Copy secret' }).click()
  await expect(page.getByText('Secret copied to clipboard.')).toBeAttached()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('one-time-signing-secret')).toHaveCount(0)
  await page.getByRole('link', { name: 'Operations' }).click()
  await page.getByRole('button', { name: 'Send test delivery' }).click()
  await expect(page.getByText(/Test delivery queued/)).toBeVisible()
  await page.getByRole('link', { name: 'Notifications' }).click()
  await page.getByRole('link', { name: delivery.id }).click()
  await expect(page.getByRole('heading', { name: 'Attempt timeline' })).toBeVisible()
  await expect(page.getByText('must not render')).toHaveCount(0)
  await page.getByRole('link', { name: 'Notifications' }).click()
  await page.getByRole('link', { name: destination.name }).click()
  await page.getByRole('button', { name: 'Rotate secret' }).click()
  await expect(page.getByRole('dialog')).toContainText('current signing secret becomes invalid')
  await page.getByRole('button', { name: 'Confirm rotate' }).click()
  await expect(page.getByText('rotated-one-time-secret')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Disable' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm disable' }).click()
  await expect(page.getByText('Destination disabled.')).toBeVisible()
})

test('shows a safe test-delivery failure with error code and request ID', async ({ page }) => {
  const { project, destination } = await mockApi(page)
  await page.route(`**/webhook-destinations/${destination.id}/test`, (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      headers: { 'x-request-id': 'test-delivery-request' },
      body: JSON.stringify({
        error: 'receiver_unavailable',
        message: 'The receiver is temporarily unavailable.',
        request_id: 'body-request',
      }),
    }),
  )
  await page.goto(`/projects/${project.id}/notifications/destinations/${destination.id}`)
  await authenticate(page)
  await page.getByRole('button', { name: 'Send test delivery' }).click()
  await expect(page.getByRole('heading', { name: 'Test delivery failed' })).toBeVisible()
  await expect(page.getByText('Error code: receiver_unavailable')).toBeVisible()
  await expect(page.getByText('test-delivery-request')).toBeVisible()
})

test('recovers deliveries and audits recovery operations', async ({ page }) => {
  const { project, delivery, recoveryOperation } = await mockApi(page)
  await page.goto(`/projects/${project.id}/notifications/deliveries/${delivery.id}`)
  await authenticate(page)
  await page.getByRole('button', { name: 'Retry delivery' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm retry' }).click()
  await expect(page.getByText(/Command completed: pending/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel delivery' }).click()
  await page.getByRole('button', { name: 'Confirm cancel' }).click()
  await expect(page.getByText(/Command completed: cancelled/)).toBeVisible()
  await page.getByRole('link', { name: 'Notifications' }).click()
  await page.getByRole('link', { name: 'Recovery history' }).click()
  await expect(page.getByRole('heading', { name: 'Recovery history' })).toBeVisible()
  await page.getByRole('link', { name: recoveryOperation.id }).click()
  await expect(page.getByRole('heading', { name: 'Affected deliveries' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('link', { name: 'Notifications' }).click()
  await page.getByRole('button', { name: 'Bulk retry failed deliveries' }).click()
  await page.getByLabel('Limit').fill('1')
  await page.getByRole('button', { name: 'Review bulk retry' }).click()
  await page.getByRole('button', { name: 'Confirm bulk retry' }).click()
  await expect(page.getByText(/Selected 1; retried 1/)).toBeVisible()
})

test('shows a correlated recovery conflict without automatic replay', async ({ page }) => {
  const { project, delivery } = await mockApi(page)
  let commandCount = 0
  await page.route(`**/notification-deliveries/${delivery.id}/retry`, (route) => {
    commandCount += 1
    return route.fulfill({
      status: 409,
      contentType: 'application/json',
      headers: { 'x-request-id': 'recovery-conflict-request' },
      body: JSON.stringify({
        error: 'active_lease',
        message: 'Delivery has an active lease.',
        request_id: 'body-request',
      }),
    })
  })
  await page.goto(`/projects/${project.id}/notifications/deliveries/${delivery.id}`)
  await authenticate(page)
  await page.getByRole('button', { name: 'Retry delivery' }).click()
  await page.getByRole('button', { name: 'Confirm retry' }).click()
  await expect(page.getByText('Error code: active_lease')).toBeVisible()
  await expect(page.getByText('recovery-conflict-request')).toBeVisible()
  expect(commandCount).toBe(1)
})

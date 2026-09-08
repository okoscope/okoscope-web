import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('verification link is fragment-safe and requires an explicit confirmation', async ({
  page,
}) => {
  const token = `verify_${'x'.repeat(40)}`
  let confirmations = 0
  await page.route('**/api/v1/auth/email-verifications', async (route) => {
    confirmations += 1
    expect((await route.request().postDataJSON()) as { token: string }).toEqual({ token })
    await route.fulfill({ status: 204 })
  })

  await page.goto(`/verify-email#token=${token}`)
  await expect(page).toHaveURL('/verify-email')
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeFocused()
  expect(confirmations).toBe(0)

  await page.getByRole('button', { name: 'Confirm email' }).click()
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeFocused()
  expect(confirmations).toBe(1)
})

test('reset password validates confirmation and remains accessible on a narrow screen', async ({
  page,
}) => {
  const token = `reset_${'x'.repeat(40)}`
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route('**/api/v1/auth/password-resets', async (route) => {
    expect((await route.request().postDataJSON()) as Record<string, string>).toEqual({
      token,
      new_password: 'correct horse battery',
    })
    await route.fulfill({ status: 204 })
  })

  await page.goto(`/reset-password#token=${token}`)
  await page.getByLabel('New password', { exact: true }).fill('correct horse battery')
  await page.getByLabel('Confirm new password', { exact: true }).fill('different password')
  await expect(page.getByRole('button', { name: 'Set new password' })).toBeDisabled()
  await expect(page.getByText('Passwords do not match.')).toBeVisible()
  await page.getByLabel('Confirm new password', { exact: true }).fill('correct horse battery')
  await page.getByRole('button', { name: 'Set new password' }).click()

  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

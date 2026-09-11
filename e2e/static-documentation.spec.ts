import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const articles = [
  ['', 'Meet Okoscope', 'Знакомство с Okoscope'],
  ['access-control/', 'Accounts, roles, and invitations', 'Аккаунты, роли и приглашения'],
  ['how-it-works/', 'How it works', 'Принцип работы'],
  ['account-email/', 'Account email and passwords', 'Почта аккаунта и пароли'],
  ['quick-start/', 'Okoscope Cloud — Quick start', 'Okoscope Cloud — Быстрый старт'],
  ['self-hosting/', 'Self-hosted — Deployment', 'Self-hosted — Самостоятельное развёртывание'],
  ['application-resources/', 'Application resources', 'Ресурсы приложения'],
  ['capabilities/', 'Capabilities', 'Возможности'],
  ['workflows/', 'Practical workflows', 'Практические сценарии'],
  ['compatibility-and-limits/', 'Compatibility and limits', 'Совместимость и ограничения'],
  ['data-and-security/', 'Data and security', 'Данные и безопасность'],
  ['troubleshooting/', 'Troubleshooting and FAQ', 'Устранение проблем и FAQ'],
] as const

for (const [slug, english, russian] of articles) {
  test(`${slug || 'overview'} has complete paired static pages`, async ({ request }) => {
    for (const [locale, title] of [
      ['en', english],
      ['ru', russian],
    ] as const) {
      const response = await request.get(`${locale}/${slug}`)
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html).toContain(`<html lang="${locale}"`)
      expect(html).toContain(title)
      expect(html).toContain(`rel="canonical" href="https://okoscope.com/docs/${locale}/${slug}"`)
      expect(html).toContain('hreflang="en"')
      expect(html).toContain('hreflang="ru"')
      expect(html).toContain('property="og:title"')
      expect(html).toContain('name="twitter:title"')
    }
  })
}

test('quick start preserves localized content, anchors, code, and language switching', async ({
  page,
}) => {
  await page.goto('en/quick-start/#deploy')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okoscope Cloud — Quick start')
  await expect(page.locator('#deploy')).toHaveCount(1)
  await expect(page.getByText('helm upgrade --install okoscope-agent')).toBeVisible()
  const language = page.locator('starlight-lang-select select').first()
  await language.selectOption('/docs/ru/quick-start/')
  await page.waitForURL('**/docs/ru/quick-start/#deploy')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okoscope Cloud — Быстрый старт')
})

test('theme selector changes and persists the rendered palette accessibly', async ({ page }) => {
  await page.goto('en/self-hosting/')
  const theme = page.locator('starlight-theme-select select').first()

  await theme.selectOption('dark')
  const dark = await page.evaluate(() => ({
    surface: getComputedStyle(document.documentElement).getPropertyValue('--sl-color-bg').trim(),
    background: getComputedStyle(document.body).backgroundImage,
    brand: getComputedStyle(document.querySelector<HTMLElement>('.site-title')!).color,
    current: (() => {
      const style = getComputedStyle(
        document.querySelector<HTMLElement>(".sidebar-content a[aria-current='page']")!,
      )
      return {
        color: style.color,
        background: style.backgroundColor,
        border: style.borderTopColor,
      }
    })(),
  }))
  expect(dark.brand).toBe('rgb(255, 255, 255)')
  expect(dark.current).toEqual({
    color: 'rgb(103, 232, 249)',
    background: 'rgba(0, 0, 0, 0)',
    border: 'rgba(0, 0, 0, 0)',
  })

  await theme.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const light = await page.evaluate(() => ({
    surface: getComputedStyle(document.documentElement).getPropertyValue('--sl-color-bg').trim(),
    background: getComputedStyle(document.body).backgroundImage,
    brand: getComputedStyle(document.querySelector<HTMLElement>('.site-title')!).color,
    current: (() => {
      const style = getComputedStyle(
        document.querySelector<HTMLElement>(".sidebar-content a[aria-current='page']")!,
      )
      return {
        color: style.color,
        background: style.backgroundColor,
        border: style.borderTopColor,
      }
    })(),
  }))
  expect(light.surface).toBe('#f8fbfd')
  expect(light.brand).toBe('rgb(7, 20, 37)')
  expect(light.current).toEqual({
    color: 'rgb(8, 127, 140)',
    background: 'rgba(0, 0, 0, 0)',
    border: 'rgba(0, 0, 0, 0)',
  })
  expect(light.surface).not.toBe(dark.surface)
  expect(light.background).not.toBe(dark.background)

  await page.reload()
  await expect(theme).toHaveValue('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('Russian theme choices fit the visible selector at intermediate width', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 })
  await page.goto('ru/self-hosting/')
  const theme = page.locator('starlight-theme-select select').first()
  await expect(theme.locator('option')).toHaveText(['Тёмная', 'Светлая', 'Авто'])

  const geometry = await theme.evaluate((select) => {
    const themeSelect = select as HTMLSelectElement
    const style = getComputedStyle(select)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    context.font = style.font
    const widestLabel = Math.max(
      ...Array.from(themeSelect.options, (option) => context.measureText(option.text).width),
    )
    return {
      available: select.clientWidth,
      required:
        widestLabel + Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight),
    }
  })
  expect(geometry.available).toBeGreaterThanOrEqual(Math.ceil(geometry.required))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('self-hosting flow is semantic, responsive, and accessible', async ({ page }) => {
  await page.goto('ru/self-hosting/')
  const brand = page.getByRole('link', { name: 'Okoscope', exact: true }).first()
  await expect(brand).toBeVisible()
  await expect(brand.locator('img')).toHaveAttribute('alt', '')
  const flow = page.getByRole('navigation', { name: 'От базы данных до первого события' })
  await expect(flow.getByRole('link')).toHaveCount(6)
  await expect(flow.getByRole('link', { name: 'Secret базы данных' })).toHaveAttribute(
    'href',
    '#database',
  )
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('sitemap discovers both locales', async ({ request }) => {
  const sitemapIndex = await request.get('sitemap-index.xml')
  expect(sitemapIndex.status()).toBe(200)
  const sitemap = await request.get('sitemap-0.xml')
  const xml = await sitemap.text()
  expect(xml).toContain('https://okoscope.com/docs/en/quick-start/')
  expect(xml).toContain('https://okoscope.com/docs/ru/quick-start/')
})

test('application documentation link opens the localized static site', async ({ page }) => {
  await page.goto('/')
  const docs = page.getByRole('link', { name: 'Documentation' })
  await expect(docs).toHaveAttribute('href', '/docs/en/')
  await docs.click()
  await expect(page).toHaveURL('/docs/en/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meet Okoscope')
})

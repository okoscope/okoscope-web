import { test } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'
import { LANGUAGE_STORAGE_KEY, supportedLocales, type Locale } from '../src/shared/i18n'

const outputDirectory = 'public/documentation'

// Regenerates the screenshots embedded in the public documentation. The pages are
// served by the real interface; every response comes from the e2e fixtures, so the
// published images contain documentation addresses and no observations from a real
// installation. Run with `npm run docs:screenshots`.
for (const locale of supportedLocales) {
  test(`documentation screenshots (${locale})`, async ({ page }) => {
    const { project, application, group, releases, delivery } = await mockApi(page)
    const applicationPath = `/projects/${project.id}/applications/${application.id}`

    await page.goto(applicationPath)
    await authenticate(page)
    await page.waitForURL(`**${applicationPath}`)
    await useLocale(page, locale)

    await capture(page, locale, 'runtime-groups', `${applicationPath}/runtime-groups`, {
      height: 1005,
    })
    await capture(
      page,
      locale,
      'runtime-group-evidence',
      `${applicationPath}/runtime-groups/${group.id}`,
      { height: 790 },
    )
    await capture(
      page,
      locale,
      'attention-overview',
      `${applicationPath}/attention?section=overview`,
      { height: 800 },
    )
    await capture(page, locale, 'application-resources', `${applicationPath}/resources`, {
      height: 1050,
    })
    await capture(
      page,
      locale,
      'resource-attention',
      `${applicationPath}/attention?section=recommendations`,
      { height: 940 },
    )
    await capture(
      page,
      locale,
      'release-comparison',
      `${applicationPath}/releases/${releases[0]!.id}/runtime-diff`,
      { height: 815 },
    )
    await capture(
      page,
      locale,
      'release-resource-impact',
      `${applicationPath}/releases/${releases[0]!.id}/runtime-diff`,
      { height: 1300 },
    )
    await capture(
      page,
      locale,
      'application-activity',
      `${applicationPath}/runtime-inventory?kind=domain`,
      { height: 1105 },
    )
    await capture(
      page,
      locale,
      'notification-delivery',
      `/projects/${project.id}/notifications/deliveries/${delivery.id}`,
      { height: 1075 },
    )
  })
}

async function useLocale(page: import('@playwright/test').Page, locale: Locale) {
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [LANGUAGE_STORAGE_KEY, locale],
  )
}

// Captures a documentation figure. Framing starts at the page title, so the breadcrumbs
// above it stay out of the image and the evidence below it is not cropped away.
async function capture(
  page: import('@playwright/test').Page,
  locale: Locale,
  name: string,
  path: string,
  frame: { height: number },
) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  const main = page.locator('main').first()
  await main.waitFor()
  const title = main.locator('h1').first()
  await title.waitFor()
  const clip = await main.evaluate((element, padding) => {
    const article = element.getBoundingClientRect()
    const heading = element.querySelector('h1')!.getBoundingClientRect()
    return {
      x: article.x + window.scrollX,
      y: heading.y + window.scrollY - padding,
      width: article.width,
    }
  }, 24)
  await page.screenshot({
    path: `${outputDirectory}/${name}.${locale}.png`,
    fullPage: true,
    clip: { ...clip, height: frame.height },
  })
}

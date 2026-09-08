import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { authenticate, mockApi } from './fixtures'
import { articles } from '../src/features/documentation/content'

const titles = [
  ['overview', 'Meet Okoscope', 'Знакомство с Okoscope'],
  ['how-it-works', 'How it works', 'Принцип работы'],
  ['quick-start', 'Okoscope Cloud — Quick start', 'Okoscope Cloud — Быстрый старт'],
  ['self-hosting', 'Self-hosted — Deployment', 'Self-hosted — Самостоятельное развёртывание'],
  ['capabilities', 'Capabilities', 'Возможности'],
  ['workflows', 'Practical workflows', 'Практические сценарии'],
  ['compatibility-and-limits', 'Compatibility and limits', 'Совместимость и ограничения'],
  ['data-and-security', 'Data and security', 'Данные и безопасность'],
  ['troubleshooting', 'Troubleshooting and FAQ', 'Устранение проблем и FAQ'],
] as const

test('self-hosting follows database, deployment, activation and agent connection in both languages', async ({
  page,
}) => {
  const ids = ['database', 'production-values', 'rollout', 'verify', 'claim', 'connect-agents']
  await page.goto('/docs/self-hosting')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const article = page.locator('main')
    expect(
      await article
        .locator('section')
        .evaluateAll((sections) =>
          sections.map((section) => section.getAttribute('aria-labelledby')),
        ),
    ).toEqual([
      'components',
      ...ids,
      'external-secrets',
      'backups',
      'helm-values',
      'values-server',
      'values-agent',
      'values-validation',
      'existing-installations',
    ])
    const flow = page.getByRole('navigation', {
      name:
        locale === 'en' ? 'From database to the first event' : 'От базы данных до первого события',
    })
    expect(
      await flow.evaluate((element) => [
        element.previousElementSibling?.getAttribute('aria-labelledby'),
        element.nextElementSibling?.getAttribute('aria-labelledby'),
      ]),
    ).toEqual(['components', 'database'])
    await expect(flow.locator('a')).toHaveCount(6)
    await expect(flow.locator('ol')).toHaveCount(3)
    const labels =
      locale === 'en'
        ? [
            'Database Secret',
            'Access & settings',
            'Install server',
            'Check readiness',
            'First owner',
            'Agents & first event',
          ]
        : [
            'Secret базы данных',
            'Доступ и настройки',
            'Установка сервера',
            'Проверка готовности',
            'Первый владелец',
            'Агенты и событие',
          ]
    for (const [index, id] of ids.entries()) {
      const link = flow.getByRole('link').nth(index)
      await expect(link).toHaveAttribute('href', `#${id}`)
      await expect(link).toHaveAccessibleName(labels[index]!)
      await link.click()
      expect(new URL(page.url()).hash).toBe(`#${id}`)
      await expect(page.locator(`h2#${id}`)).toBeVisible()
      const matching = await page.evaluate((id) => {
        const icons = [
          document.querySelector(`h2#${id} svg`),
          document.querySelector(`.docs-toc a[href="#${id}"] svg`),
          document.querySelector(`.docs-setup-flow a[href="#${id}"] svg`),
        ]
        return (
          icons.every((icon) => icon?.closest('[aria-hidden="true"]')) &&
          new Set(
            icons.map((icon) =>
              [...icon!.classList].filter((name) => name.startsWith('lucide-')).join(' '),
            ),
          ).size === 1
        )
      }, id)
      expect(matching).toBe(true)
    }
    await expect(article.locator('section[aria-labelledby="rollout"] pre code')).toContainText(
      '-f values.yaml',
    )
    await expect(article.locator('section[aria-labelledby="verify"] pre code')).toContainText(
      'helm test okoscope',
    )
    await expect(article.locator('section[aria-labelledby="claim"] pre code')).toContainText(
      "jsonpath='{.data.setup-token}'",
    )
    const networking = article.locator('section[aria-labelledby="production-values"] pre code')
    await expect(networking).toContainText(
      'publicGrpcEndpoint: https://agents.okoscope.example.com:443',
    )
    await expect(networking).toContainText('tlsSecret: okoscope-grpc-tls')
    await expect(networking).toContainText('existingSecret: okoscope-database')
    expect(
      (await article.locator('section p, section li').allTextContents()).join('\n'),
    ).not.toMatch(/\*\*|`/)
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('quick start flow links six localized steps between prerequisites and access', async ({
  page,
}) => {
  await page.goto('/docs/quick-start')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const flow = page.getByRole('navigation', {
      name: locale === 'en' ? 'From access to the first event' : 'От доступа до первого события',
    })
    await expect(flow).toBeVisible()
    expect(
      await flow.evaluate((element) => [
        element.previousElementSibling?.getAttribute('aria-labelledby'),
        element.nextElementSibling?.getAttribute('aria-labelledby'),
      ]),
    ).toEqual(['before-you-start', 'access'])
    await expect(flow.locator('ol')).toHaveCount(3)
    await expect(flow.locator('a svg')).toHaveCount(6)
    await expect(flow.locator('.docs-setup-flow-eyebrow, .docs-setup-flow-title')).toHaveCount(0)
    const names =
      locale === 'en'
        ? [
            'Access & Application',
            'Kubernetes workload',
            'Token Secret',
            'Install agent',
            'Check startup',
            'First observation',
          ]
        : [
            'Доступ и приложение',
            'Нагрузка Kubernetes',
            'Secret с токеном',
            'Установка агента',
            'Проверка запуска',
            'Первое наблюдение',
          ]
    const ids = ['access', 'workload', 'secret', 'deploy', 'check-agent', 'first-event']
    for (const [index, id] of ids.entries()) {
      const link = flow.getByRole('link').nth(index)
      await expect(link).toHaveAttribute('href', `#${id}`)
      await expect(link).toHaveAccessibleName(names[index]!)
      await link.click()
      expect(new URL(page.url()).hash).toBe(`#${id}`)
      await expect(page.locator(`h2#${id}`)).toBeVisible()
    }
    await expect(flow.locator('svg:not([aria-hidden="true"])')).toHaveCount(0)
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('quick start presents sequential semantic instructions in both languages', async ({
  page,
}) => {
  await page.goto('/docs/quick-start#access')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const article = page.locator('main')
    expect(
      await article
        .locator('section')
        .evaluateAll((sections) =>
          sections.map((section) => section.getAttribute('aria-labelledby')),
        ),
    ).toEqual([
      'before-you-start',
      'access',
      'workload',
      'secret',
      'deploy',
      'check-agent',
      'first-event',
      'agent-variants',
      'uninstall',
      'remove-agent-namespace',
    ])
    const namespaceCleanup = article.locator('section[aria-labelledby="remove-agent-namespace"]')
    await expect(namespaceCleanup.getByRole('heading', { level: 3 })).toHaveText(
      locale === 'en'
        ? 'Optional: remove the agent namespace'
        : 'Необязательно: удалите пространство имён агента',
    )
    await expect(namespaceCleanup.locator('pre code')).toHaveText(
      'kubectl delete namespace okoscope-system',
    )
    await expect(namespaceCleanup.locator('pre code')).toHaveClass('language-bash')
    const access = article.locator('section[aria-labelledby="access"]')
    await expect(access.locator(':scope > p').first()).toHaveText(
      locale === 'en'
        ? 'Open https://okoscope.com and sign in or register. Registration sends a welcome verification email and creates no session until you explicitly confirm the link and sign in.'
        : 'Откройте https://okoscope.com и войдите в учётную запись или зарегистрируйтесь. После регистрации придёт приветственное письмо: сеанс появится только после явного подтверждения ссылки и последующего входа.',
    )
    await expect(access.locator('ol > li')).toHaveCount(3)
    await expect(access.locator(':scope > p').nth(2)).toHaveText(
      locale === 'en'
        ? 'Organization → Project → Application'
        : 'Организация → Проект → Приложение',
    )
    await expect(access.locator(':scope > p').nth(2).locator('strong')).toHaveCount(3)
    expect(
      await access.locator('aside').evaluate((element) => element.previousElementSibling?.tagName),
    ).toBe('OL')
    for (const id of ['workload', 'secret', 'first-event']) {
      await expect(article.locator(`section[aria-labelledby="${id}"] ol`)).toHaveCount(1)
    }
    await expect(article.locator('section[aria-labelledby="before-you-start"] ul')).toHaveCount(1)
    const checkAgent = article.locator('section[aria-labelledby="check-agent"]')
    await expect(checkAgent).toContainText(
      locale === 'en'
        ? 'As soon as the agents connect to the server, they should appear automatically in the Application’s Worker nodes section.'
        : 'Как только агенты подключатся к серверу, они должны автоматически появиться в разделе приложения «Рабочие узлы».',
    )
    await expect(
      checkAgent
        .locator('strong')
        .getByText(locale === 'en' ? 'Worker nodes' : '«Рабочие узлы»', { exact: true }),
    ).toBeVisible()
    await expect(
      article
        .locator('section[aria-labelledby="workload"] code')
        .filter({ hasText: 'identity.clusterName' }),
    ).toHaveCount(1)
    expect(
      (await article.locator('section p, section li, section aside').allTextContents()).join('\n'),
    ).not.toMatch(/\*\*|`/)
    const guide = article.locator('section a[href="/docs/compatibility-and-limits"]').first()
    await expect(guide).toHaveText(
      locale === 'en' ? 'Compatibility and limits' : 'Совместимость и ограничения',
    )
    await guide.click()
    await expect(page).toHaveURL(/\/docs\/compatibility-and-limits$/)
    await expect(page.getByLabel(/Language|Язык/)).toHaveValue(locale)
    await page.goto('/docs/quick-start#access')
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 800 })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('account email docs distinguish registration context from creation notifications', async ({
  page,
}) => {
  await page.goto('/docs/account-email#creation-notifications')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const notifications = page.locator('section[aria-labelledby="creation-notifications"]')
    await expect(notifications).toContainText(
      locale === 'en'
        ? 'includes the Organization name only as registration context'
        : 'содержит название организации только как контекст регистрации',
    )
    await expect(notifications).toContainText(
      locale === 'en'
        ? 'does not send a separate Organization-created email'
        : 'не отправляет отдельное письмо о создании организации',
    )
    await expect(notifications).toContainText(
      locale === 'en'
        ? 'every currently verified Organization owner receives one localized message'
        : 'каждый текущий подтверждённый владелец организации получает одно локализованное письмо',
    )
  }
})

for (const expired of [false, true]) {
  test(`public articles never request the API with ${expired ? 'expired' : 'absent'} session`, async ({
    page,
    context,
  }) => {
    const requests: string[] = []
    await page.route(new RegExp('^https?://[^/]+/api/'), async (route) => {
      requests.push(route.request().url())
      await route.abort('connectionfailed')
    })
    if (expired)
      await context.addCookies([
        { name: 'okoscope_session', value: 'expired', url: 'http://127.0.0.1:4173' },
      ])
    await page.goto('/docs/quick-start#secret')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Okoscope Cloud — Quick start' }),
    ).toBeVisible()
    if (!expired) {
      for (const selector of [
        '.docs-header a',
        '.docs-sidebar a',
        '.docs-toc a',
        'main section h2 a',
        'main a[href^="https://"]',
        '.docs-related a',
        'main footer a',
      ]) {
        const link = page.locator(selector).first()
        await link.hover()
        await expect(link).toHaveCSS('text-decoration-line', 'none')
      }
    }
    await page.reload()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Okoscope Cloud — Quick start' }),
    ).toBeVisible()
    await page.getByLabel('Language').selectOption('ru')
    await expect(page).toHaveURL(/\/docs\/quick-start#secret$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Okoscope Cloud — Быстрый старт' }),
    ).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Язык')).toHaveValue('ru')
    expect(requests).toEqual([])
  })
}

test('documentation language selector is visually compact and remains accessible', async ({
  page,
}) => {
  await page.goto('/docs/quick-start')
  const header = page.locator('.docs-header')
  const select = header.getByRole('combobox', { name: 'Language' })
  await expect(header.locator('label > span')).toHaveCount(0)
  await expect(select).toHaveAccessibleName('Language')
  await expect(select).toHaveValue('en')
  await expect(select.locator('option:checked')).toHaveText('English')

  await select.selectOption('ru')
  const russianSelect = header.getByRole('combobox', { name: 'Язык' })
  await expect(header.locator('label > span')).toHaveCount(0)
  await expect(russianSelect).toHaveAccessibleName('Язык')
  await expect(russianSelect).toHaveValue('ru')
  await expect(russianSelect.locator('option:checked')).toHaveText('Русский')
  await page.reload()
  await expect(header.getByRole('combobox', { name: 'Язык' })).toHaveValue('ru')

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(header.locator('label > span')).toHaveCount(0)
  await expect(header.getByRole('combobox', { name: 'Язык' })).toHaveAccessibleName('Язык')
  await header.getByRole('combobox', { name: 'Язык' }).selectOption('en')
  await expect(header.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
  await expect(
    header.getByRole('combobox', { name: 'Language' }).locator('option:checked'),
  ).toHaveText('English')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('overview offers separate Cloud and Self-hosted journeys with preserved routes', async ({
  page,
}) => {
  for (const locale of ['en', 'ru'] as const) {
    await page.goto('/docs')
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const links = page.locator('.docs-related')
    const cloud = links.getByRole('link', { name: /Okoscope Cloud/ })
    await expect(cloud).toHaveAttribute('href', '/docs/quick-start')
    await cloud.click()
    await expect(page.locator('main h1')).toContainText('Okoscope Cloud')
    const command = page.locator('section[aria-labelledby="deploy"] pre code')
    await expect(command).toContainText('--set server.endpoint=https://grpc.okoscope.com:443')
    await expect(command).not.toContainText('server.caSecret')
    await expect(command).not.toContainText('database')
    await expect(
      page.locator('main a[href="https://okoscope.com/onboarding"]').first(),
    ).toBeVisible()
    await page
      .locator('.docs-related')
      .getByRole('link', { name: /Self-hosted/ })
      .click()
    await expect(page).toHaveURL(/\/docs\/self-hosting$/)
    await expect(page.locator('main h1')).toContainText('Self-hosted')
    await page.locator('.docs-toc a[href="#connect-agents"]').click()
    await expect(page).toHaveURL(/\/docs\/self-hosting#connect-agents$/)
    await expect(page.locator('#connect-agents')).toBeVisible()
    await expect(page.locator('section[aria-labelledby="values-agent"] pre code')).toContainText(
      'endpoint: https://agents.example.com:443',
    )
  }
})

test('Cloud explains the version placeholder without requiring server configuration in both languages', async ({
  page,
}) => {
  await page.goto('/docs/quick-start')
  await expect(
    page.getByText(
      '<OKOSCOPE_VERSION> is a placeholder, not an environment variable. Replace it with the version from the wizard and use your cluster and workload values. Prefer copying the complete generated command. If Cloud configuration is unavailable, contact the Okoscope operator.',
      { exact: true },
    ),
  ).toBeVisible()
  const englishArticle = page.locator('main')
  for (const value of [
    'agentInstallation.publicGrpcEndpoint',
    'chartReference',
    'chartVersion',
    'recommendedAgentVersion',
    'minimumAgentVersion',
  ])
    await expect(englishArticle).not.toContainText(value)

  await page.getByLabel('Language').selectOption('ru')
  await expect(
    page.getByText(
      '<OKOSCOPE_VERSION> — заполнитель, а не переменная окружения. Замените его версией из мастера и укажите свои значения кластера и нагрузки. Удобнее скопировать готовую команду целиком. Если конфигурация Cloud недоступна, обратитесь к оператору Okoscope.',
      { exact: true },
    ),
  ).toBeVisible()
  const russianArticle = page.locator('main')
  for (const value of [
    'agentInstallation.publicGrpcEndpoint',
    'chartReference',
    'chartVersion',
    'recommendedAgentVersion',
    'minimumAgentVersion',
  ])
    await expect(russianArticle).not.toContainText(value)
})

test('how it works presents the responsive architecture diagram in the selected language', async ({
  page,
}) => {
  const expected = {
    en: {
      source: '/documentation/architecture-birds-eye.en.svg',
      alt: 'Bird’s-eye architecture diagram showing runtime data flowing from the Okoscope node agent through the server and PostgreSQL to the web interface.',
    },
    ru: {
      source: '/documentation/architecture-birds-eye.ru.svg',
      alt: 'Архитектурная диаграмма: поток данных среды выполнения проходит от агента Okoscope на узле через сервер и PostgreSQL к веб-интерфейсу.',
    },
  } as const

  await page.goto('/docs/how-it-works')
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    for (const locale of ['en', 'ru'] as const) {
      await page.getByLabel(/Language|Язык/).selectOption(locale)
      const diagram = page.locator('section[aria-labelledby="flow"] .docs-diagram img')
      await expect(diagram).toHaveCount(1)
      await expect(diagram).toHaveAttribute('src', expected[locale].source)
      await expect(diagram).toHaveAttribute('alt', expected[locale].alt)
      await expect(diagram).toBeVisible()
      await expect
        .poll(() => diagram.evaluate((element) => (element as HTMLImageElement).complete))
        .toBe(true)
      const dimensions = await diagram.evaluate((element) => {
        if (!(element instanceof HTMLImageElement)) throw new Error('Expected an image element')
        return {
          complete: element.complete,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          renderedWidth: element.getBoundingClientRect().width,
          renderedHeight: element.getBoundingClientRect().height,
        }
      })
      expect(dimensions.complete).toBe(true)
      expect(dimensions.naturalWidth).toBe(1600)
      expect(dimensions.naturalHeight).toBe(900)
      expect(dimensions.renderedWidth / dimensions.renderedHeight).toBeCloseTo(16 / 9, 2)
      expect(dimensions.renderedWidth).toBeLessThanOrEqual(viewport.width)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('overview explains the evidence drill-down with synchronized concrete copy', async ({
  page,
}) => {
  const copy = {
    en: {
      current:
        'Okoscope watches the workloads you select, using an eBPF agent that runs on your cluster nodes. When something looks off — a process you did not expect, a connection to a new destination, unfamiliar file activity, a container that keeps restarting — you start by picking an Application and a time window, and then open the events behind whatever the page is showing you.',
      removed: 'Start with an application and time window, then open the supporting observations.',
      otherLocale:
        'начните с выбора приложения и временного интервала, а затем откройте события, на которых построено то, что вы видите.',
    },
    ru: {
      current:
        'Okoscope наблюдает за теми нагрузками, которые вы выбрали: на узлах кластера для этого работает агент eBPF. Если что-то выглядит странно — незнакомый процесс, соединение с новым адресом, непонятная активность с файлами, постоянно перезапускающийся контейнер, — начните с выбора приложения и временного интервала, а затем откройте события, на которых построено то, что вы видите.',
      removed:
        'Начните с приложения и временного интервала, затем откройте подтверждающие наблюдения.',
      otherLocale:
        'you start by picking an Application and a time window, and then open the events behind whatever the page is showing you.',
    },
  } as const

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/docs/overview')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const paragraph = page.locator('section[aria-labelledby="purpose"] p').first()
    await expect(paragraph).toHaveText(copy[locale].current)
    await expect(paragraph).not.toContainText(copy[locale].removed)
    await expect(paragraph).not.toContainText(copy[locale].otherLocale)
    const brand = paragraph.locator('strong.docs-brand-text')
    await expect(brand).toHaveCount(1)
    await expect(brand).toHaveText('Okoscope')
    await expect(brand).toHaveCSS('font-weight', '700')
    await expect(brand).toHaveCSS('color', 'rgb(103, 232, 249)')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('every visible documentation Okoscope name uses semantic readable brand styling', async ({
  page,
}) => {
  for (const [slug, en, ru] of titles) {
    await page.goto(`/docs/${slug}`)
    for (const [locale, title, documentation] of [
      ['en', en, 'Documentation'],
      ['ru', ru, 'Документация'],
    ] as const) {
      await page.getByLabel(/Language|Язык/).selectOption(locale)
      await expect(page).toHaveURL(new RegExp(`/docs/${slug}$`))
      await expect(page).toHaveTitle(`${title} · ${documentation} · Okoscope`)
      await verifyRenderedBrandNames(page)

      const logo = page.locator('.docs-header .brand-link')
      await expect(logo).toHaveAttribute('aria-label', 'OKOSCOPE')
      await expect(logo).toContainText('OKOSCOPE')
      await expect(logo.locator('.docs-brand-text')).toHaveCount(0)
      await expect(page.locator('.docs-code .docs-brand-text')).toHaveCount(0)
      for (const href of await page
        .locator('.docs-shell a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
        expect(href).not.toContain('<')
        expect(href).not.toContain('>')
      }
    }
  }
})

test('documentation safely links every allowlisted repository reference', async ({ page }) => {
  const targets = {} as const

  await page.setViewportSize({ width: 360, height: 800 })
  for (const [slug] of titles) {
    await page.goto(`/docs/${slug}`)
    for (const locale of ['en', 'ru'] as const) {
      await page.getByLabel(/Language|Язык/).selectOption(locale)
      const prose = page.locator('main section p')
      const links = prose.locator('a[href^="https://github.com/okoscope/okoscope"]')
      const expected: Record<string, number> = {}
      await expect(links).toHaveCount(
        Object.values(expected).reduce((sum, count) => sum + count, 0),
      )

      const actualCounts: Record<string, number> = {}
      for (const link of await links.all()) {
        const text = await link.textContent()
        expect(text).not.toBeNull()
        expect(Object.keys(targets)).toContain(text!)
        await expect(link).toHaveAttribute('href', targets[text! as keyof typeof targets])
        await expect(link).toHaveAccessibleName(text!)
        expect(await link.locator('a').count()).toBe(0)
        actualCounts[text!] = (actualCounts[text!] ?? 0) + 1
        await link.focus()
        await expect(link).toBeFocused()
        await expect(link).toHaveCSS('outline-style', 'solid')
        await expect(link).toHaveCSS('outline-width', '2px')
      }
      expect(actualCounts).toEqual(expected)

      const bareReferences = await prose.evaluateAll((paragraphs, entries) => {
        const invalid: string[] = []
        const sortedEntries = (entries as [string, string][]).sort(
          ([left], [right]) => right.length - left.length,
        )
        if (sortedEntries.length === 0) return invalid
        const pattern = new RegExp(
          sortedEntries.map(([token]) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
          'g',
        )
        for (const paragraph of paragraphs) {
          const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
          let node = walker.nextNode()
          while (node) {
            for (const match of node.nodeValue?.matchAll(pattern) ?? []) {
              const token = match[0]
              const href = sortedEntries.find(([candidate]) => candidate === token)![1]
              const anchor = node.parentElement?.closest('a')
              if (anchor?.textContent !== token || anchor.href !== href) invalid.push(token)
            }
            node = walker.nextNode()
          }
        }
        return invalid
      }, Object.entries(targets))
      expect(bareReferences).toEqual([])
      await expect(page.locator('.docs-code a')).toHaveCount(0)
      await expect(page.locator('.docs-shell a a')).toHaveCount(0)

      if (slug === 'quick-start' || slug === 'self-hosting') {
        const sources = page.getByRole('link', {
          name:
            locale === 'en'
              ? 'Open Helm chart sources on GitHub'
              : 'Открыть исходники Helm-чартов на GitHub',
        })
        await expect(sources).toHaveAttribute(
          'href',
          'https://github.com/okoscope/okoscope/tree/main/deploy/helm',
        )
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      if (slug === 'quick-start' || slug === 'self-hosting')
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    }
  }
})

test('installation journeys match the secure Helm chart contract in both languages', async ({
  page,
}) => {
  for (const locale of ['en', 'ru'] as const) {
    await page.goto('/docs/quick-start')
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const quickStart = page.locator('main')
    await expect(quickStart).toContainText('oci://ghcr.io/okoscope/charts/okoscope-agent')
    await expect(quickStart).toContainText('okoscope-application-credentials')
    await expect(quickStart).toContainText('credentialSecret.name')
    await expect(quickStart).not.toContainText('server.caSecret.name')
    await expect(quickStart).toContainText('https://grpc.okoscope.com:443')
    await expect(quickStart).not.toContainText('<grpc-host>')
    await expect(
      quickStart.locator('a[href="https://okoscope.com/onboarding"]').first(),
    ).toBeVisible()
    await expect(quickStart).toContainText('imagePullSecrets')
    await expect(quickStart).toContainText('32')
    await expect(quickStart).not.toContainText('postgresql.enabled')
    await expect(quickStart).not.toContainText('deploy/kubernetes')

    await page.goto('/docs/self-hosting')
    const selfHosting = page.locator('main')
    await expect(selfHosting).toContainText('oci://ghcr.io/okoscope/charts/okoscope')
    await expect(selfHosting).toContainText('database.existingSecret')
    await expect(selfHosting).toContainText('database.urlKey')
    await expect(
      selfHosting.locator('section[aria-labelledby="values-agent"] pre code'),
    ).toContainText('caSecret:\n    name: ""')
    await expect(selfHosting.locator('section[aria-labelledby="connect-agents"]')).toContainText(
      locale === 'en'
        ? 'Its endpoint must point to your server.'
        : 'Её endpoint должен указывать на ваш сервер.',
    )
    await expect(selfHosting).toContainText('internalSecret.existingSecret')
    await expect(selfHosting).toContainText('imagePullSecrets')
    await expect(selfHosting).toContainText('helm rollback')
    await expect(selfHosting).toContainText('helm uninstall')
    await expect(selfHosting).toContainText(
      locale === 'en' ? 'Provision PostgreSQL separately.' : 'PostgreSQL подготовьте отдельно.',
    )
    await expect(selfHosting).toContainText(
      locale === 'en'
        ? 'Chart migrations update the database schema; the chart does not provision or delete the database infrastructure.'
        : 'Миграции чарта обновляют схему данных; саму инфраструктуру базы чарт не создаёт и не удаляет.',
    )
    await expect(selfHosting).not.toContainText('postgresql.enabled')
    await expect(selfHosting).not.toContainText('deploy/kubernetes/common/postgres.yaml')
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('quick start and agent reference explain onboarding identities and selectors', async ({
  page,
}) => {
  const expected = {
    en: {
      quickStart: [
        'Worker nodes section offers a Connect agent button',
        'select the Project and Application',
        'It is saved with the installation and passed to the agent as identity.clusterName',
        'Workload namespace — the namespace containing your Deployment',
        'Labels must match exactly one Deployment in the selected namespace',
        'This is an explanation of the chart defaults, with no editable fields',
      ],
      agent: [
        'TLS endpoint, cluster name, Deployment selector and Application Secret reference',
        'Each entry selects exactly one',
        'clusterName: production',
        'saved installation name passed to the agent',
      ],
    },
    ru: {
      quickStart: [
        'в разделе «Рабочие узлы» доступна кнопка «Подключить агента»',
        'с выбором проекта и приложения',
        'Оно сохраняется в установке и передаётся агенту как identity.clusterName',
        '«Namespace нагрузки» — пространство имён, в котором находится Deployment',
        'Метки должны выбирать ровно один Deployment в указанном пространстве имён',
        'Это описание настроек чарта по умолчанию, без редактируемых полей',
      ],
      agent: [
        'TLS endpoint, название кластера, селектор Deployment и ссылку на Secret приложения',
        'Каждый выбирает ровно один',
        'clusterName: production',
        'сохранённое имя, передаваемое агенту',
      ],
    },
  } as const

  for (const locale of ['en', 'ru'] as const) {
    await page.goto('/docs/quick-start')
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    for (const statement of expected[locale].quickStart)
      await expect(page.locator('main')).toContainText(statement)

    await page.goto('/docs/self-hosting#values-agent')
    for (const statement of expected[locale].agent)
      await expect(page.locator('main')).toContainText(statement)
  }
})

test('self-hosting documents exact per-installation browser Origins in both languages', async ({
  page,
}) => {
  const expected = {
    en: {
      managedTls:
        'The chart trusts its Web ingress Origin automatically: HTTPS when a TLS Secret is configured',
      managedPlaintext: 'otherwise HTTP',
      external: 'For another proxy or browser address, add its exact Origin to server.corsOrigins',
      exact: 'scheme, host and optional port',
      invalid: 'without a path, query, fragment, wildcard or trailing slash',
      empty: 'corsOrigins: []',
      valuesComment: 'https with tlsSecret, otherwise http; add exact external Origins',
    },
    ru: {
      managedTls:
        'Чарт автоматически доверяет Origin своего Web ingress: HTTPS при заданном TLS Secret',
      managedPlaintext: 'иначе HTTP',
      external:
        'Для другого прокси или адреса браузера добавьте точный Origin в server.corsOrigins',
      exact: 'схему, хост и при необходимости порт',
      invalid: 'без пути, query-параметров, fragment, wildcard и завершающего слеша',
      empty: 'corsOrigins: []',
      valuesComment: 'https с tlsSecret, иначе http; добавьте точные внешние Origins',
    },
  } as const

  await page.goto('/docs/self-hosting')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const article = page.locator('main')
    for (const statement of Object.values(expected[locale]))
      await expect(article).toContainText(statement)
    await expect(article).toContainText('corsOrigins: []')
    await expect(article).not.toContainText('okoscope.com')
  }
})

test('troubleshooting identifies untrusted Origin failures without implying GET failure', async ({
  page,
}) => {
  const expected = {
    en: {
      symptom:
        'logout or a state-changing POST or PUT fails with untrusted_origin while pages and GET requests still work',
      managedTls:
        'A chart-managed ingress trusts the derived Origin automatically — https with ingress.web.tlsSecret',
      managedPlaintext: 'otherwise http',
      external:
        'external ingress and alternate browser addresses must appear in server.corsOrigins.',
      exact:
        'Match the scheme, host and non-default port, and remove any wildcard, path, query, fragment or trailing slash.',
    },
    ru: {
      symptom:
        'logout или изменяющий состояние POST либо PUT завершается ошибкой untrusted_origin, хотя страницы и GET-запросы работают',
      managedTls:
        'Ingress, созданный чартом, автоматически доверяет выведенному Origin — https с ingress.web.tlsSecret',
      managedPlaintext: 'иначе http',
      external:
        'внешний ingress и альтернативные адреса браузера нужно перечислить в server.corsOrigins.',
      exact:
        'Проверьте scheme, host и нестандартный порт и удалите wildcard, путь, query-параметры, fragment и завершающий слеш.',
    },
  } as const

  await page.goto('/docs/troubleshooting')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const article = page.locator('main')
    for (const statement of Object.values(expected[locale]))
      await expect(article).toContainText(statement)
    await expect(article).not.toContainText('okoscope.com')
  }
})

test('chart values are copyable localized files with intact shell continuations', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  for (const locale of ['en', 'ru'] as const) {
    await page.goto('/docs/self-hosting')
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    for (const [id, required] of [
      ['values-server', 'database:'],
      ['values-agent', 'workloads:'],
    ] as const) {
      const block = page.locator(`section[aria-labelledby="${id}"] .docs-code`)
      const code = block.locator('code')
      const text = (await code.textContent()) ?? ''
      expect(text.startsWith('# values.yaml')).toBe(true)
      expect(text).toContain('helm upgrade --install')
      expect(/[А-Яа-яЁё]/.test(text)).toBe(locale === 'ru')
      expect(text).toMatch(/ \\\n/)
      expect(text).toMatch(new RegExp(`^${required}$`, 'm'))
      expect(text).not.toMatch(/^\s*(?:tag|digest):\s*["']{2}/m)
      expect(text).not.toMatch(/^\s*resources:\s*\{\}/m)
      if (id === 'values-server') {
        expect(text).toContain('existingSecret: okoscope-database')
        expect(text).toContain('urlKey: database-url')
      } else {
        expect(text).toContain('credentialSecret:')
        expect(text).toContain('name: okoscope-application-credentials')
        expect(text).toContain('key: payment-api')
      }
      const comments = block.locator('.token.comment')
      expect(await comments.count()).toBeGreaterThan(10)
      for (const comment of await comments.all()) {
        await expect(comment).toHaveCSS('color', 'rgb(216, 189, 122)')
        expect((await comment.textContent())?.startsWith('#')).toBe(true)
      }
      await block.getByRole('button').click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
    }
    const installCommand =
      (await page.locator('section[aria-labelledby="rollout"] .docs-code code').textContent()) ?? ''
    expect(installCommand).toContain(' \\\n  oci://ghcr.io/okoscope/charts/okoscope')
  }
})

test('highlighted Bash and YAML preserve exact source through locale changes and copying', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  for (const [slug, id, language, tokenSelector] of [
    ['quick-start', 'deploy', 'bash', '.token.parameter'],
    ['self-hosting', 'values-server', 'yaml', '.token.key, .token.atrule'],
  ] as const) {
    const source = articles
      .find((article) => article.slug === slug)
      ?.sections.find((section) => section.id === id)?.code
    if (!source) throw new Error(`Missing ${slug}/${id} example`)
    await page.goto(`/docs/${slug}`)
    for (const locale of ['en', 'ru', 'en'] as const) {
      await page.getByLabel(/Language|Язык/).selectOption(locale)
      const block = page.locator(`section[aria-labelledby="${id}"] .docs-code`)
      const code = block.locator(`code.language-${language}`)
      const expected = typeof source === 'string' ? source : source[locale]
      await expect(code).toHaveText(expected, { useInnerText: false })
      expect(await code.textContent()).toBe(expected)
      expect(await code.locator(tokenSelector).count()).toBeGreaterThan(0)
      await expect(code.locator(tokenSelector).first()).toHaveCSS(
        'color',
        language === 'bash' ? 'rgb(255, 205, 145)' : 'rgb(134, 217, 247)',
      )
      await expect(block.locator('.docs-code-language')).toHaveText(
        language === 'bash' ? 'Bash' : 'YAML',
      )
      await block
        .getByRole('button', { name: locale === 'en' ? 'Copy example' : 'Копировать пример' })
        .click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
      await expect(block.getByRole('status')).toHaveText(
        locale === 'en' ? 'Copied.' : 'Скопировано.',
      )
      await block.locator('pre').focus()
      await expect(block.locator('pre')).toBeFocused()
    }
  }
})

test('capability sections carry decorative icons without changing their names', async ({
  page,
}) => {
  const sections = ['processes', 'network', 'files', 'review'] as const
  for (const locale of ['en', 'ru'] as const) {
    await page.goto('/docs/capabilities')
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    await expect(page.locator('main .docs-section-icon')).toHaveCount(sections.length)
    for (const id of sections) {
      const heading = page.locator(`section[aria-labelledby="${id}"] h2`)
      const icon = heading.locator('svg.docs-section-icon')
      await expect(icon).toHaveCount(1)
      await expect(icon).toHaveAttribute('aria-hidden', 'true')
      await expect(icon).toHaveCSS('color', 'rgb(130, 214, 229)')
      const link = heading.locator('a')
      await expect(link).toHaveAccessibleName((await link.textContent()) ?? '')
      const [iconBox, linkBox] = await Promise.all([icon.boundingBox(), link.boundingBox()])
      expect(iconBox).not.toBeNull()
      expect(linkBox).not.toBeNull()
      expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(linkBox!.x + 1)
      expect(iconBox!.y).toBeGreaterThanOrEqual(linkBox!.y - 4)
      expect(iconBox!.y + iconBox!.height).toBeLessThanOrEqual(linkBox!.y + 40)
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('operational documentation uses distinct decorative section icons', async ({ page }) => {
  const articlesWithIcons = [
    {
      slug: 'troubleshooting',
      sections: [
        ['connection', 'lucide-unplug', 'The agent does not connect', 'Агент не подключается'],
        [
          'empty',
          'lucide-search-x',
          'No events or missing details',
          'Нет событий или подробностей',
        ],
        [
          'web',
          'lucide-monitor-x',
          'The web interface cannot start',
          'Веб-интерфейс не запускается',
        ],
        ['delivery', 'lucide-bell-off', 'A notification did not arrive', 'Уведомление не пришло'],
      ],
    },
    {
      slug: 'data-and-security',
      sections: [
        [
          'collection',
          'lucide-scan-search',
          'Collected and excluded data',
          'Собираемые и исключённые данные',
        ],
        [
          'permissions',
          'lucide-shield-keyhole',
          'Agent permissions and credentials',
          'Права агента и токены',
        ],
        [
          'runtime-retention',
          'lucide-rotate-ccw-clock',
          'Runtime details and numerical history',
          'Подробности событий и числовая история',
        ],
        [
          'notification-retention',
          'lucide-bell-ring',
          'Notification history',
          'История уведомлений',
        ],
      ],
    },
    {
      slug: 'compatibility-and-limits',
      sections: [
        [
          'platform',
          'lucide-server-cog',
          'Supported agent platform',
          'Поддерживаемая платформа агента',
        ],
        [
          'profiles',
          'lucide-gauge',
          'Enablement and resource bounds',
          'Включение функций и ограничения ресурсов',
        ],
        ['evidence', 'lucide-eye-off', 'Evidence boundaries', 'Границы выводов'],
      ],
    },
    {
      slug: 'workflows',
      sections: [
        [
          'new-connection',
          'lucide-network',
          'Investigate a new connection',
          'Исследуйте новое соединение',
        ],
        ['policies', 'lucide-scroll-text', 'Work with Policies', 'Работа с политиками'],
        ['release', 'lucide-git-compare-arrows', 'Compare releases', 'Сравните релизы'],
        ['restarts', 'lucide-rotate-ccw', 'Explain a restart', 'Разберитесь с перезапуском'],
        [
          'notifications',
          'lucide-bell-check',
          'Configure and verify notifications',
          'Настройте и проверьте уведомления',
        ],
      ],
    },
  ] as const

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport)
    for (const article of articlesWithIcons) {
      await page.goto(`/docs/${article.slug}`)
      for (const [locale, labelIndex] of [
        ['en', 2],
        ['ru', 3],
      ] as const) {
        await page.getByLabel(/Language|Язык/).selectOption(locale)
        const contents = page.getByRole('navigation', {
          name: locale === 'en' ? 'On this page' : 'На этой странице',
          exact: true,
        })
        await expect(contents.locator('svg.docs-toc-icon')).toHaveCount(article.sections.length)
        await expect(page.locator('main svg.docs-section-icon')).toHaveCount(
          article.sections.length,
        )

        const tocIconNames: string[] = []
        const headingIconNames: string[] = []
        for (const section of article.sections) {
          const [id, iconClass] = section
          const expectedLabel = section[labelIndex]
          const tocLink = contents.locator(`a[href="#${id}"]`)
          const heading = page.locator(`section[aria-labelledby="${id}"] :is(h2, h3)#${id}`)
          const headingLink = heading.locator(`a[href="#${id}"]`)
          const tocIcon = tocLink.locator('svg.docs-toc-icon')
          const headingIcon = heading.locator('svg.docs-section-icon')

          await expect(tocLink).toHaveAccessibleName(expectedLabel)
          await expect(headingLink).toHaveAccessibleName(expectedLabel)
          await expect(tocIcon).toHaveClass(new RegExp(`(?:^|\\s)${iconClass}(?:\\s|$)`))
          await expect(headingIcon).toHaveClass(new RegExp(`(?:^|\\s)${iconClass}(?:\\s|$)`))
          await expect(tocIcon).toHaveAttribute('aria-hidden', 'true')
          await expect(headingIcon).toHaveAttribute('aria-hidden', 'true')
          await expect(tocIcon).toHaveCSS('color', 'rgb(130, 214, 229)')
          await expect(headingIcon).toHaveCSS('color', 'rgb(130, 214, 229)')

          const [tocBox, headingBox] = await Promise.all([
            tocIcon.boundingBox(),
            headingIcon.boundingBox(),
          ])
          expect(tocBox).not.toBeNull()
          expect(headingBox).not.toBeNull()
          for (const box of [tocBox!, headingBox!]) {
            expect(box.x).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
          }

          tocIconNames.push(
            await tocIcon.evaluate(
              (icon) =>
                [...icon.classList].find(
                  (name) => name.startsWith('lucide-') && name !== 'lucide',
                ) ?? '',
            ),
          )
          headingIconNames.push(
            await headingIcon.evaluate(
              (icon) =>
                [...icon.classList].find(
                  (name) => name.startsWith('lucide-') && name !== 'lucide',
                ) ?? '',
            ),
          )

          await tocLink.click()
          expect(new URL(page.url()).hash).toBe(`#${id}`)
          await expect(heading).toBeVisible()
        }

        expect(new Set(tocIconNames).size).toBe(article.sections.length)
        expect(headingIconNames).toEqual(tocIconNames)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true)
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
      }
    }
  }
})

test('all articles have translated content, stable anchors and accessible desktop structure', async ({
  page,
}) => {
  for (const [slug, en, ru] of titles) {
    await page.goto(`/docs/${slug}`)
    await page.getByLabel(/Language|Язык/).selectOption('en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en)
    await expect(page).toHaveTitle(`${en} · Documentation · Okoscope`)
    if (slug === 'quick-start')
      await verifyActiveArticleStyling(page, 'Okoscope Cloud — Quick start', '.docs-sidebar')
    await expect(page.locator('.docs-header nav > :last-child select')).toHaveAccessibleName(
      'Language',
    )
    const applicationBox = await page
      .locator('.docs-header')
      .getByRole('link', { name: 'Open application' })
      .boundingBox()
    const languageBox = await page.getByLabel('Language').boundingBox()
    expect(applicationBox).not.toBeNull()
    expect(languageBox).not.toBeNull()
    expect(languageBox!.x).toBeGreaterThan(applicationBox!.x + applicationBox!.width)
    const contents = page.getByRole('navigation', { name: 'On this page', exact: true })
    await expect(contents).toBeVisible()
    await verifyContentsCaption(contents, 'On this page')
    const sectionHeadings = page.locator('main section :is(h2, h3)')
    const anchors = await sectionHeadings
      .locator('a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(anchors.length).toBeGreaterThan(1)
    for (const anchor of anchors) await expect(page.locator(`:is(h2, h3)${anchor}`)).toHaveCount(1)
    expect(
      await contents
        .locator('a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual(anchors)
    expect(await contents.locator('a').allTextContents()).toEqual(
      await sectionHeadings.locator('a').allTextContents(),
    )
    if (slug === 'quick-start') await verifyQuickStartSubsection(page, contents, 'en')
    await contents.locator('a').last().click()
    const url = page.url()
    await page.getByLabel('Language').selectOption('ru')
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    if (slug === 'quick-start')
      await verifyActiveArticleStyling(page, 'Okoscope Cloud — Быстрый старт', '.docs-sidebar')
    const russianContents = page.getByRole('navigation', { name: 'На этой странице', exact: true })
    await expect(russianContents).toBeVisible()
    await verifyContentsCaption(russianContents, 'На этой странице')
    expect(
      await russianContents
        .locator('a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual(anchors)
    expect(await russianContents.locator('a').allTextContents()).toEqual(
      await sectionHeadings.locator('a').allTextContents(),
    )
    if (slug === 'quick-start') await verifyQuickStartSubsection(page, russianContents, 'ru')
    await russianContents.locator('a').first().click()
    expect(new URL(page.url()).hash).toBe(anchors[0])
    const related = page.getByRole('navigation', { name: 'Читайте также', exact: true })
    const relatedHeading = await related.getByRole('heading').boundingBox()
    expect(relatedHeading).not.toBeNull()
    for (const card of await related.getByRole('link').all()) {
      const box = await card.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThan(relatedHeading!.y + relatedHeading!.height)
    }
    const headingSize = await related
      .getByRole('heading')
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
    const sectionSize = await page
      .locator('main section h2')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
    expect(headingSize).toBeLessThan(sectionSize)
    for (const paragraph of await page.locator('main p').allTextContents())
      expect(paragraph).toMatch(/[А-Яа-яЁё]/)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('workspace vocabulary is a semantic localized definition list without overflow', async ({
  page,
}) => {
  const expected = {
    en: [
      ['Organization', 'decides who owns the data and who is allowed to see it.'],
      ['Project', 'keeps related Applications together.'],
      ['Application', 'is the component whose runtime behavior you are looking at.'],
      ['Cluster', 'is one Kubernetes installation.'],
      ['Workload', 'is the Deployment inside that Cluster the agent watches.'],
      ['Event', 'is a single thing the agent saw.'],
      ['Runtime group', 'collects the events that describe the same behavior.'],
      ['Inventory', 'lists what was seen: executables, destinations, file paths.'],
      [
        'Release',
        'is a set of deployed images together with how they behaved; it is not a source-code diff.',
      ],
    ],
    ru: [
      ['Организация', 'определяет, кому принадлежат данные и кто может их видеть.'],
      ['Проект', 'держит связанные приложения вместе.'],
      ['Приложение', 'компонент, поведение которого вы изучаете.'],
      ['Кластер', 'одна установка Kubernetes.'],
      ['Рабочая нагрузка', 'тот Deployment внутри кластера, за которым наблюдает агент.'],
      ['Событие', 'одно наблюдение, которое зафиксировал агент.'],
      ['Группа событий', 'собирает события, описывающие одно и то же поведение.'],
      [
        'Инвентаризация',
        'перечисляет увиденное: исполняемые файлы, сетевые адреса, пути к файлам.',
      ],
      [
        'Релиз',
        'набор развёрнутых образов вместе с тем, как они себя вели; это не сравнение исходного кода.',
      ],
    ],
  } as const

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/docs/overview')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const list = page.locator('section[aria-labelledby="vocabulary"] ul.docs-definitions')
    await expect(list).toHaveCount(1)
    await expect(list).toHaveCSS('list-style-type', 'none')
    const items = list.getByRole('listitem')
    await expect(items).toHaveCount(9)
    for (const [index, [term, description]] of expected[locale].entries()) {
      const item = items.nth(index)
      await expect(item).toHaveCSS('display', 'list-item')
      await expect(item).toHaveCSS('list-style-type', 'none')
      await expect(item.locator('strong')).toHaveCount(1)
      await expect(item.locator('strong')).toHaveText(term)
      await expect(item).toHaveText(`${term} ${description}`)
      const text = await item.textContent()
      expect(text?.match(/—/g)).toBeNull()
      const marker = await item.evaluate((element) =>
        getComputedStyle(element, '::before').content.replace(/["']/g, ''),
      )
      expect(marker).toBe('—\u00a0')
      expect(marker.match(/—/g)).toHaveLength(1)
      const box = await item.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(360)
    }
    if (locale === 'ru') {
      const terms = await items.locator('strong').allTextContents()
      expect(terms.every((term) => term[0] === term[0]?.toLocaleUpperCase('ru'))).toBe(true)
      await expect(list.getByText('рабочая нагрузка', { exact: true })).toHaveCount(0)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('Policies workflow is an accurate nested subsection with stable localized navigation', async ({
  page,
}) => {
  const expected = {
    en: [
      'Policies mark observed Application behavior as expected or as something that needs review. They do not block processes or connections, they do not change the lifecycle of findings, and they never delete evidence. To create one you have to be signed in with access to the Application, and you have to start from a retained Runtime Group or inventory observation that can seed a policy.',
      'Open the Runtime Group or the inventory observation and choose Create policy from observation. Give it a name, check the placement scope shown in the dialog, and select Preview impact — the preview is required before anything is created. It tells you how many groups and sightings would be affected, and how many of them would come out expected or requiring review. If the observation cannot seed a policy at all, the dialog says so instead of creating one.',
      'After creating it, open Managed policies from the Application. There you see the current revision, what it affects inside and outside its scope, and the revision history; Enable and Disable switch it on and off. The current interface has no edit action for an existing policy revision. While results are being recomputed, observations show Evaluating policy; when that finishes, check the effective verdict in Runtime Groups or Inventory, and use the verdict and evaluation filters to find the behavior it touched.',
    ],
    ru: [
      'Политики помечают наблюдаемое поведение приложения как ожидаемое или как требующее проверки. Они не блокируют процессы и соединения, не меняют жизненный цикл находок и никогда не удаляют данные. Чтобы создать политику, нужно войти в систему, иметь доступ к приложению и начать с сохранённой группы событий или записи инвентаризации, из которой политику можно построить.',
      'Откройте группу событий или запись инвентаризации и выберите «Создать политику из наблюдения». Задайте имя, проверьте показанную область действия и нажмите «Предварительный просмотр влияния» — без просмотра политика не создаётся. Он показывает, сколько групп и наблюдений будет затронуто и сколько из них окажутся ожидаемыми, а сколько потребуют проверки. Если из наблюдения политику построить нельзя, диалог сообщит об этом вместо создания.',
      'После создания откройте в приложении «Управляемые политики». Там видны текущая ревизия, её эффекты внутри и вне области действия и история ревизий; кнопки «Включить» и «Отключить» управляют активностью. Редактировать существующую ревизию текущий интерфейс не позволяет. Пока результаты пересчитываются, наблюдения показывают «Вычисление политики»; когда пересчёт закончится, проверьте действующий вердикт в группах событий или инвентаризации, а найти затронутое поведение помогут фильтры по вердикту и вычислению.',
    ],
  } as const

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/docs/workflows#policies')
  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const headingName = locale === 'en' ? 'Work with Policies' : 'Работа с политиками'
    const parentName =
      locale === 'en' ? 'Investigate a new connection' : 'Исследуйте новое соединение'
    const heading = page.getByRole('heading', { level: 3, name: headingName })
    await expect(heading).toHaveAttribute('id', 'policies')
    await expect(page.getByText('Работа с Policies', { exact: true })).toHaveCount(0)
    expect(
      await heading.evaluate(
        (element) =>
          element.parentElement?.previousElementSibling?.querySelector(':scope > h2')?.id,
      ),
    ).toBe('new-connection')

    const toc = page.getByRole('navigation', {
      name: locale === 'en' ? 'On this page' : 'На этой странице',
      exact: true,
    })
    const parentItem = toc.getByRole('link', { name: parentName }).locator('..')
    const nestedLink = toc.getByRole('link', { name: headingName })
    const nestedItem = nestedLink.locator('..')
    const [parentStyle, nestedStyle] = await Promise.all([
      parentItem.evaluate((element) => {
        const style = getComputedStyle(element)
        return { fontSize: style.fontSize, marginLeft: style.marginLeft }
      }),
      nestedItem.evaluate((element) => {
        const style = getComputedStyle(element)
        return { fontSize: style.fontSize, marginLeft: style.marginLeft }
      }),
    ])
    expect(Number.parseFloat(nestedStyle.fontSize)).toBeLessThan(
      Number.parseFloat(parentStyle.fontSize),
    )
    expect(Number.parseFloat(nestedStyle.marginLeft)).toBeGreaterThan(
      Number.parseFloat(parentStyle.marginLeft),
    )
    await nestedLink.click()
    await expect(page).toHaveURL(/\/docs\/workflows#policies$/)
    await page.reload()
    await expect(page).toHaveURL(/\/docs\/workflows#policies$/)
    await expect(page.getByRole('heading', { level: 3, name: headingName })).toBeVisible()
    await expect(page.locator('section[aria-labelledby="policies"] p')).toHaveText(expected[locale])
    await expect(page.locator('section[aria-labelledby="policies"]')).not.toContainText(
      /owner|владел/i,
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})

test('unknown article stays public and both entry links preserve protected access', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/docs/not-a-real-article')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '/docs/not-a-real-article#main-content',
  )
  await expect(page.getByRole('heading', { name: 'Article not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Documentation overview' }).click()
  await expect(page.getByRole('heading', { name: 'Meet Okoscope' })).toBeVisible()
  await page.getByRole('link', { name: 'Open application' }).first().click()
  await expect(
    page.locator('form').getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Documentation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meet Okoscope' })).toBeVisible()
  await page.goto('/docs-private')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '/docs-private#main-content',
  )
  await expect(
    page.locator('form').getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await page.goto('/')
  await authenticate(page)
  await page.getByRole('link', { name: 'Documentation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meet Okoscope' })).toBeVisible()
})

test('global skip link follows SPA location and the selected language', async ({ page }) => {
  await page.goto('/docs/quick-start?source=release#install-agent')

  const englishSkipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(englishSkipLink).toHaveAttribute(
    'href',
    '/docs/quick-start?source=release#main-content',
  )

  await page.getByLabel('Language').selectOption('ru')
  const russianSkipLink = page.getByRole('link', { name: 'Перейти к содержимому' })
  await expect(russianSkipLink).toHaveAttribute(
    'href',
    '/docs/quick-start?source=release#main-content',
  )
  await russianSkipLink.focus()
  await expect(russianSkipLink).toBeFocused()

  await page.getByRole('link', { name: 'Принцип работы', exact: true }).first().click()
  await expect(page).toHaveURL(/\/docs\/how-it-works$/)
  await expect(russianSkipLink).toHaveAttribute('href', '/docs/how-it-works#main-content')

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('mobile navigation is keyboard operable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/docs/quick-start')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Okoscope Cloud — Quick start' }),
  ).toBeVisible()
  await page.keyboard.press('Tab')
  const appSkipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(appSkipLink).toBeFocused()
  await expect(appSkipLink).toHaveAttribute('href', '/docs/quick-start#main-content')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to article' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  const summary = page.locator('.docs-mobile summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.docs-mobile')).toHaveAttribute('open', '')
  await page.keyboard.press('Tab')
  await expect(page.locator('.docs-mobile a').first()).toBeFocused()
  await expect(page.locator('.docs-mobile a').first()).toHaveCSS('outline-style', 'solid')
  await expect(page.locator('.docs-mobile a').first()).toHaveCSS('outline-width', '2px')
  await expect(page.locator('.docs-mobile a')).toHaveCount(articles.length)
  await verifyActiveArticleStyling(page, 'Okoscope Cloud — Quick start', '.docs-mobile')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Meet Okoscope' })).toBeVisible()
  for (const [slug] of titles) {
    await page.goto(`/docs/${slug}`)
    await expect(page.locator('main h1')).toBeVisible()
    await verifyContentsCaption(
      page.getByRole('navigation', { name: 'On this page', exact: true }),
      'On this page',
    )
    const cardBoxes = await page.locator('.docs-related a').evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect()
        return { x: box.x, right: box.right, y: box.y, bottom: box.bottom }
      }),
    )
    expect(cardBoxes.length).toBeGreaterThan(1)
    for (const [index, box] of cardBoxes.entries()) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(360)
      if (index > 0) expect(box.y).toBeGreaterThan(cardBoxes[index - 1]!.bottom)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page.goto('/docs/quick-start')
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByLabel('Язык')).toHaveValue('ru')
  const russianSummary = page.locator('.docs-mobile summary')
  await russianSummary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.docs-mobile')).toHaveAttribute('open', '')
  await verifyActiveArticleStyling(page, 'Okoscope Cloud — Быстрый старт', '.docs-mobile')
  await verifyContentsCaption(
    page.getByRole('navigation', { name: 'На этой странице', exact: true }),
    'На этой странице',
  )
  await expect(page.locator('.docs-header nav > :last-child select')).toHaveAccessibleName('Язык')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

async function verifyContentsCaption(contents: Locator, text: string) {
  const caption = contents.getByText(text, { exact: true })
  await expect(caption).toBeVisible()
  await expect(caption).toHaveCSS('text-align', 'right')
  await expect(caption).toHaveCSS('color', 'rgb(145, 174, 193)')
  const captionSize = await caption.evaluate((element) =>
    parseFloat(getComputedStyle(element).fontSize),
  )
  const linkSize = await contents
    .getByRole('link')
    .first()
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  expect(captionSize).toBeLessThan(linkSize)
  const captionBox = await caption.boundingBox()
  const linksBox = await contents.locator('ul').boundingBox()
  const panelBox = await contents.boundingBox()
  expect(captionBox).not.toBeNull()
  expect(linksBox).not.toBeNull()
  expect(panelBox).not.toBeNull()
  expect(captionBox!.y).toBeGreaterThan(panelBox!.y)
  expect(captionBox!.y - panelBox!.y).toBeLessThan(20)
  expect(captionBox!.x).toBeGreaterThan(panelBox!.x + panelBox!.width / 2)
  expect(linksBox!.y - panelBox!.y).toBeGreaterThanOrEqual(12)
  expect(linksBox!.y - panelBox!.y).toBeLessThan(24)
  const firstLinkBox = await contents.getByRole('link').first().boundingBox()
  expect(firstLinkBox).not.toBeNull()
  expect(firstLinkBox!.y - panelBox!.y).toBeLessThan(30)
  for (const link of await contents.getByRole('link').all()) {
    const box = await link.boundingBox()
    expect(box).not.toBeNull()
    const overlaps =
      box!.x < captionBox!.x + captionBox!.width &&
      box!.x + box!.width > captionBox!.x &&
      box!.y < captionBox!.y + captionBox!.height &&
      box!.y + box!.height > captionBox!.y
    expect(overlaps).toBe(false)
  }
  expect(captionBox!.x + captionBox!.width).toBeLessThan(panelBox!.x + panelBox!.width)
  expect(panelBox!.x + panelBox!.width - captionBox!.x - captionBox!.width).toBeLessThan(24)
}

async function verifyQuickStartSubsection(page: Page, contents: Locator, locale: 'en' | 'ru') {
  const sectionName = locale === 'en' ? 'Create the credential Secret' : 'Создайте Secret с токеном'
  const sectionHeading = page.getByRole('heading', { level: 2, name: sectionName })
  await expect(sectionHeading).toHaveAttribute('id', 'secret')
  await contents.getByRole('link', { name: sectionName }).click()
  expect(new URL(page.url()).hash).toBe('#secret')
}

async function verifyActiveArticleStyling(page: Page, articleName: string, navigation: string) {
  const brand = page.locator('.docs-header .brand-link')
  const currentArticle = page.locator(navigation).getByRole('link', { name: articleName })
  await expect(currentArticle).toHaveAttribute('aria-current', 'page')
  await expect(currentArticle).toHaveCSS('background-color', 'rgb(22, 52, 73)')
  await expect(currentArticle).toHaveCSS('border-left-width', '3px')
  await expect(currentArticle).toHaveCSS('border-left-color', 'rgb(103, 232, 249)')
  await expect(brand).not.toHaveCSS('background-color', 'rgb(22, 52, 73)')
  await expect(brand).toHaveCSS('border-left-width', '0px')
}

async function verifyRenderedBrandNames(page: Page) {
  const shell = page.locator('.docs-shell')
  const occurrences = await shell.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let count = 0
    let node = walker.nextNode()
    while (node) {
      if (!node.parentElement?.closest('.docs-code'))
        count += node.nodeValue?.match(/Okoscope/g)?.length ?? 0
      node = walker.nextNode()
    }
    return count
  })
  const branded = shell.locator('strong.docs-brand-text')
  await expect(branded).toHaveCount(occurrences)
  expect(occurrences).toBeGreaterThan(0)

  const offenders = await shell.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const invalid: string[] = []
    let node = walker.nextNode()
    while (node) {
      if ((node.nodeValue?.match(/Okoscope/g)?.length ?? 0) > 0) {
        const parent = node.parentElement
        if (!parent?.closest('.docs-code') && !parent?.matches('strong.docs-brand-text'))
          invalid.push(parent?.outerHTML ?? '')
      }
      node = walker.nextNode()
    }
    return invalid
  })
  expect(offenders).toEqual([])

  for (const name of await branded.all()) {
    await expect(name).toHaveText('Okoscope')
    const inArticleNavigation = await name.evaluate((element) =>
      Boolean(element.closest('.docs-sidebar, .docs-mobile')),
    )
    await expect(name).toHaveCSS(
      'color',
      inArticleNavigation ? 'rgb(255, 255, 255)' : 'rgb(103, 232, 249)',
    )
    const style = await name.evaluate((element) => {
      const foreground = getComputedStyle(element)
        .color.match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
      let ancestor: Element | null = element
      let background = [0, 0, 0]
      while (ancestor) {
        const value = getComputedStyle(ancestor).backgroundColor
        const channels = value.match(/[\d.]+/g)?.map(Number) ?? []
        if ((channels[3] ?? 1) > 0) {
          background = channels.slice(0, 3)
          break
        }
        ancestor = ancestor.parentElement
      }
      const luminance = (channels: number[]) => {
        const linear = channels.map((channel) => {
          const normalized = channel / 255
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
        })
        return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
      }
      const foregroundLuminance = luminance(foreground)
      const backgroundLuminance = luminance(background)
      return {
        fontWeight: Number.parseInt(getComputedStyle(element).fontWeight, 10),
        contrast:
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
      }
    })
    expect(style.fontWeight).toBeGreaterThanOrEqual(700)
    expect(style.contrast).toBeGreaterThanOrEqual(4.5)
  }
}

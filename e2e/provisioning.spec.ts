import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const org = {
  id: '00000000-0000-4000-8000-000000000101',
  name: 'Acme',
  slug: 'acme',
  created_at: '2026-01-01T00:00:00Z',
}
const project = {
  id: '00000000-0000-4000-8000-000000000102',
  organization_id: org.id,
  name: 'Production',
  slug: 'production',
  created_at: '2026-01-01T00:00:00Z',
}
const app = {
  id: '00000000-0000-4000-8000-000000000103',
  organization_id: org.id,
  project_id: project.id,
  name: 'Payment API',
  slug: 'payment-api',
  created_at: '2026-01-01T00:00:00Z',
}
const installation = {
  id: '00000000-0000-4000-8000-000000000104',
  application_id: app.id,
  credential_id: '00000000-0000-4000-8000-000000000105',
  cluster_name: 'production',
  workload_namespace: 'payments',
  workload_kind: 'Deployment',
  workload_name: 'payment-api',
  workload_labels: null,
  chart_version: '1.2.3',
  configuration_schema_version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}
const token = 'oko_app_v1_e2e_one_time_secret'
const reply = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  })
const build = {
  service_version: '1',
  git_commit: 'test',
  api_version: 'v1',
  required_database_migration: 26,
}
const auth = {
  user: {
    id: 'user',
    email: 'owner@example.com',
    email_verified: true,
    preferred_locale: 'en',
  },
  organization: org,
  role: 'owner',
}

test('first owner setup removes fragment and never persists its secrets', async ({ page }) => {
  let body: Record<string, string> = {}
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/build-info')) return reply(route, build)
    if (path.endsWith('/setup/status')) return reply(route, { state: 'owner_required' })
    if (path.endsWith('/setup/complete')) {
      body = route.request().postDataJSON()
      return reply(
        route,
        { user_id: 'u', organization_id: org.id, project_id: project.id, role: 'owner' },
        201,
      )
    }
    if (path.endsWith('/auth/me')) return reply(route, auth)
    if (path === '/api/v1/projects') return reply(route, { items: [project], next_cursor: null })
    if (path.endsWith('/applications')) return reply(route, { items: [], next_cursor: null })
    return reply(route, {}, 404)
  })
  const setupToken = 's'.repeat(40)
  await page.goto(`/#token=${setupToken}`)
  await expect(page).toHaveURL(/\?window=24h$/)
  await expect(page.getByLabel('One-time setup token')).toHaveValue(setupToken)
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByLabel('Organization name').fill('Acme')
  await page.getByLabel('Initial Project name').fill('Production')
  await page.getByRole('button', { name: 'Create owner and continue' }).click()
  await expect(page).toHaveURL('/onboarding')
  expect(body).toMatchObject({
    setup_token: setupToken,
    organization_slug: 'acme',
    project_slug: 'production',
  })
  expect(await page.evaluate(() => JSON.stringify({ localStorage, sessionStorage }))).not.toContain(
    setupToken,
  )
})

test('setup unavailable can recover to ready login', async ({ page }) => {
  let state = 'setup_unavailable'
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/build-info')) return reply(route, build)
    if (path.endsWith('/setup/status')) return reply(route, { state })
    if (path.endsWith('/auth/me')) return reply(route, {}, 401)
    return reply(route, {}, 404)
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'First-owner setup is unavailable' }),
  ).toBeVisible()
  state = 'ready'
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeVisible()
})

async function mockOnboarding(page: Page, tlsMode: 'system' | 'custom_ca' = 'custom_ca') {
  let items: (typeof installation)[] = []
  let state = 'waiting_for_agent'
  const bodies: unknown[] = []
  await page.route('**/api/v1/**', (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    if (path.endsWith('/build-info')) return reply(route, build)
    if (path.endsWith('/setup/status')) return reply(route, { state: 'ready' })
    if (path.endsWith('/auth/me') || path.endsWith('/auth/login')) return reply(route, auth)
    if (path === '/api/v1/projects') return reply(route, { items: [project], next_cursor: null })
    if (path === `/api/v1/projects/${project.id}/applications`)
      return reply(route, { items: [app], next_cursor: null })
    if (path.endsWith('/agent-installation-metadata'))
      return reply(route, {
        chart_reference: 'oci://registry.example/charts/okoscope-agent',
        chart_version: '1.2.3',
        recommended_agent_version: '1.2.3',
        minimum_agent_version: '1.1.0',
        configuration_schema_version: 1,
        grpc_endpoint: 'https://agents.example:443',
        tls_mode: tlsMode,
        ca_secret_name: tlsMode === 'custom_ca' ? 'okoscope-ca' : null,
        ca_secret_key: tlsMode === 'custom_ca' ? 'ca.crt' : null,
        namespace: 'okoscope-system',
        credential_secret_name: 'okoscope-credentials',
        credential_secret_key: 'payment-api',
        supported_workload_kinds: ['Deployment'],
      })
    const base = `/api/v1/projects/${project.id}/applications/${app.id}`
    if (path === `${base}/installations` && request.method() === 'GET')
      return reply(route, { items })
    if (path === `${base}/installations` && request.method() === 'POST') {
      bodies.push(request.postDataJSON())
      items = [installation]
      return reply(
        route,
        {
          installation,
          credential: {
            id: installation.credential_id,
            token,
            token_hint: 'cret',
            shown_once: true,
          },
          command: {
            chart_reference: 'oci://registry.example/charts/okoscope-agent',
            chart_version: '1.2.3',
            namespace: 'okoscope-system',
            secret_name: 'okoscope-credentials',
            secret_key: 'payment-api',
            grpc_endpoint: 'https://agents.example:443',
            tls_mode: tlsMode,
            ca_secret_name: tlsMode === 'custom_ca' ? 'okoscope-ca' : null,
            ca_secret_key: tlsMode === 'custom_ca' ? 'ca.crt' : null,
          },
        },
        201,
      )
    }
    if (path.endsWith('/replace-credential'))
      return reply(
        route,
        {
          id: 'replacement',
          token: 'oko_app_v1_replacement_secret',
          token_hint: 'ment',
          shown_once: true,
        },
        201,
      )
    if (path === `${base}/installations/${installation.id}`) {
      bodies.push(request.postDataJSON())
      return reply(route, installation)
    }
    if (path.endsWith('/connection-readiness'))
      return reply(route, {
        state,
        reason: null,
        credential_last_used_at: null,
        first_event_at: state === 'receiving_events' ? '2026-01-01T00:00:00Z' : null,
        last_event_at: null,
        reporting_nodes: state === 'waiting_for_agent' ? 0 : 2,
        stale_after_seconds: 300,
      })
    return reply(route, {}, 404)
  })
  return {
    bodies,
    setState: (value: string) => {
      state = value
    },
  }
}

async function selectApplication(page: Page) {
  await page.getByRole('button', { name: /Production/ }).click()
  await page.getByRole('button', { name: /Payment API/ }).click()
}

async function expectDescribedTextbox(page: Page, name: string, description: string) {
  const textbox = page.getByRole('textbox', { name, exact: true })
  await expect(textbox).toBeVisible()
  await expect(textbox).toHaveAccessibleDescription(description)
  await expect(textbox).toHaveAttribute('aria-describedby', /\S+/)
}

async function mockMetadataError(page: Page, code: string, message: string) {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/build-info')) return reply(route, build)
    if (path.endsWith('/setup/status')) return reply(route, { state: 'ready' })
    if (path.endsWith('/auth/me')) return reply(route, auth)
    if (path === '/api/v1/projects') return reply(route, { items: [project], next_cursor: null })
    if (path === `/api/v1/projects/${project.id}/applications`)
      return reply(route, { items: [app], next_cursor: null })
    if (path.endsWith('/agent-installation-metadata'))
      return reply(route, { error: code, message, request_id: 'metadata-request' }, 503)
    const base = `/api/v1/projects/${project.id}/applications/${app.id}`
    if (path === `${base}/installations`) return reply(route, { items: [] })
    return reply(route, {}, 404)
  })
}

test('legacy post-create flow shows only its token and continues in Connect agent', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    if (path.endsWith('/build-info')) return reply(route, build)
    if (path.endsWith('/setup/status')) return reply(route, { state: 'ready' })
    if (path.endsWith('/auth/me')) return reply(route, auth)
    if (path === `/api/v1/projects/${project.id}`) return reply(route, project)
    if (path === '/api/v1/projects') return reply(route, { items: [project], next_cursor: null })
    if (path.endsWith('/runtime-retention'))
      return reply(route, {
        override: null,
        inherited: { enabled: false, raw_days: 30, history_days: 365 },
        effective: { enabled: false, raw_days: 30, history_days: 365 },
        source: 'organization',
      })
    if (path === `/api/v1/projects/${project.id}/applications`) {
      if (request.method() === 'POST')
        return reply(
          route,
          {
            application: app,
            credential: {
              id: 'credential-created',
              name: 'default',
              token,
              token_hint: 'cret',
              created_at: '2026-01-01T00:00:00Z',
              shown_once: true,
            },
          },
          201,
        )
      return reply(route, { items: [], next_cursor: null })
    }
    return reply(route, {}, 404)
  })

  await page.goto(`/projects/${project.id}`)
  await page.getByRole('button', { name: 'Create Application' }).click()
  await page.getByLabel('Name').fill('Payment API')
  await page.getByRole('button', { name: 'Create Application' }).last().click()
  await expect(page.getByText(token, { exact: true })).toBeVisible()
  await expect(page.getByText('Kubernetes Secret')).toHaveCount(0)
  await expect(page.getByText('Agent configuration')).toHaveCount(0)
  await expect(page.getByText(/applicationCredentialFile/)).toHaveCount(0)
  await page.getByRole('link', { name: 'Continue in Connect agent' }).click()
  await expect(page).toHaveURL('/onboarding')
  await expect(page.getByRole('heading', { name: 'Connect your first application' })).toBeVisible()
})

test('missing installation metadata gives localized operator guidance and self-hosting navigation', async ({
  page,
}) => {
  await mockMetadataError(
    page,
    'installation_metadata_unavailable',
    'Agent installation metadata is unavailable.',
  )
  await page.goto('/onboarding')
  await selectApplication(page)
  await expect(
    page.getByText(/Ask the Okoscope operator to configure agentInstallation\.publicGrpcEndpoint/),
  ).toBeVisible()
  const docs = page.getByRole('link', { name: 'Open self-hosting configuration' })
  await expect(docs).toHaveAttribute('href', '/docs/self-hosting')
  await page.getByLabel('Language').selectOption('ru')
  await expect(
    page.getByText(/Попросите оператора Okoscope настроить agentInstallation\.publicGrpcEndpoint/),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('link', { name: 'Открыть настройку self-hosting' }).click()
  await expect(page).toHaveURL('/docs/self-hosting')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Самостоятельное развёртывание' }),
  ).toBeVisible()
})

test('other installation metadata failures do not show operator configuration guidance', async ({
  page,
}) => {
  await mockMetadataError(
    page,
    'service_unavailable',
    'Metadata service is temporarily unavailable.',
  )
  await page.goto('/onboarding')
  await selectApplication(page)
  await expect(page.getByText('Metadata service is temporarily unavailable.')).toBeVisible()
  await expect(page.getByText(/Ask the Okoscope operator to configure/)).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open self-hosting configuration' })).toHaveCount(0)
})

test('installation and revision fields explain their purpose accessibly in both languages', async ({
  page,
}) => {
  await mockOnboarding(page)
  await page.goto('/onboarding')
  await selectApplication(page)

  const expected = {
    en: {
      cluster: {
        name: 'Cluster name',
        help: 'Saved with this installation and passed to the agent as identity.clusterName. The Kubernetes UID remains the authoritative cluster identity.',
      },
      namespace: {
        name: 'Workload namespace',
        help: 'Kubernetes namespace containing the Deployment to observe.',
      },
      deployment: {
        name: 'Deployment name',
        help: 'Exact name of the single Deployment to observe in this namespace.',
      },
      labels: {
        name: 'Labels (key=value, comma separated)',
        help: 'Comma-separated key=value labels that must select one Deployment in this namespace.',
      },
      advanced:
        'No fields are changed here. The chart enables process lifecycle and core network activity; file and experimental observations stay off until configured after connection.',
    },
    ru: {
      cluster: {
        name: 'Название кластера',
        help: 'Сохраняется в установке и передаётся агенту как identity.clusterName. Авторитетным идентификатором кластера остаётся Kubernetes UID.',
      },
      namespace: {
        name: 'Namespace нагрузки',
        help: 'Kubernetes namespace, где находится Deployment для наблюдения.',
      },
      deployment: {
        name: 'Имя Deployment',
        help: 'Точное имя единственного Deployment для наблюдения в этом namespace.',
      },
      labels: {
        name: 'Метки (key=value через запятую)',
        help: 'Метки key=value через запятую, которые должны выбрать один Deployment в этом namespace.',
      },
      advanced:
        'В этом блоке нет изменяемых полей. Chart включает жизненный цикл процессов и основную сетевую активность; наблюдение файлов и экспериментальные функции остаются выключенными до настройки после подключения.',
    },
  } as const

  for (const locale of ['en', 'ru'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const copy = expected[locale]
    await expectDescribedTextbox(page, copy.cluster.name, copy.cluster.help)
    await expectDescribedTextbox(page, copy.namespace.name, copy.namespace.help)
    await expectDescribedTextbox(page, copy.deployment.name, copy.deployment.help)
    await page
      .getByRole('button', { name: locale === 'en' ? 'Label selector' : 'Селектор меток' })
      .click()
    await expectDescribedTextbox(page, copy.labels.name, copy.labels.help)
    await page
      .getByRole('button', { name: locale === 'en' ? 'Deployment name' : 'Имя Deployment' })
      .click()
    const disclosure = page.locator('details')
    await disclosure.locator('summary').click()
    await expect(disclosure).toContainText(copy.advanced)
    await expect(disclosure.getByRole('textbox')).toHaveCount(0)
    await disclosure.locator('summary').click()
  }

  await page.getByRole('button', { name: 'Создать установку' }).click()
  await page.reload()
  await selectApplication(page)
  await page.getByRole('button', { name: 'Изменить селектор нагрузки' }).click()

  for (const locale of ['ru', 'en'] as const) {
    await page.getByLabel(/Language|Язык/).selectOption(locale)
    const copy = expected[locale]
    await expectDescribedTextbox(page, copy.cluster.name, copy.cluster.help)
    await expectDescribedTextbox(page, copy.namespace.name, copy.namespace.help)
    await expectDescribedTextbox(page, copy.deployment.name, copy.deployment.help)
    await page
      .getByRole('button', { name: locale === 'en' ? 'Label selector' : 'Селектор меток' })
      .click()
    await expectDescribedTextbox(page, copy.labels.name, copy.labels.help)
    await page
      .getByRole('button', { name: locale === 'en' ? 'Deployment name' : 'Имя Deployment' })
      .click()
  }

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('owner gets secret-safe commands, resume/replacement/revision and every readiness state', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const model = await mockOnboarding(page)
  await page.goto('/onboarding')
  await selectApplication(page)
  await page.getByRole('textbox', { name: /^Workload namespace/ }).fill('payments')
  await page.getByText('Advanced observation settings').click()
  await expect(page.getByText('Process lifecycle and core network activity')).toBeVisible()
  await page.getByRole('button', { name: 'Create installation' }).click()
  await expect(page.getByText(token, { exact: true })).toBeVisible()
  const commands = (await page.locator('pre').allTextContents()).slice(1).join('\n')
  await expect(page.locator('pre')).toHaveCount(3)
  const commandBlocks = page.locator('.docs-code')
  await expect(commandBlocks).toHaveCount(2)
  for (const block of await commandBlocks.all()) {
    await expect(block.locator('code')).toHaveClass('language-bash')
    expect(await block.locator('.token').count()).toBeGreaterThan(0)
    const source = await block.locator('code').innerText()
    expect(source).not.toContain(token)
    const copy = block.getByRole('button', { name: 'Copy command', exact: true })
    await copy.focus()
    await page.keyboard.press('Enter')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source)
    await expect(block.getByRole('status')).toHaveText('Command copied.')
    await page.keyboard.press('Tab')
    await expect(block.locator('pre')).toBeFocused()
  }
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.setViewportSize({ width: 1280, height: 720 })
  const installGuide = page.getByRole('link', { name: 'Installation guide', exact: true })
  await expect(installGuide).toHaveAttribute('href', '/docs/quick-start#deploy')
  await expect(installGuide).toHaveAttribute('target', '_blank')
  await expect(installGuide).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByText(/For a separate installation in another namespace/)).toBeVisible()
  const guideOpened = page.waitForEvent('popup')
  await installGuide.click()
  const guidePage = await guideOpened
  await expect(guidePage).toHaveURL(/\/docs\/quick-start#deploy$/)
  await expect(
    guidePage.getByRole('heading', { name: 'Install the agent', exact: true }),
  ).toBeVisible()
  await expect(page).toHaveURL('/onboarding')
  await expect(page.getByText(token, { exact: true })).toBeVisible()
  expect((await page.locator('pre').allTextContents()).slice(1).join('\n')).toBe(commands)
  await guidePage.close()
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByText(/Для отдельной установки в другом namespace/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Инструкция по установке', exact: true }),
  ).toHaveAttribute('href', '/docs/quick-start#deploy')
  await page.getByLabel('Язык').selectOption('en')
  expect(commands).toContain("--version '1.2.3'")
  expect(commands).toContain("server.caSecret.name='okoscope-ca'")
  expect(commands).toContain("server.caSecret.key='ca.crt'")
  expect(commands).not.toContain(token)
  expect(commands).not.toContain('-----BEGIN CERTIFICATE-----')
  expect(JSON.stringify(model.bodies)).not.toContain(token)
  expect(await page.evaluate(() => JSON.stringify({ localStorage, sessionStorage }))).not.toContain(
    token,
  )
  for (const [state, heading] of [
    ['credential_created', 'Credential created'],
    ['agent_authenticated', 'Agent authenticated'],
    ['workload_not_matched', 'Workload not matched'],
    ['permission_denied', 'Kubernetes permission denied'],
    ['kernel_unsupported', 'Kernel support unavailable'],
    ['waiting_for_event', 'Connected — waiting for first event'],
    ['stale', 'Agent reporting is stale'],
    ['credential_revoked', 'Credential revoked'],
    ['receiving_events', 'Receiving runtime events'],
  ] as const) {
    model.setState(state)
    await page.reload()
    await selectApplication(page)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Open application' }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/applications/${app.id}`)
  await page.goto('/onboarding')
  await selectApplication(page)
  await page.getByRole('button', { name: 'Replace lost credential' }).click()
  await expect(page.getByText('oko_app_v1_replacement_secret')).toBeVisible()
  await page.reload()
  await selectApplication(page)
  await expect(page.getByText('cannot be shown again')).toBeVisible()
  await page.getByRole('button', { name: 'Revise workload selector' }).click()
  await page.getByRole('button', { name: 'Label selector' }).click()
  await page.getByLabel(/Labels/).fill('app=payment-api,tier=backend')
  await page.getByRole('button', { name: 'Save' }).click()
  expect(model.bodies.at(-1)).toMatchObject({
    workload: { labels: { app: 'payment-api', tier: 'backend' } },
  })
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('heading', { name: 'Продолжить установку агента' })).toBeVisible()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('system TLS omits custom CA guidance and Helm values', async ({ page }) => {
  await mockOnboarding(page, 'system')
  await page.goto('/onboarding')
  await selectApplication(page)
  await page.getByRole('textbox', { name: /^Workload namespace/ }).fill('payments')
  await page.getByRole('button', { name: 'Create installation' }).click()
  const commands = (await page.locator('pre').allTextContents()).slice(1).join('\n')
  expect(commands).not.toContain('server.caSecret.name')
  expect(commands).not.toContain('server.caSecret.key')
  await expect(page.getByText(/existing CA Secret/)).toHaveCount(0)
})

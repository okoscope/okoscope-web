import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'

const password = 'correct horse battery staple'
const trustedOrigin = { Origin: 'http://127.0.0.1:4181' }

test('groups affected behavior by Application and preserves occurrence commands', async ({
  page,
}) => {
  const setup = await page.request.post('/api/v1/setup/complete', {
    data: {
      setup_token: 'group-same-events-setup-token-1234567890',
      email: 'owner@example.test',
      password,
      display_name: 'Owner',
      locale: 'en',
    },
  })
  expect(setup.ok(), await setup.text()).toBe(true)
  const organizationResponse = await page.request.post('/api/v1/platform/organizations', {
    headers: trustedOrigin,
    data: { name: 'Real E2E', slug: 'real-e2e', ownership: { kind: 'self_owner' } },
  })
  expect(organizationResponse.ok(), await organizationResponse.text()).toBe(true)
  const { organization } = await organizationResponse.json()
  const projectResponse = await page.request.post(
    `/api/v1/organizations/${organization.id}/projects`,
    {
      headers: trustedOrigin,
      data: { name: 'Platform', slug: 'platform' },
    },
  )
  const project = await projectResponse.json()
  const applicationResponse = await page.request.post(
    `/api/v1/projects/${project.id}/applications`,
    {
      headers: trustedOrigin,
      data: { name: 'Gateway', slug: 'gateway' },
    },
  )
  const { application } = await applicationResponse.json()
  execFileSync(
    'cargo',
    ['run', '-q', '-p', 'server', '--example', 'group_same_events_e2e_fixture'],
    {
      cwd: '/Users/ihippik/okoscope/okoscope',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres@127.0.0.1:55441/postgres?sslmode=disable',
        ORGANIZATION_ID: organization.id,
        PROJECT_ID: project.id,
        APPLICATION_ID: application.id,
      },
    },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Open Organization' }).click()

  for (const kind of ['destination', 'domain', 'syscall', 'file_activity']) {
    const response = await page.request.get(
      `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=${kind}`,
    )
    expect(response.ok(), await response.text()).toBe(true)
    const inventory = await response.json()
    expect(inventory.items).toHaveLength(1)
    expect(inventory.items[0].occurrence_count).toBe(2)
    expect(inventory.items[0].semantic_summary).not.toHaveProperty('process_command')

    const seedResponse = await page.request.get(
      `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory/${inventory.items[0].id}/policy-seed`,
    )
    expect(seedResponse.ok(), await seedResponse.text()).toBe(true)
    const seed = await seedResponse.json()
    expect(seed.state).toBe('available')
    expect(seed.seed.behavior.matcher).not.toHaveProperty('process_command')
    if (kind === 'destination') {
      const revision = {
        source_inventory_item_id: inventory.items[0].id,
        placement: {},
        inside_effect: 'expected',
      }
      const preview = await page.request.post(
        `/api/v1/projects/${project.id}/applications/${application.id}/policies/preview`,
        { headers: trustedOrigin, data: revision },
      )
      expect(preview.ok(), await preview.text()).toBe(true)
      const created = await page.request.post(
        `/api/v1/projects/${project.id}/applications/${application.id}/policies`,
        {
          headers: { ...trustedOrigin, 'Idempotency-Key': crypto.randomUUID() },
          data: { name: 'Shared PostgreSQL policy', revision },
        },
      )
      expect(created.ok(), await created.text()).toBe(true)
    }

    await page.goto(
      `/projects/${project.id}/applications/${application.id}/runtime-inventory/${inventory.items[0].id}?evidence=occurrences`,
    )
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Process command')).toHaveCount(2)
    await expect(page.getByText('r-api', { exact: true })).toBeVisible()
    await expect(page.getByText('actix-rt|system', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('r-api', { exact: true })).toBeVisible()
    await expect(page.getByText('actix-rt|system', { exact: true })).toBeVisible()
  }
  await page.goto(`/projects/${project.id}/applications/${application.id}/policies`)
  await expect(page.getByText('Shared PostgreSQL policy')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Shared PostgreSQL policy')).toBeVisible()
})

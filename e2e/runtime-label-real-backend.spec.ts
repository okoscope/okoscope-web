import { execFileSync } from 'node:child_process'
import { expect, request as apiRequest, test } from '@playwright/test'

const databaseUrl = 'postgresql://postgres@127.0.0.1:55439/postgres?sslmode=disable'
const password = 'correct horse battery staple'
const trustedOrigin = { Origin: 'http://127.0.0.1:4179' }

test('manages behavior names through the real backend without request interception', async ({
  page,
}) => {
  const setup = await page.request.post('/api/v1/setup/complete', {
    data: {
      setup_token: 'real-backend-user-label-setup-token-1234567890',
      email: 'owner@example.com',
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
    { headers: trustedOrigin, data: { name: 'Platform', slug: 'platform' } },
  )
  expect(projectResponse.ok(), await projectResponse.text()).toBe(true)
  const project = await projectResponse.json()
  const applicationResponse = await page.request.post(
    `/api/v1/projects/${project.id}/applications`,
    {
      headers: trustedOrigin,
      data: { name: 'Gateway', slug: 'gateway' },
    },
  )
  expect(applicationResponse.ok(), await applicationResponse.text()).toBe(true)
  const { application } = await applicationResponse.json()

  const processId = '10000000-0000-4000-8000-000000000001'
  const destinationId = '10000000-0000-4000-8000-000000000002'
  execFileSync('/opt/homebrew/opt/libpq/bin/psql', [
    databaseUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `INSERT INTO runtime_inventory_items(id,organization_id,project_id,application_id,inventory_kind,identity_version,identity_digest,semantic_summary,first_seen_at,last_seen_at,occurrence_count) VALUES ('${processId}','${organization.id}','${project.id}','${application.id}','process',1,decode(repeat('01',32),'hex'),'{"executable":"/app/worker"}',now(),now(),3),('${destinationId}','${organization.id}','${project.id}','${application.id}','destination',1,decode(repeat('02',32),'hex'),'{"process_command":"worker","address_family":"ipv4","destination_address":"10.0.0.10","destination_port":5432}',now(),now(),2)`,
  ])

  await page.goto('/')
  await page.getByRole('button', { name: 'Open Organization' }).click()
  await page.goto(
    `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=process`,
  )
  await expect(page.getByRole('heading', { name: 'Application Activity' })).toBeVisible()
  await expect(page.getByText('/app/worker').first()).toBeVisible()

  await page.getByRole('button', { name: 'Add name' }).click()
  await page.getByRole('textbox', { name: 'Behavior name' }).fill('  Background worker  ')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Background worker').first()).toBeVisible()
  await expect(page.getByText('/app/worker').first()).toBeVisible()

  const firstLabelResponse = await page.request.get(
    `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory/${processId}`,
  )
  const firstLabel = (await firstLabelResponse.json()).user_label

  await page.reload()
  await expect(page.getByText('Background worker').first()).toBeVisible()
  await page.getByLabel('Search application activity').fill('Background worker')
  await expect(page.getByText('Background worker').first()).toBeVisible()
  await page.getByLabel('Search application activity').fill('')
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByRole('textbox', { name: 'Behavior name' }).fill('Queue worker')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByText('Queue worker').first()).toBeVisible()

  const stale = await page.request.put(
    `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory/${processId}/user-label`,
    {
      headers: trustedOrigin,
      data: { display_name: 'Stale overwrite', expected_updated_at: firstLabel.updated_at },
    },
  )
  expect(stale.status()).toBe(409)

  await page.getByRole('link', { name: 'Observation history' }).click()
  await expect(page.getByRole('heading', { name: 'Queue worker' })).toBeVisible()
  await expect(page.getByText('/app/worker').first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit name' }).click()
  await page.getByRole('button', { name: 'Remove name' }).click()
  await expect(page.getByRole('heading', { name: '/app/worker' })).toBeVisible()

  const nonNetwork = await page.request.put(
    `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory/${destinationId}/user-label`,
    {
      headers: trustedOrigin,
      data: { display_name: 'Database connection', expected_updated_at: null },
    },
  )
  expect(nonNetwork.ok(), await nonNetwork.text()).toBe(true)
  const unauthenticated = await apiRequest.newContext({ baseURL: 'http://127.0.0.1:18089' })
  const isolated = await unauthenticated.put(
    `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory/${destinationId}/user-label`,
    { data: { display_name: 'Forbidden' } },
  )
  expect(isolated.status()).toBe(401)
  await unauthenticated.dispose()
})

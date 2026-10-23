import { execFileSync } from 'node:child_process'
import { expect, request, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { InventoryDistribution } from '../src/shared/api/types'

const databaseUrl = 'postgresql://postgres@127.0.0.1:55439/postgres?sslmode=disable'
const password = 'correct horse battery staple'
const headers = { Origin: 'http://127.0.0.1:4179' }
const sql = (query: string) =>
  execFileSync('/opt/homebrew/opt/libpq/bin/psql', [
    databaseUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    query,
  ])

test('shows exact DNS identities and independent totals through the real backend', async ({
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
  const orgResponse = await page.request.post('/api/v1/platform/organizations', {
    headers,
    data: { name: 'DNS E2E', slug: 'dns-e2e', ownership: { kind: 'self_owner' } },
  })
  expect(orgResponse.ok(), await orgResponse.text()).toBe(true)
  const { organization } = await orgResponse.json()
  const projectResponse = await page.request.post(
    `/api/v1/organizations/${organization.id}/projects`,
    { headers, data: { name: 'Platform', slug: 'platform' } },
  )
  expect(projectResponse.ok(), await projectResponse.text()).toBe(true)
  const project = await projectResponse.json()
  const appResponse = await page.request.post(`/api/v1/projects/${project.id}/applications`, {
    headers,
    data: { name: 'Gateway', slug: 'gateway' },
  })
  expect(appResponse.ok(), await appResponse.text()).toBe(true)
  const { application } = await appResponse.json()
  const api = `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory`
  const url = `/projects/${project.id}/applications/${application.id}/runtime-inventory?kind=domain`
  expect(
    (await (await page.request.get(`${api}/distribution?kind=domain&limit=5`)).json()).entries,
  ).toEqual([])
  const names = [
    's3.example.com',
    's3.example.com',
    's3.example.com.cluster.local',
    's3.example.com.svc.cluster.local',
    'fifth.example.com',
  ]
  const values = Array.from(
    { length: 55 },
    (_, i) =>
      `(gen_random_uuid(),'${organization.id}','${project.id}','${application.id}','domain',2,decode(md5('${i}')||md5('${i}'),'hex'),'${JSON.stringify({ name: names[i] ?? `query-${i}.example.com`, query_type: i === 1 ? 'AAAA' : 'A', process_command: 'worker' })}',now(),now(),${100 - i})`,
  ).join(',')
  sql(
    `INSERT INTO runtime_inventory_items(id,organization_id,project_id,application_id,inventory_kind,identity_version,identity_digest,semantic_summary,first_seen_at,last_seen_at,occurrence_count) VALUES ${values}`,
  )
  const distribution: InventoryDistribution = await (
    await page.request.get(`${api}/distribution?kind=domain&limit=5`)
  ).json()
  expect(distribution.entries).toHaveLength(5)
  expect(distribution.total_item_count).toBe(55)
  expect(distribution.total_occurrence_count).toBe(4015)
  expect(
    distribution.entries.reduce(
      (sum: number, entry: { occurrence_count: number }) => sum + entry.occurrence_count,
      0,
    ) + (distribution.other?.occurrence_count ?? 0),
  ).toBe(4015)
  const first = await (await page.request.get(`${api}?kind=domain&limit=50`)).json()
  expect(first.items).toHaveLength(50)
  const second = await (
    await page.request.get(
      `${api}?kind=domain&limit=50&cursor=${encodeURIComponent(first.next_cursor)}`,
    )
  ).json()
  expect(second.items).toHaveLength(5)
  expect(
    new Set([...first.items, ...second.items].map((item: { id: string }) => item.id)).size,
  ).toBe(55)
  expect((await page.request.get(`${api}/distribution?kind=invalid`)).status()).toBe(400)
  const anonymous = await request.newContext({ baseURL: 'http://127.0.0.1:4179' })
  expect((await anonymous.get(`${api}/distribution?kind=domain`)).status()).toBe(401)
  await anonymous.dispose()
  sql(
    "INSERT INTO users(id,email,password_hash,email_verified_at) SELECT gen_random_uuid(),'outsider@example.com',password_hash,now() FROM users WHERE email='owner@example.com'",
  )
  const outsider = await request.newContext({ baseURL: 'http://127.0.0.1:4179' })
  expect(
    (
      await outsider.post('/api/v1/auth/login', {
        headers,
        data: { email: 'outsider@example.com', password },
      })
    ).ok(),
  ).toBe(true)
  expect((await outsider.get(`${api}/distribution?kind=domain`)).status()).toBe(404)
  await outsider.dispose()
  const requests: URL[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.pathname.includes('/runtime-inventory')) requests.push(u)
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open Organization' }).click()
  await page.goto(url)
  const overview = page.getByRole('list', { name: 'Most observed DNS queries' })
  await expect(overview.getByRole('listitem')).toHaveCount(6)
  for (const name of [
    's3.example.com (A)',
    's3.example.com (AAAA)',
    's3.example.com.cluster.local (A)',
    's3.example.com.svc.cluster.local (A)',
  ])
    await expect(overview.getByText(name, { exact: true })).toBeVisible()
  await expect(overview.getByText('Other observed DNS queries')).toBeVisible()
  expect(await overview.getByRole('button').count()).toBe(0)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(page.getByRole('link', { name: 'Observation history' })).toHaveCount(5)
  await expect(overview.getByRole('listitem')).toHaveCount(6)
  await page.goto(`${url}&verdict=expected&suppressed=true&evaluation_pending=false`)
  await expect(overview.getByRole('listitem')).toHaveCount(6)
  await expect(
    page.getByText(
      'Policy verdict, suppression, and evaluation filters apply to the detailed list only.',
    ),
  ).toBeVisible()
  expect(
    requests.some(
      (u) =>
        u.pathname.endsWith('/runtime-inventory') &&
        u.searchParams.has('verdict') &&
        u.searchParams.has('suppressed') &&
        u.searchParams.has('evaluation_pending'),
    ),
  ).toBe(true)
  for (const u of requests.filter((u) => u.pathname.endsWith('/distribution')))
    for (const key of ['verdict', 'suppressed', 'evaluation_pending'])
      expect(u.searchParams.has(key)).toBe(false)
  expect(requests.filter((u) => u.pathname.includes('/dns-groups'))).toEqual([])
  await page.goto(url)
  await page.evaluate(() => localStorage.setItem('okoscope.locale', 'ru'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Наиболее наблюдаемые DNS-запросы' }),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/okoscope-dns-ru-mobile.png', fullPage: true })
  await page.evaluate(() => localStorage.setItem('okoscope.locale', 'en'))
  await page.goto(`${url}&search=absent.example.invalid`)
  await expect(
    page.getByText('No recorded observations match the selected activity type and filters.'),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No activity observed' })).toBeVisible()
  await page.getByLabel('Search application activity').focus()
  await expect(page.getByLabel('Search application activity')).toBeFocused()
  await page.keyboard.type('x')
  await expect(page.getByLabel('Search application activity')).toHaveValue(
    'absent.example.invalidx',
  )
})

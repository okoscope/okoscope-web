import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const contract = resolve('openapi/okoscope-v1.yaml')
const source = process.env.OKOSCOPE_OPENAPI_SOURCE
const directory = await mkdtemp(join(tmpdir(), 'okoscope-api-'))

try {
  if (process.env.CI && !source) {
    throw new Error('CI requires OKOSCOPE_OPENAPI_SOURCE from the backend checkout.')
  }
  if (source && !(await readFile(contract)).equals(await readFile(resolve(source)))) {
    throw new Error(
      'Frontend OpenAPI differs from the authoritative backend contract. Copy the backend contract and run npm run api:generate.',
    )
  }
  const generated = join(directory, 'schema.d.ts')
  const result = spawnSync(
    process.execPath,
    ['node_modules/openapi-typescript/bin/cli.js', contract, '-o', generated],
    { stdio: 'inherit' },
  )
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('OpenAPI type generation failed.')
  if (!(await readFile('src/shared/api/schema.d.ts')).equals(await readFile(generated))) {
    throw new Error('Generated API types are stale. Run npm run api:generate.')
  }
  console.log(
    source
      ? 'Backend contract and generated API types match.'
      : 'Generated API types match the frontend contract. Set OKOSCOPE_OPENAPI_SOURCE to verify the backend contract too.',
  )
} finally {
  await rm(directory, { recursive: true, force: true })
}

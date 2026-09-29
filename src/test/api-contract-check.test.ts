import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = resolve('.')

describe('API contract verification', () => {
  it.each(['matching', 'source drift', 'stale types', 'missing CI source'])(
    '%s is checked without mutating project files',
    async (scenario) => {
      const directory = await mkdtemp(join(tmpdir(), 'okoscope-contract-test-'))
      try {
        await mkdir(join(directory, 'openapi'), { recursive: true })
        await mkdir(join(directory, 'src/shared/api'), { recursive: true })
        const contract = await readFile(join(root, 'openapi/okoscope-v1.yaml'))
        const types = await readFile(join(root, 'src/shared/api/schema.d.ts'))
        const localContract = join(directory, 'openapi/okoscope-v1.yaml')
        const localTypes = join(directory, 'src/shared/api/schema.d.ts')
        const source = join(directory, 'backend.yaml')
        await writeFile(localContract, contract)
        await writeFile(localTypes, scenario === 'stale types' ? '// stale\n' : types)
        await writeFile(
          source,
          scenario === 'source drift' ? `${contract.toString()}\n# drift\n` : contract,
        )
        await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
        const before = await readFile(localTypes)
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          CI: 'true',
          OKOSCOPE_OPENAPI_SOURCE: source,
        }
        if (scenario === 'missing CI source') delete env.OKOSCOPE_OPENAPI_SOURCE
        const result = spawnSync(process.execPath, [join(root, 'scripts/check-api.mjs')], {
          cwd: directory,
          env,
          encoding: 'utf8',
        })
        expect(result.error).toBeUndefined()
        expect(result.status).toBe(scenario === 'matching' ? 0 : 1)
        const output = result.stdout + result.stderr
        expect(output).toContain(
          {
            matching: 'Backend contract and generated API types match.',
            'source drift': 'Frontend OpenAPI differs',
            'stale types': 'Generated API types are stale.',
            'missing CI source': 'CI requires OKOSCOPE_OPENAPI_SOURCE',
          }[scenario],
        )
        expect(await readFile(localContract)).toEqual(contract)
        expect(await readFile(localTypes)).toEqual(before)
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    },
  )
})

import { spawnSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'

export default async function teardown() {
  try {
    const state = JSON.parse(
      await readFile('/tmp/okoscope-user-label-e2e-state.json', 'utf8').catch(() => '{}'),
    )
    if (state.serverPid) {
      try {
        process.kill(-state.serverPid, 'SIGTERM')
      } catch (error) {
        if (error.code !== 'ESRCH') throw error
      }
    }
    spawnSync('docker', ['rm', '-f', state.container ?? 'okoscope-user-label-e2e-postgres'])
  } finally {
    await rm('/tmp/okoscope-user-label-e2e-state.json', { force: true })
  }
}

import { readFile, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

export default async function teardown() {
  const statePath = '/tmp/okoscope-group-same-events-e2e-state.json'
  const state = JSON.parse(await readFile(statePath, 'utf8'))
  if (state.serverPid) process.kill(state.serverPid, 'SIGTERM')
  spawnSync('/opt/homebrew/opt/postgresql@17/bin/pg_ctl', ['-D', state.data, 'stop'])
  await rm(state.root, { recursive: true, force: true })
  await rm(statePath, { force: true })
}

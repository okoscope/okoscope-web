import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, openSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

const statePath = '/tmp/okoscope-group-same-events-e2e-state.json'
const databaseUrl = 'postgresql://postgres@127.0.0.1:55441/postgres?sslmode=disable'
const backend = '/Users/ihippik/okoscope/okoscope/target/debug/server'
const pgBin = '/opt/homebrew/opt/postgresql@17/bin'

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${result.stderr}`)
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`timed out waiting for ${url}`)
}

export default async function setup() {
  const root = mkdtempSync(join(tmpdir(), 'okoscope-group-same-events-e2e-'))
  const data = join(root, 'data')
  run(`${pgBin}/initdb`, ['-D', data, '-A', 'trust', '-U', 'postgres'])
  run(`${pgBin}/pg_ctl`, [
    '-D',
    data,
    '-l',
    join(root, 'postgres.log'),
    '-o',
    '-h 127.0.0.1 -p 55441',
    'start',
  ])
  run(backend, ['--database-url', databaseUrl, '--migrate', 'migrate'])
  const serverLog = openSync(join(root, 'server.log'), 'w')
  const server = spawn(
    backend,
    [
      '--database-url',
      databaseUrl,
      '--development-plaintext',
      '--health-addr',
      '127.0.0.1:18091',
      '--grpc-addr',
      '127.0.0.1:14321',
      '--setup-token',
      'group-same-events-setup-token-1234567890',
      '--admin-credential',
      'group-same-events-admin-credential-1234567890',
      '--cors-origins',
      'http://127.0.0.1:4181',
    ],
    { detached: true, stdio: ['ignore', serverLog, serverLog] },
  )
  server.unref()
  await writeFile(statePath, JSON.stringify({ serverPid: server.pid, root, data }))
  await waitFor('http://127.0.0.1:18091/healthz')
}

import { spawn, spawnSync } from 'node:child_process'
import { openSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

const statePath = '/tmp/okoscope-user-label-e2e-state.json'
const container = 'okoscope-user-label-e2e-postgres'
const databaseUrl = 'postgresql://postgres@127.0.0.1:55439/postgres?sslmode=disable'
const backend = '/Users/ihippik/okoscope/okoscope/target/debug/server'

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
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
  spawnSync('docker', ['rm', '-f', container])
  run('docker', [
    'run',
    '-d',
    '--name',
    container,
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '-p',
    '127.0.0.1:55439:5432',
    'postgres:16-alpine',
  ])
  let postgresReady = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'])
    if (ready.status === 0) {
      postgresReady = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!postgresReady) throw new Error('temporary PostgreSQL did not become ready')
  let forwardedPortReady = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync('/opt/homebrew/opt/libpq/bin/psql', [databaseUrl, '-c', 'SELECT 1'])
    if (ready.status === 0) {
      forwardedPortReady = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!forwardedPortReady)
    throw new Error('temporary PostgreSQL forwarded port did not become ready')
  run(backend, ['--database-url', databaseUrl, '--migrate', 'migrate'])
  const serverLog = openSync('/tmp/okoscope-user-label-e2e-server.log', 'w')
  const server = spawn(
    backend,
    [
      '--database-url',
      databaseUrl,
      '--development-plaintext',
      '--health-addr',
      '127.0.0.1:18089',
      '--grpc-addr',
      '127.0.0.1:14319',
      '--setup-token',
      'real-backend-user-label-setup-token-1234567890',
      '--admin-credential',
      'real-backend-administration-credential-1234567890',
      '--cors-origins',
      'http://127.0.0.1:4179',
    ],
    { detached: true, stdio: ['ignore', serverLog, serverLog] },
  )
  server.unref()
  await writeFile(statePath, JSON.stringify({ serverPid: server.pid, container }))
  await waitFor('http://127.0.0.1:18089/healthz')
}

import { spawn, execFileSync } from 'node:child_process'
import { openSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const root = process.env.OKOSCOPE_BACKEND_CHECKOUT
const admin = process.env.OKOSCOPE_TEST_ADMIN_DATABASE_URL
if (!root || !admin)
  throw new Error('Set OKOSCOPE_BACKEND_CHECKOUT and OKOSCOPE_TEST_ADMIN_DATABASE_URL')
const parsed = new URL(admin)
if (
  !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
  parsed.searchParams.get('host') !== '/tmp' ||
  parsed.pathname !== '/postgres'
)
  throw new Error(
    'Only a local /tmp PostgreSQL socket and postgres administration database are accepted',
  )
export default async function setup() {
  const db = `thread_browser_${randomBytes(12).toString('hex')}`
  const psql = process.env.PSQL_BIN ?? 'psql'
  execFileSync(psql, [admin, '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${db}`])
  const url = new URL(admin)
  url.pathname = `/${db}`
  process.env.DATABASE_URL = url.toString()
  const backend = `${root}/target/debug/server`
  const log = openSync('/tmp/okoscope-thread-browser-server.log', 'w')
  let server
  const cleanup = async () => {
    if (server && server.exitCode === null) {
      server.kill()
      await new Promise((resolve) => {
        server.once('exit', resolve)
      })
    }
    execFileSync(psql, [admin, '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE ${db}`])
  }
  try {
    execFileSync(backend, ['--database-url', url.toString(), 'migrate'])
    server = spawn(
      backend,
      [
        '--database-url',
        url.toString(),
        '--development-plaintext',
        '--admin-credential',
        'thread-browser-admin-credential-12345678901234567890',
        '--health-addr',
        '127.0.0.1:18090',
        '--grpc-addr',
        '127.0.0.1:14320',
        '--setup-token',
        'thread-browser-setup-token-12345678901234567890',
        '--cors-origins',
        'http://127.0.0.1:4180',
      ],
      { stdio: ['ignore', log, log] },
    )
    const deadline = Date.now() + 20000
    for (;;) {
      if (server.exitCode !== null)
        throw new Error('Backend exited; inspect /tmp/okoscope-thread-browser-server.log')
      try {
        if ((await fetch('http://127.0.0.1:18090/healthz')).ok) break
      } catch {}
      if (Date.now() > deadline) throw new Error('Backend readiness failed')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    await cleanup()
    throw error
  }
  return cleanup
}

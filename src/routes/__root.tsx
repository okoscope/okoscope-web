import { useQuery, type QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { getCurrentUser, isAnonymousResponse } from '../shared/api/auth'
import { useApi } from '../shared/api/context'
import { buildInfoOptions } from '../shared/api/queries'
import { setupStatusOptions } from '../shared/api/onboarding'
import { authenticationSession, useAuthentication } from '../shared/auth/session'
import { useT } from '../shared/i18n'
import { LanguageSelector } from '../shared/i18n/language-selector'
import { Brand } from '../shared/ui/brand'
import { Card } from '../shared/ui/card'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'
import { FirstRunSetup } from '../features/provisioning/first-run-setup'
import { captureSetupTokenFragment } from '../features/provisioning/setup-token-memory'
import { AuthenticationScreen } from '../features/auth/authentication-screen'

export const REQUIRED_API_VERSION = 'v1'
export const REQUIRED_DATABASE_MIGRATION = 26
export const isBuildCompatible = (info: unknown): boolean => {
  if (!info || typeof info !== 'object') return false
  const value = info as { api_version?: unknown; required_database_migration?: unknown }
  return (
    value.api_version === REQUIRED_API_VERSION &&
    typeof value.required_database_migration === 'number' &&
    value.required_database_migration >= REQUIRED_DATABASE_MIGRATION
  )
}

export const Route = createRootRoute({ component: RootComponent, notFoundComponent: NotFound })

function NotFound() {
  const t = useT()
  return <ErrorState title={t('pageNotFound')} error={new Error(t('notFound'))} />
}

function RootComponent() {
  const t = useT()
  const location = useRouterState({ select: (state) => state.location })
  const isSecurityAction =
    location.pathname === '/verify-email' || location.pathname === '/reset-password'
  if (!isSecurityAction) captureSetupTokenFragment()
  const isPublicRoute =
    location.pathname === '/docs' || location.pathname.startsWith('/docs/') || isSecurityAction
  const content = isPublicRoute ? <Outlet /> : <ProtectedRoot />
  const pageHref = location.href.split('#', 1)[0]
  return (
    <>
      <a className="skip-link" href={`${pageHref}#main-content`}>
        {t('skipToContent')}
      </a>
      {content}
    </>
  )
}

function ProtectedRoot() {
  const t = useT()
  const api = useApi()
  const build = buildInfoOptions(api)
  const query = useQuery(build)
  if (query.isPending) return <StartupLoading label={t('checkingBackend')} />
  if (query.isError)
    return (
      <StartupError
        title={t('backendUnavailable')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  if (!isBuildCompatible(query.data)) return <CompatibilityError info={query.data} />
  return <SetupGate />
}

function SetupGate() {
  const api = useApi()
  const t = useT()
  const setup = useQuery(setupStatusOptions(api))
  if (setup.isPending) return <StartupLoading label={t('checkingSetup')} />
  if (setup.isError)
    return (
      <StartupError
        title={t('setupStatusFailed')}
        error={setup.error}
        onRetry={() => void setup.refetch()}
      />
    )
  if (setup.data.state === 'setup_unavailable')
    return (
      <StartupError
        title={t('setupUnavailable')}
        error={new Error(t('setupUnavailableHelp'))}
        onRetry={() => void setup.refetch()}
      />
    )
  if (setup.data.state === 'owner_required') return <FirstRunSetup />
  return <SessionGate />
}

function SessionGate() {
  const t = useT()
  const api = useApi()
  const auth = useAuthentication()

  const restore = () => {
    authenticationSession.checking()
    void getCurrentUser(api)
      .then(authenticationSession.authenticate)
      .catch((error) => {
        if (isAnonymousResponse(error)) authenticationSession.anonymous()
        else authenticationSession.fail(error)
      })
  }

  useEffect(() => {
    if (authenticationSession.get().status === 'checking') restore()
    // The compatible API instance is stable for the application lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  if (auth.status === 'checking') return <StartupLoading label={t('checkingSession')} />
  if (auth.status === 'error')
    return <StartupError title={t('sessionCheckFailed')} error={auth.error} onRetry={restore} />
  if (auth.status === 'anonymous')
    return <AuthenticationScreen expired={auth.reason === 'expired'} />
  return <AuthenticatedShell />
}

function AuthenticatedShell() {
  const t = useT()
  const locationHref = useRouterState({ select: (state) => state.location.href })
  return (
    <div className="min-h-screen">
      <ApplicationHeader key={locationHref} />
      <main id="main-content" className="page">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-xs text-slate-500">
        {t('webVersion', { version: __APP_VERSION__, commit: __GIT_COMMIT__ })}
      </footer>
    </div>
  )
}

function ApplicationHeader() {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)')
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        toggleRef.current?.focus()
      }
    }
    desktop.addEventListener('change', closeOnDesktop)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      desktop.removeEventListener('change', closeOnDesktop)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="brand-link" aria-label="OKOSCOPE">
          <Brand />
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="mobile-menu-toggle"
          aria-label={t(menuOpen ? 'closeMenu' : 'openMenu')}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <nav
          id="primary-navigation"
          aria-label={t('primaryNavigation')}
          className={`app-navigation${menuOpen ? ' is-open' : ''}`}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false)
          }}
        >
          <Link
            to="/projects"
            className="nav-link"
            activeProps={{ className: 'nav-link text-cyan-300' }}
          >
            {t('projects')}
          </Link>
          <Link
            to="/profile"
            className="nav-link"
            activeProps={{ className: 'nav-link text-cyan-300' }}
          >
            {t('profile')}
          </Link>
          <Link
            to="/onboarding"
            className="nav-link"
            activeProps={{ className: 'nav-link text-cyan-300' }}
          >
            {t('connectAgent')}
          </Link>
          <Link to="/docs" className="nav-link">
            {t('documentation')}
          </Link>
          <LanguageSelector className="app-navigation-language" showLabel={false} />
        </nav>
      </div>
    </header>
  )
}

export function clearProtectedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'build-info' })
}

function StartupLoading({ label }: { label: string }) {
  return (
    <main id="main-content" className="page">
      <Loading label={label} />
    </main>
  )
}

function StartupError({
  title,
  error,
  onRetry,
}: {
  title: string
  error: unknown
  onRetry: () => void
}) {
  return (
    <main id="main-content" className="page">
      <ErrorState title={title} error={error} onRetry={onRetry} />
    </main>
  )
}

function CompatibilityError({
  info,
}: {
  info: {
    api_version?: string
    service_version?: string
    git_commit?: string
    required_database_migration?: number
  }
}) {
  const t = useT()
  return (
    <main id="main-content" className="page">
      <Card role="alert">
        <div className="mb-4 flex justify-end">
          <LanguageSelector />
        </div>
        <p className="eyebrow">{t('incompatibleDeployment')}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t('incompatibleBackend')}</h1>
        <dl className="details">
          <dt>{t('expected')}</dt>
          <dd>{REQUIRED_API_VERSION}</dd>
          <dt>{t('actual')}</dt>
          <dd>{String(info.api_version ?? t('unknown'))}</dd>
          <dt>{t('service')}</dt>
          <dd>{String(info.service_version ?? t('unknown'))}</dd>
          <dt>{t('commit')}</dt>
          <dd className="font-mono text-xs">{String(info.git_commit ?? t('unknown'))}</dd>
          <dt>{t('requiredMigration')}</dt>
          <dd>
            {REQUIRED_DATABASE_MIGRATION} {t('orNewer')}
          </dd>
          <dt>{t('actualMigration')}</dt>
          <dd>{String(info.required_database_migration ?? t('unknown'))}</dd>
        </dl>
      </Card>
    </main>
  )
}

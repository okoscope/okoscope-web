import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiClient, shouldRetry } from './shared/api/client'
import { ApiProvider } from './shared/api/context'
import { authenticationSession } from './shared/auth/session'
import { ConfigError, loadRuntimeConfig } from './shared/config/runtime-config'
import { Card } from './shared/ui/card'
import { LocalizationProvider, useT } from './shared/i18n'
import { LanguageSelector } from './shared/i18n/language-selector'
import { routeTree } from './routeTree.gen'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: false } },
})

function mount() {
  const root = createRoot(document.getElementById('root')!)
  try {
    const config = loadRuntimeConfig()
    const api = new ApiClient(config, () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'build-info' })
      authenticationSession.anonymous('expired')
    })
    const router = createRouter({ routeTree, defaultPreload: 'intent' })
    root.render(
      <StrictMode>
        <LocalizationProvider>
          <QueryClientProvider client={queryClient}>
            <ApiProvider value={api}>
              <RouterProvider router={router} />
            </ApiProvider>
          </QueryClientProvider>
        </LocalizationProvider>
      </StrictMode>,
    )
  } catch (error) {
    root.render(
      <LocalizationProvider>
        <StartupError error={error} />
      </LocalizationProvider>,
    )
  }
}

function StartupError({ error }: { error: unknown }) {
  const t = useT()
  const message = error instanceof ConfigError ? error.message : t('runtimeConfigFailed')
  return (
    <main id="main-content" className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex justify-end">
        <LanguageSelector />
      </div>
      <Card role="alert" className="border-rose-900">
        <p className="eyebrow">{t('configurationError')}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t('cannotStart')}</h1>
        <p className="mt-4 text-slate-300">{message}</p>
      </Card>
    </main>
  )
}

mount()

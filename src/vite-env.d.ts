/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string

interface Window {
  __OKOSCOPE_CONFIG__?: { apiBaseUrl?: unknown }
}

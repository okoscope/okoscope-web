# Okoscope Web UI

Operator-facing React UI for Okoscope. The MVP verifies backend compatibility and provides Organization → Projects → Applications navigation.

## Local development

Requirements: Node.js 22 and npm 10.

```sh
npm ci
npm run dev
```

`public/config.js` configures the local API base URL. Its default `/` is same-origin; use an absolute backend URL only when the backend allows the UI's exact origin through credentialed CORS. Human authentication uses the backend's opaque `HttpOnly` session cookie: the UI sends requests with browser credentials enabled and never reads or persists session material.

## OpenAPI contract

Generated TypeScript is committed at `src/shared/api/schema.d.ts`. The source contract is the backend repository's `openapi/okoscope-v1.yaml`; it can be supplied explicitly when generating or checking the frontend copy:

```sh
OKOSCOPE_OPENAPI_SOURCE=/path/to/okoscope-v1.yaml npm run api:generate
OKOSCOPE_OPENAPI_SOURCE=/path/to/okoscope-v1.yaml npm run api:check
```

`api:check` fails on generated drift when the source is available. In isolated frontend CI, it verifies that committed generated output is present; release automation should provide the backend contract artifact through `OKOSCOPE_OPENAPI_SOURCE` for cross-repository drift detection.

## Verification

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

The quality gate includes formatting, linting, strict type checking, contract freshness, Vitest, Playwright, and the production build.

## Production image

```sh
docker build --build-arg OKOSCOPE_WEB_GIT_COMMIT="$(git rev-parse HEAD)" -t okoscope-web:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  -e OKOSCOPE_API_BASE_URL=/ \
  -e OKOSCOPE_API_UPSTREAM=http://okoscope-server:8080 \
  okoscope-web:local
```

`OKOSCOPE_API_BASE_URL` accepts a same-origin path or an absolute HTTP(S) URL without credentials. For the recommended same-origin mode, set it to `/` and set `OKOSCOPE_API_UPSTREAM` to the server's internal absolute HTTP(S) origin, for example `http://okoscope-server:8080`. The upstream must not contain credentials, a path, query, fragment or trailing slash. The container proxies `/api` before SPA routing and forwards the original host/protocol headers. When no upstream is configured, `/api` fails closed with `502` instead of returning `index.html`. Public ingresses that route `/api` directly to the server remain supported.

`config.js` and `index.html` are not cached; hashed assets are immutable. `/healthz` is the health endpoint and client-side deep links use SPA fallback.

Prefer a same-origin deployment with `/api` reverse-proxied to the backend. For a separate origin, configure the backend's exact CORS allowlist entry for the UI origin; wildcard origins are unsupported and credentialed requests require the exact trusted origin.

Build and run the container smoke suite:

```sh
docker build -t okoscope-web:smoke .
npm run container:smoke
```

Images should be published by immutable digest with OCI version/commit labels added by release automation. Roll back by restoring the previous image digest; the Web UI performs no database migrations.

On every successful GitHub `push`, CI publishes the tested image to GHCR as `ghcr.io/okoscope/okoscope-web:<commit-sha>`. Pushes to `main` also update `ghcr.io/okoscope/okoscope-web:main`. Kubernetes manifests should use the immutable commit SHA tag rather than the mutable alias.

For a local backend, override the development proxy target:

```sh
OKOSCOPE_DEV_API_TARGET=http://127.0.0.1:18080 npm run dev
```

This server-side development setting routes `/api` to the specified backend. It defaults to `https://okoscope.com`; production runtime configuration is unchanged.

## Link previews

The initial `index.html` includes English Open Graph and Twitter card metadata, so
Telegram and other crawlers can read the product title, description, and image
without running JavaScript or signing in. All routes share this product preview;
private application data is never included. The metadata uses the public origin
`https://okoscope.com/`; deployments on another domain should update these absolute
URLs in `index.html` before building.

`public/social-preview.png` is a 1200 × 630 PNG based on the existing favicon. Its
editable source is `public/social-preview.svg`. To regenerate it with librsvg:

```sh
rsvg-convert public/social-preview.svg -o public/social-preview.png
```

After deploying the frontend image, verify that a crawler receives the metadata
and that the image returns `200` with `Content-Type: image/png` without authentication:

```sh
curl -fsSL -A TelegramBot https://okoscope.com/
curl -I https://okoscope.com/social-preview.png
```

Messaging services may cache an earlier preview; a previously shared link may need
a refresh through that service before the new card appears.

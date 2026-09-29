# Okoscope Web UI

Web interface for [Okoscope](https://okoscope.com), a Kubernetes runtime observability
platform. It turns observations collected by the Okoscope eBPF agent into application-level
evidence that operators can inspect and compare.

The UI supports:

- organizations, projects, applications, clusters, and workloads;
- runtime activity, grouped events, and inventory of executables, network destinations, and
  file paths, with optional application-scoped user names that never replace observed technical
  evidence;
- release history and behavioral comparisons between releases;
- resource history and resource-impact comparisons;
- attention queues and policy review;
- notification destinations, delivery history, recovery, health, and retention settings;
- tenant access, invitations, platform administration, and account security flows;
- first-run setup, agent provisioning, and public English/Russian documentation.

Application health presents only diagnostic evidence assigned to the selected workload's
authenticated Application stream. Node-wide and pre-attribution agent diagnostics remain in
operator logs and are not projected into an Application. Every accepted heartbeat includes an
Application-scoped diagnostic snapshot; agents that omit it are rejected as incompatible.
Agent cards keep the supported capability icons visible in one row, dim capabilities that the
agent did not advertise, and expose each localized capability name on hover or keyboard focus.

Application inventory groups outbound destinations, domains, system calls, and file activity by
their canonical behavior across process threads. The originating Linux process command remains
available on each retained raw occurrence and in process-aware Runtime Groups. Policies created
for those inventory kinds therefore apply to matching behavior from every thread in the
Application, subject to their placement scope. Deployments that upgrade from the earlier
thread-specific identity require an Application-scoped reset of runtime evidence, labels,
policies, suppressions, and derived attention or notification state; they do not migrate that
state.

For the domain view, Application Activity presents every exact DNS inventory identity directly,
including its query name and A or AAAA type. Each identity keeps its own evidence history, policy
state, filters, and pagination instead of being folded into a logical destination presentation.
The upper, non-interactive overview alone groups related resolver questions into logical DNS
destinations, preventing Kubernetes search-expansion variants from crowding other destinations out
of the top-five summary. Overview entries do not change the list's search or identity filters.

Application Activity distinguishes process creation (`process.start`), executable execution
(`process.exec`), and leader termination (`process.exit`). Historical exits recorded before task
classification are shown as legacy unclassified task terminations rather than asserted to be
process exits. Thread lifecycle is intentionally presented as a separate **Threads** category
instead of one inventory identity per thread: the panel reports created, exited, active, and
peak-active counts and bounded name buckets. Created and exited counts cover the selected
windows. Active counts and the observed peak are available only when the windows belong to one
qualified process and observation epoch; summaries spanning different processes show them as
unavailable instead of combining incompatible observations. Inventory policy,
identity-search, and behavior filters do not apply to this application-wide category. It marks
snapshot or unavailable baselines,
observation gaps, name overflow, and truncated summaries, and uses “at least” wording whenever a
value is only a lower bound. The generated client consumes the no-store
`/api/v1/projects/{project_id}/applications/{application_id}/thread-activity` and
`/thread-activity/summary` routes from the authoritative backend OpenAPI contract. These views
require backend database migration 32 and a compatible runtime agent advertising
`task.lifecycle/v1`; older agents do not reconstruct historical thread activity. Enable
`observation.processExit` for task creation, rename, and exit evidence; capability advertisement
requires all mandatory kernel hooks to load and attach successfully. `processExec` is independent.
Migration 32 extends thread-window uniqueness to the Project and observing agent; an installation
that already applied migration 31 can upgrade without rebuilding stored windows. The default
window is one hour, and an explicit range may span at most 31 days. Thread-activity windows
follow the Project’s effective raw runtime retention; expired windows are removed without
a separate historical snapshot to reconstruct their counts.

The product interface is a React single-page app. Public documentation is a statically generated
Astro and Starlight site at `/docs/en/` and `/docs/ru/`. The application validates backend compatibility at startup and
uses the backend's opaque `HttpOnly` session cookie for authentication. Browser requests include
credentials; session material is never read or persisted by the UI.

## Technology

- React 19 and TypeScript
- Vite 8
- Astro and Starlight
- TanStack Router and TanStack Query
- Tailwind CSS 4
- Vitest, Testing Library, and Playwright
- OpenAPI-generated TypeScript definitions

## Local development

Requirements: Node.js 22 and npm 10.

```sh
npm ci
npm run dev
```

The development server is available at `http://localhost:4173`. It proxies `/api` to
`https://okoscope.com` by default. To use a local backend, override the proxy target:

```sh
OKOSCOPE_DEV_API_TARGET=http://127.0.0.1:18080 npm run dev
```

`public/config.js` contains the browser runtime API base URL. Its default value, `/`, uses the
current origin. Use an absolute backend URL only when that backend allows the UI's exact origin
through credentialed CORS.

Run the documentation site separately during content work:

```sh
npm run docs:dev
```

Documentation sources live in `public-docs/src/content/docs/en/` and
`public-docs/src/content/docs/ru/`. Each article must have a file in both locale directories.

## Useful commands

| Command                   | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `npm run dev`             | Start the development server                               |
| `npm run build`           | Type-check and create the production bundle                |
| `npm run docs:dev`        | Start the Starlight documentation development server       |
| `npm run docs:build`      | Build and validate both localized documentation trees      |
| `npm run preview`         | Preview the production bundle locally                      |
| `npm test`                | Run the Vitest suite once                                  |
| `npm run test:watch`      | Run Vitest in watch mode                                   |
| `npm run test:e2e`        | Run the Playwright end-to-end suite                        |
| `npm run test:docs`       | Run static documentation and SEO browser tests             |
| `npm run lint`            | Run ESLint with zero warnings allowed                      |
| `npm run format:check`    | Check formatting with Prettier                             |
| `npm run check`           | Run the complete non-container quality gate                |
| `npm run container:smoke` | Smoke-test the previously built `okoscope-web:smoke` image |

Before running Playwright locally for the first time, install Chromium:

```sh
npx playwright install chromium
```

## Thread activity against a real backend

The default `npm run test:e2e` suite uses mocked API responses. The separate thread-activity
suite exercises the real server and PostgreSQL, including authenticated lifecycle ingestion,
window pagination, invalid requests, access isolation, and localized unavailable counts.
It does not load or verify Linux kernel probes.

Install dependencies and Chromium as above, then build the compatible backend checkout:

```sh
cd /path/to/backend
cargo build -p server
```

Run the suite from this frontend checkout with a local PostgreSQL 17 server and a role allowed
to create databases. The administration URL must select the local `postgres` database through
the `/tmp` socket; remote database URLs are rejected.

```sh
OKOSCOPE_BACKEND_CHECKOUT=/path/to/backend \
OKOSCOPE_TEST_ADMIN_DATABASE_URL='postgres://<local-user>@localhost/postgres?host=/tmp' \
PSQL_BIN=/path/to/psql \
npx playwright test --config=playwright.threads.config.ts
```

`PSQL_BIN` defaults to `psql`. The harness creates and migrates a randomly named database,
starts the server on HTTP `18090` and gRPC `14320`, and starts the frontend on `4180`.
Keep those ports available. It seeds test data through the backend fixture and authenticated
ingestion, then stops its server and drops only the database it created. It does not use
production data. Backend startup diagnostics are written to
`/tmp/okoscope-thread-browser-server.log`.

## OpenAPI contract

The source contract is committed at `openapi/okoscope-v1.yaml`; generated TypeScript is committed
at `src/shared/api/schema.d.ts`.

```sh
npm run api:generate
npm run api:check
```

To generate or verify the types against a contract from another checkout or CI artifact, provide
its path explicitly:

```sh
OKOSCOPE_OPENAPI_SOURCE=/path/to/okoscope-v1.yaml npm run api:generate
OKOSCOPE_OPENAPI_SOURCE=/path/to/okoscope-v1.yaml npm run api:check
```

`api:check` generates definitions in a temporary directory and fails if they differ from the
checked-in types. When `OKOSCOPE_OPENAPI_SOURCE` is set, it also requires the frontend contract
copy to match the authoritative backend source byte for byte; it never modifies either file.
To synchronize an API change, copy the backend contract to `openapi/okoscope-v1.yaml`, then run
`npm run api:generate` and verify with `OKOSCOPE_OPENAPI_SOURCE` pointing to that same source.

CI checks out `okoscope/okoscope` and requires both contract equality and generated-type
freshness. It uses backend `main` by default. For a coordinated backend branch or release,
set the repository variable `OKOSCOPE_BACKEND_REF` to its branch, tag, or commit; a manual
workflow run can override it with `backend_ref`. Prefer an immutable commit or release tag
for release verification. A frontend API change cannot pass this gate until the compatible
backend revision is available in that repository.

## Production image

Build and run the nginx-based image:

```sh
docker build \
  --build-arg OKOSCOPE_WEB_GIT_COMMIT="$(git rev-parse HEAD)" \
  -t okoscope-web:local .

docker run --rm -p 8080:8080 --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  -e OKOSCOPE_API_BASE_URL=/ \
  -e OKOSCOPE_API_UPSTREAM=http://okoscope-server:8080 \
  okoscope-web:local
```

Runtime configuration:

| Variable                | Default | Description                                                 |
| ----------------------- | ------- | ----------------------------------------------------------- |
| `OKOSCOPE_API_BASE_URL` | `/`     | Browser-facing same-origin path or absolute HTTP(S) API URL |
| `OKOSCOPE_API_UPSTREAM` | empty   | Internal HTTP(S) backend origin used to proxy `/api`        |

For the recommended same-origin deployment, keep `OKOSCOPE_API_BASE_URL=/` and set
`OKOSCOPE_API_UPSTREAM` to the backend's internal origin. The upstream must not include
credentials, a path, query, fragment, or trailing slash. If it is omitted, `/api` fails closed
with `502`; public ingresses may instead route `/api` directly to the backend.

The container runs as a non-root user and supports a read-only root filesystem. `/healthz` is its
health endpoint. `config.js`, `index.html`, SPA routes, and documentation HTML are served without
caching; hashed application and documentation assets are immutable. `/docs` redirects to
`/docs/en/`; localized articles use `/docs/en/<slug>/` and `/docs/ru/<slug>/`.

Build and exercise the full container smoke suite with:

```sh
docker build -t okoscope-web:smoke .
npm run container:smoke
```

## Continuous integration and releases

Pull requests run formatting, linting, strict type checking, OpenAPI drift detection, unit and
component tests, the production build, Playwright E2E tests, and the container smoke suite.

After a successful push to `main`, CI publishes:

- `ghcr.io/okoscope/okoscope-web:<commit-sha>` as the immutable image;
- `ghcr.io/okoscope/okoscope-web:main` as the mutable branch alias.

Deployments should pin the immutable commit SHA tag. The Web UI performs no database migrations,
so rollback consists of restoring the previous image.

## Link previews

`index.html` contains English Open Graph and Twitter Card metadata for the public
`https://okoscope.com/` origin. All routes share this product preview; private application data is
never included. Deployments on another domain should update the absolute metadata URLs before
building.

The preview image is `public/social-preview.png` (1200 x 630); its editable source is
`public/social-preview.svg`. Regenerate it with librsvg:

```sh
rsvg-convert public/social-preview.svg -o public/social-preview.png
```

After deployment, verify that metadata and the image are publicly accessible:

```sh
curl -fsSL -A TelegramBot https://okoscope.com/
curl -I https://okoscope.com/social-preview.png
```

Messaging services may cache older previews, so an already shared link may need to be refreshed
through the relevant service.

Documentation screenshots are generated from Playwright fixtures and contain no production data:

```sh
npm run docs:screenshots
```

## License

See [LICENSE](LICENSE).

# MVP verification matrix

| Capability scenario                                                                                  | Verification                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Valid and invalid runtime API configuration                                                          | `runtime-config.test.ts`, Playwright configuration test, container smoke test |
| Generated OpenAPI contract freshness and nullable/composed types                                     | `npm run api:check`, compile-time fixtures in `types.ts`                      |
| Compatible, incompatible, unreachable, and malformed build info                                      | `client.test.ts`, Playwright compatibility and malformed-response tests       |
| Cookie session restoration, login/registration, expiry isolation, roles, and logout                  | `session.test.ts`, `auth.test.ts`, `client.test.ts`, Playwright auth journeys |
| Correlated API/network failures                                                                      | `client.test.ts`, Playwright error tests                                      |
| Organization, Project, Application hierarchy and deep links                                          | Playwright primary journey                                                    |
| Empty collections, null timestamps, and scoped links                                                 | `lists.test.tsx`                                                              |
| Cursor pagination without duplicate items                                                            | query implementation plus Playwright pagination journey                       |
| Keyboard semantics, focus, labels, and document titles                                               | component semantics plus Playwright and axe checks                            |
| Immutable runtime-configured image, health, cache policy, SPA fallback, invalid startup              | `scripts/container-smoke.sh`                                                  |
| Migration 16 compatibility and notification operations                                               | `root-compatibility.test.ts`, compile-time fixtures, `npm run api:check`      |
| Heterogeneous and nullable Application worker kernels, isolated failures, localization, and cursors  | `application-workers.test.tsx`, `queries.test.ts`, Playwright narrow journey  |
| Runtime Group filters, first-seen detail, notification state, and bounded occurrences                | observability unit/component tests and Playwright first-seen journey          |
| Notification destinations, one-time secrets, delivery history/detail, confirmations, and request IDs | notification component tests and Playwright notification journey with axe     |
| Acknowledge, resolve confirmation, reopen, and cache invalidation                                    | lifecycle component/integration coverage and Playwright first-seen journey    |
| Runtime Inventory summary, four behavior kinds, dependent facets, URL scope, search, and cursors     | runtime-inventory unit/component tests and Playwright inventory journey       |
| Runtime Inventory release states, evidence tabs, ownership, and inert observed strings               | fixture-driven safety tests, Playwright evidence journey, and axe checks      |

## Runtime Inventory contract fixture coverage

The backend `runtime-inventory.json` fixture is used directly for summary, list, terminal/empty pages,
release presence, and markup-like observed text. The published fixture does not currently include facet,
item-detail, sighting, group, occurrence, unauthorized/not-found/server-error, or invalid-cursor envelopes;
those cases use generated-type-checked frontend builders and Playwright responses. Invalid-cursor recovery
accepts the centralized `invalid_cursor`, `cursor_invalid`, and `expired_cursor` codes until the backend
contract enumerates one canonical error value.

## Production first-seen smoke fixture

Use these identifiers only for manual production verification against `https://okoscope.com/api`:

- Application: Payment API
- Project ID: `018f4f9c-3f9a-7de1-8000-000000000001`
- Application ID: `018f4f9c-3f9a-7de1-8000-000000000002`
- Runtime Group (`busybox`): `a2a69436-f722-48bf-acdd-436a0d678c7c` (at least three occurrences)

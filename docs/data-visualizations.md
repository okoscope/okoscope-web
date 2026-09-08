# Runtime data visualizations

Okoscope visualizes recorded runtime observations to help operators compare activity. A percentage is never a duration, byte volume, configured intent, prevalence across time, anomaly score, or risk score.

## Process termination and restart evidence

Runtime discoveries keep evidence authority visible throughout the list, detail, and bounded occurrence timeline:

- **Kernel evidence** reports native normal exit status or terminating signal. A displayed `128 + signal` value is a derived shell convention; `SIGKILL` or conventional code 137 alone does not establish OOM.
- **Kubernetes evidence** reports container runtime termination reason/exit code, restart-count transitions, and waiting state. `CrashLoopBackOff` is a waiting/backoff state rather than a termination cause.
- **Derived finding** reports the server's versioned bounded restart-loop projection with its threshold, count, and window.

Qualified correlation places source records together without merging their claims. Ambiguous correlation does not select a candidate. Related evidence is bounded by the API, and occurrence pages remain in the declared `received_at DESC, observed_at DESC, id DESC` order rather than being reordered across cursor pages.

The “Requires attention” views show restart loops only when the server returns a typed attention item. The browser does not promote isolated exits, restarts, SIGKILL, 137, `OOMKilled`, or `CrashLoopBackOff` into severity or a client-derived warning.

## Denominators

- Application activity kind share: the kind's `occurrence_count` divided by the complete filtered Runtime Inventory summary `occurrence_count`.
- Top behavior share: the entry's `occurrence_count` divided by the distribution response's `total_occurrence_count`.
- Rounded percentages are displayed independently and are not adjusted to force a total of 100%. Exact counts and the denominator remain visible.
- Runtime Diff bars compare absolute occurrence-count deltas. They do not display percentages.

## Inventory distribution API

`GET /api/v1/projects/{project_id}/applications/{application_id}/runtime-inventory/distribution`

The operation requires `kind`, accepts the same release, Kubernetes, observation-time, and search scope as the inventory summary, and accepts `limit` from 1 through 10 (default 5). The backend orders entries by `occurrence_count` descending and then opaque `identity_token` ascending. Returned top entries plus `other` account for the complete filtered totals; clients must not aggregate cursor pages.

Each entry contains a typed inert `semantic_summary` and a server-issued `identity_token`. Passing that token to the Runtime Inventory list selects the exact typed identity without parsing or reflecting identity fields into query syntax. Tokens are opaque and limited to the normalized scope understood by the backend.

## Runtime Diff summary API

`GET /api/v1/projects/{project_id}/applications/{application_id}/releases/{target_id}/runtime-diff/summary`

The operation accepts the optional `baseline_id` and a bounded `limit` from 1 through 10 (default 5). It returns complete `new`, `disappeared`, and `unchanged` totals plus entries ranked by absolute occurrence-count delta. Its result is independent of Runtime Diff cursor pagination. New and disappeared entries use zero on the unobserved side for delta calculation while retaining their classification.

## Presentation and accessibility

Visualizations use labelled semantic HTML with decorative CSS bars. Every entry exposes identity, exact count, percentage or signed delta, direction, and classification as text. Buttons are keyboard operable, have visible focus and selected states that do not rely on color, remain usable at narrow widths and zoom, and suppress nonessential transitions under reduced-motion preferences. Observed strings remain inert and are never interpreted as HTML, Markdown, or automatic links.

## Operational limits

The contract fixes top-N at a default of 5 and maximum of 10 to bound payload and rendering cost. Backend owners must validate aggregate query latency, deterministic ordering, ownership enforcement, and full-scope correctness on representative high-cardinality production data before deployment. Until backend performance evidence exists, the UI contract alone must not be interpreted as approval for unrestricted aggregate queries.

## Deployed development verification

Verified against `https://okoscope.com` service commit `a270f88385ded5f81d067dfbeac4dc14da9dbe30`, database migration 9, on 2026-08-20.

- Runtime Inventory summary: 46 identities and 367 observations. All four distribution totals matched the corresponding complete summary totals; top entries plus `other` matched both item and occurrence totals. The empty Syscall distribution returned zero totals, no entries, and `other: null`.
- Limits 0 and 11 returned HTTP 400 `invalid_request`; limit 1 and limit 10 returned bounded results.
- A server-issued Process identity token selected exactly the matching `dig` identity. A token with trailing or otherwise modified content returned HTTP 400 `invalid_identity_token`.
- Runtime Diff summary returned 47 identities: 44 new, 2 disappeared, and 1 unchanged. Classification totals summed to the complete total and ranked entries used zero baseline counts for new behavior.
- Twenty sequential Domain distribution requests with limit 10 produced a response of approximately 11,443 bytes: mean 211 ms, p50 111 ms, p95 525 ms, maximum 660 ms.
- Twenty sequential Runtime Diff summary requests with limit 10 produced a response of approximately 4,679 bytes: mean 152 ms, p50 91 ms, p95 356 ms, maximum 555 ms.

These measurements are deployment smoke evidence, not a high-cardinality capacity result. A separate backend synthetic high-cardinality verification is recorded below; it does not replace production capacity testing.

## Backend high-cardinality verification (2026-09-03)

Backend revision `810660cef5a0fe73cc9be2cd297459a87833e71c`, PostgreSQL 17.4, debug build on Apple M2 Pro / 16 GiB RAM. An isolated local synthetic read-model fixture contains 40,000 inventory identities and diff groups (10,000 identities per visualization kind), 40,000 event rows/sightings, 2,000 Pods, 20 namespaces, 100 workloads and two overlapping releases. Each endpoint/limit configuration uses ten warmups followed by 300 sequential HTTP requests; timing includes the complete response body over loopback. These are development acceptance measurements, not a production SLO or concurrent-ingestion capacity result.

| Endpoint, limit 10                             |      p95 |      p99 | Maximum JSON bytes |
| ---------------------------------------------- | -------: | -------: | -----------------: |
| Process Distribution                           |  6.94 ms |  9.56 ms |             10,710 |
| Destination Distribution                       |  7.36 ms |  9.39 ms |             11,752 |
| Domain Distribution                            |  7.03 ms |  9.65 ms |             11,175 |
| Syscall Distribution                           |  7.62 ms |  9.98 ms |             10,848 |
| Scoped Process Distribution (1,333 identities) | 23.34 ms | 36.33 ms |             10,704 |
| Runtime Diff Summary (40,000 groups)           | 40.50 ms | 47.50 ms |              3,672 |

Actual aggregate SQL was reviewed using `EXPLAIN (ANALYZE, BUFFERS)`: full-scope window aggregation/top-N sort for distributions, indexed item access with release/sighting scope subplans for the filtered case, and full release comparison/hash joins for diff. No temporary-block spill was observed. All 3,600 measured requests succeeded. Default 5, maximum 10, rejection of 0/11, complete classification totals, and top entries plus `other` were verified. Retain top-N default **5**, maximum **10** for this profile.

The remaining task 5.4 blocker is now concrete: the API bounds entry count but does not enforce an aggregate byte budget. A separate stored-summary probe with 131,072-byte process labels returned HTTP 200 and **1,321,222 bytes** at limit 10. Ordinary-fixture maxima above must not be advertised as contract-wide size limits. Backend must define and enforce bounded identity fields or a bounded aggregate representation, including existing oversized values, before a guaranteed response-byte maximum can be confirmed. The frontend must not add a workaround. Task 5.4 remains unchecked and the change is not ready to archive.

Reproduction, all default/max-limit measurements and full JSON plans are retained in the backend repository: `tools/benchmark_visualizations.py`, `docs/data-visualizations-high-cardinality.md`, and `docs/data-visualizations-benchmark-results.json`.

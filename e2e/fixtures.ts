import type { Page, Route } from '@playwright/test'
import {
  resourceComparisonFixture,
  resourceHistoryFixture,
} from '../src/features/resources/fixtures'

const organization = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'acme',
  name: 'Acme',
  created_at: '2026-08-17T12:00:00Z',
}
const project = {
  id: '00000000-0000-4000-8000-000000000002',
  slug: 'platform',
  name: 'Platform',
  created_at: '2026-08-17T12:00:00Z',
  archived_at: null,
  application_count: 1,
  runtime_group_count: 3,
}
const application = {
  id: '00000000-0000-4000-8000-000000000003',
  project_id: project.id,
  slug: 'gateway',
  name: 'Gateway',
  created_at: '2026-08-17T12:00:00Z',
  release_count: 2,
  runtime_group_count: 3,
  latest_observed_at: null,
}
const policyEvaluation = {
  state: 'current',
  verdict: 'unclassified',
  reason_code: 'no_matching_policy',
  winning_revision_id: null,
  explanation: { specificity: [], related_revision_ids: [] },
  evaluated_at: '2026-08-17T12:00:00Z',
}
const coverage = { closed_before: null, history_expired_before: null, detail_scope: 'raw' }
const group = {
  coverage,
  id: '00000000-0000-4000-8000-000000000004',
  project_id: project.id,
  application_id: application.id,
  cluster_id: '00000000-0000-4000-8000-000000000005',
  namespace: 'production',
  workload_kind: 'Deployment',
  workload_name: 'gateway',
  fingerprint_version: 1,
  event_kind: 'network.connect',
  semantic_summary: {
    process_command: '/app/gateway',
    address_family: 'ipv4',
    destination_address: '203.0.113.7',
    destination_port: 443,
    dns_context: {
      names: ['api.example.com', 'cdn.example.com'],
      observed_at: '2026-08-17T11:59:30Z',
      expires_at: '2026-08-17T12:01:00Z',
      confidence: 'observed_recently',
      ambiguous: true,
    },
  },
  status: 'open',
  first_seen_at: '2026-08-17T10:00:00Z',
  first_seen_event_id: '00000000-0000-4000-8000-000000000006',
  last_seen_at: '2026-08-17T12:00:00Z',
  occurrence_count: 12,
  representative_event_id: '00000000-0000-4000-8000-000000000006',
  status_changed_at: null,
  status_changed_by: null,
  policy_evaluation: policyEvaluation,
  active_suppression: null,
  actionable: true,
}
const occurrence = {
  id: '00000000-0000-4000-8000-000000000007',
  event_id: group.representative_event_id,
  observed_at: '2026-08-17T12:00:00Z',
  received_at: '2026-08-17T12:00:01Z',
  node_name: 'node-1',
  namespace: 'production',
  pod_name: 'gateway-abc',
  container_name: 'gateway',
  process_command: '/app/gateway serve',
  event_kind: 'network.connect',
  payload: {
    type: 'NetworkConnect',
    data: {
      address_family: 'ipv4',
      destination_address: '203.0.113.7',
      destination_port: 443,
      outcome: 'succeeded',
      dns_context: {
        names: ['api.example.com', 'cdn.example.com'],
        observed_at: '2026-08-17T11:59:30Z',
        expires_at: '2026-08-17T12:01:00Z',
        confidence: 'observed_recently',
        ambiguous: true,
      },
    },
  },
  correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
  related_evidence: [],
  release_id: '00000000-0000-4000-8000-000000000008',
  release_version: 'v2',
  release_display_name: 'Gateway · 1 image · a81f4c2e',
}
const targetRelease = {
  id: '00000000-0000-4000-8000-000000000008',
  project_id: project.id,
  application_id: application.id,
  version: 'v2',
  display_name: 'Gateway · 1 image · a81f4c2e',
  description: 'Current',
  deployed_at: '2026-08-17T11:00:00Z',
  created_at: '2026-08-17T11:00:00Z',
  source: 'observed',
  identity_version: 1,
  identity_digest: 'a81f4c2e'.padEnd(64, '0'),
  identity_components: [{}],
  revision_count: 1,
  active_episode_count: 1,
}
const baselineRelease = {
  id: '00000000-0000-4000-8000-000000000009',
  project_id: project.id,
  application_id: application.id,
  version: 'v1',
  display_name: 'Gateway · 1 image · b71f4c2e',
  description: 'Baseline',
  deployed_at: '2026-08-16T11:00:00Z',
  created_at: '2026-08-16T11:00:00Z',
  source: 'observed',
  identity_version: 1,
  identity_digest: 'b71f4c2e'.padEnd(64, '0'),
  identity_components: [{}],
  revision_count: 1,
  active_episode_count: 0,
}
const releases = [targetRelease, baselineRelease]
const attentionComparison = {
  target_release: {
    id: targetRelease.id,
    version: targetRelease.version,
    display_name: targetRelease.display_name,
    deployed_at: targetRelease.deployed_at,
  },
  baseline_release: {
    id: baselineRelease.id,
    version: baselineRelease.version,
    display_name: baselineRelease.display_name,
    deployed_at: baselineRelease.deployed_at,
  },
  new_count: 1,
  disappeared_count: 0,
  unchanged_count: 2,
  total_item_count: 3,
  absolute_occurrence_delta_sum: 12,
  max_absolute_occurrence_delta: 12,
  largest_changes: [
    {
      group_id: group.id,
      classification: 'new',
      baseline_occurrence_count: 0,
      target_occurrence_count: 12,
      occurrence_delta: 12,
    },
  ],
}
const attentionWindow = { kind: '24h', from: '2026-08-16T12:00:00Z', to: '2026-08-17T12:00:00Z' }
const attentionItem = {
  id: `discovery:${group.id}`,
  kind: 'new_discovery',
  priority: 'normal',
  reason_code: 'discovery_first_seen_in_window',
  facts: { reason_count: 1, occurrence_count: 12 },
  occurred_at: group.first_seen_at,
  project: { id: project.id, name: project.name, slug: project.slug },
  application: { id: application.id, name: application.name, slug: application.slug },
  resource: {
    type: 'runtime_group',
    project_id: project.id,
    application_id: application.id,
    runtime_group_id: group.id,
    event_kind: group.event_kind,
    semantic_summary: group.semantic_summary,
    namespace: group.namespace,
    workload_kind: group.workload_kind,
    workload_name: group.workload_name,
  },
}
const attentionRecommendation = {
  id: `review:${group.id}`,
  kind: 'review_new_discoveries',
  priority: 'normal',
  reason_code: 'discovery_first_seen_in_window',
  facts: { reason_count: 1 },
  project: attentionItem.project,
  application: attentionItem.application,
  resource: attentionItem.resource,
  created_from_snapshot_at: attentionWindow.to,
}
const resourceAttentionFacts = {
  reason_count: 1,
  resource_regression: {
    finding_id: resourceComparisonFixture.findings[0]!.id,
    reason_code: resourceComparisonFixture.findings[0]!.reason_code,
    metric: resourceComparisonFixture.findings[0]!.metric,
    unit: 'ratio',
    rule_version: 1,
    threshold: 0.05,
    sustained_buckets: 3,
    baseline: 0.01,
    target: 0.18,
    change: 0.17,
    baseline_window: resourceComparisonFixture.baseline_window,
    target_window: resourceComparisonFixture.target_window,
  },
}
const resourceAttentionReference = {
  type: 'resource_comparison',
  project_id: project.id,
  application_id: application.id,
  target_release_id: targetRelease.id,
  from: resourceComparisonFixture.target_window.from,
  to: resourceComparisonFixture.target_window.to,
}
const resourceAttentionItem = {
  id: 'resource-regression:gateway',
  kind: 'resource_regression',
  priority: 'high',
  reason_code: 'cpu_throttling_increased',
  facts: resourceAttentionFacts,
  occurred_at: resourceComparisonFixture.target_window.to,
  project: attentionItem.project,
  application: attentionItem.application,
  resource: resourceAttentionReference,
}
const resourceAttentionRecommendation = {
  ...resourceAttentionItem,
  id: 'review-resource-regression:gateway',
  kind: 'review_resource_regression',
  created_from_snapshot_at: attentionWindow.to,
}
const inventoryItemId = '10000000-0000-4000-8000-000000000001'
const unsafeInventoryText = "<img src=x onerror=alert('inventory')>"
const inventoryBase = `/api/v1/projects/${project.id}/applications/${application.id}/runtime-inventory`
const inventoryItem = {
  id: inventoryItemId,
  project_id: project.id,
  application_id: application.id,
  inventory_kind: 'process',
  identity_version: 1,
  semantic_summary: { executable: unsafeInventoryText },
  first_seen_at: '2026-08-17T10:00:00Z',
  last_seen_at: '2026-08-18T10:00:00Z',
  occurrence_count: 12,
  release_count: 2,
  cluster_count: 1,
  namespace_count: 1,
  workload_count: 1,
  pod_count: 2,
  container_count: 1,
  group_count: 1,
}
const inventoryDetail = {
  coverage,
  ...inventoryItem,
  evidence: {
    releases: `${inventoryBase}/${inventoryItemId}/releases`,
    sightings: `${inventoryBase}/${inventoryItemId}/sightings`,
    groups: `${inventoryBase}/${inventoryItemId}/groups`,
    occurrences: `${inventoryBase}/${inventoryItemId}/occurrences`,
  },
  policy_placement_summary: {
    placement_count: 1,
    evaluation_pending: 0,
    verdicts: { expected: 0, requires_review: 0, policy_conflict: 0, unclassified: 1 },
  },
}

const json = (route: Route, body: unknown, status = 200, requestId = 'e2e-request') =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'x-request-id': requestId },
    body: JSON.stringify(
      status === 200 &&
        /runtime-inventory|runtime-diff|\/workers/.test(route.request().url()) &&
        typeof body === 'object' &&
        body !== null
        ? { ...body, coverage }
        : body,
    ),
  })

export async function mockApi(page: Page, role: 'owner' | 'member' = 'owner') {
  let organizationRuntimeRetention = {
    enabled: false,
    raw_days: 30,
    history_days: 365 as number | null,
  }
  let projectRuntimeRetention: typeof organizationRuntimeRetention | null = null
  let organizationRetention = { enabled: false, history_days: 90 }
  let projectRetention: typeof organizationRetention | null = null
  let loggedIn = false
  let preferredLocale: 'en' | 'ru' = 'en'
  let groupStatus: 'open' | 'acknowledged' | 'resolved' = 'open'
  const destination = {
    id: '00000000-0000-4000-8000-000000000010',
    project_id: project.id,
    name: 'Operations',
    url: 'https://receiver.example/hooks',
    enabled: true,
    deliver_backfill: false,
    revision: 1,
    created_at: '2026-08-17T12:00:00Z',
    updated_at: '2026-08-17T12:00:00Z',
    disabled_at: null as string | null,
  }
  const delivery = {
    id: '00000000-0000-4000-8000-000000000011',
    project_id: project.id,
    destination_id: destination.id,
    outbox_message_id: null,
    origin: 'test',
    source: 'operator',
    event_name: 'notification.test',
    semantic_metadata: {
      application_id: application.id,
      group_id: group.id,
      event_kind: 'notification.test',
    },
    destination: { id: destination.id, name: destination.name, enabled: true },
    status: 'pending',
    available_at: '2026-08-17T12:00:00Z',
    next_attempt_at: '2026-08-17T12:05:00Z',
    recovery_generation: 0,
    attempt_count: 1,
    total_attempt_count: 1,
    max_attempts: 5,
    last_error_class: null,
    terminal_reason: null,
    created_at: '2026-08-17T12:00:00Z',
    updated_at: '2026-08-17T12:00:01Z',
    terminal_at: null,
    retry_allowed: true,
    cancel_allowed: true,
    last_recovery_operation_id: null,
  }
  let destinations: (typeof destination)[] = []
  let deliveries: (typeof delivery)[] = []
  const recoveryOperation = {
    id: '00000000-0000-4000-8000-000000000013',
    project_id: project.id,
    command_type: 'retry',
    target_delivery_id: delivery.id as string | null,
    actor_kind: 'api_credential',
    actor_id: '00000000-0000-4000-8000-000000000014',
    request_id: 'recovery-request',
    outcome: 'completed',
    selected_count: 1,
    retried_count: 1,
    cancelled_count: 0,
    skipped_count: 0,
    remaining_count: 0,
    created_at: '2026-08-17T13:00:00Z',
    completed_at: '2026-08-17T13:00:01Z',
  }
  let recoveries: (typeof recoveryOperation)[] = []
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/runtime-retention')) {
      const isProject = path.includes('/projects/')
      if (route.request().method() === 'PUT') {
        if (isProject) projectRuntimeRetention = route.request().postDataJSON()
        else organizationRuntimeRetention = route.request().postDataJSON()
      }
      if (route.request().method() === 'DELETE') projectRuntimeRetention = null
      return json(
        route,
        isProject
          ? {
              override: projectRuntimeRetention,
              inherited: organizationRuntimeRetention,
              effective: projectRuntimeRetention ?? organizationRuntimeRetention,
              source: projectRuntimeRetention ? 'project' : 'organization',
            }
          : organizationRuntimeRetention,
      )
    }
    if (path.endsWith('/snapshots'))
      return json(route, { items: [], next_cursor: null, coverage, granularity: 'utc_day' })
    if (path === `/api/v1/organizations/${organization.id}/notification-retention`) {
      if (route.request().method() === 'PUT') organizationRetention = route.request().postDataJSON()
      return json(route, organizationRetention)
    }
    if (path === `/api/v1/projects/${project.id}/notification-retention`) {
      if (route.request().method() === 'PUT') projectRetention = route.request().postDataJSON()
      if (route.request().method() === 'DELETE') projectRetention = null
      return json(route, {
        override: projectRetention,
        inherited: organizationRetention,
        effective: projectRetention ?? organizationRetention,
        source: projectRetention ? 'project' : 'organization',
      })
    }
    if (path === '/api/v1/build-info')
      return json(route, {
        service_version: '0.1.0',
        git_commit: 'abcdef',
        api_version: 'v1',
        required_database_migration: 26,
      })
    if (path === '/api/v1/setup/status') return json(route, { state: 'ready' })
    const authContext = {
      user: {
        id: '00000000-0000-4000-8000-000000000020',
        email: 'owner@example.com',
        email_verified: true,
        preferred_locale: preferredLocale,
      },
      organization,
      role,
    }
    if (path === '/api/v1/auth/me')
      return loggedIn
        ? json(route, authContext)
        : json(
            route,
            { error: 'unauthorized', message: 'Session required', request_id: 'auth-id' },
            401,
            'auth-id',
          )
    if (path === '/api/v1/auth/login' && route.request().method() === 'POST') {
      loggedIn = true
      return json(route, authContext)
    }
    if (path === '/api/v1/auth/register' && route.request().method() === 'POST') {
      return json(route, { status: 'accepted' }, 202)
    }
    if (path === '/api/v1/auth/logout' && route.request().method() === 'POST') {
      loggedIn = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/v1/auth/preferences' && route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { locale: 'en' | 'ru' }
      preferredLocale = body.locale
      return json(route, {
        ...authContext,
        user: { ...authContext.user, preferred_locale: preferredLocale },
      })
    }
    if (path === '/api/v1/auth/password' && route.request().method() === 'PUT')
      return json(route, authContext)
    if (!loggedIn)
      return json(
        route,
        { error: 'unauthorized', message: 'Session required', request_id: 'auth-id' },
        401,
        'auth-id',
      )
    if (path === '/api/v1/attention-summary')
      return json(route, {
        generated_at: attentionWindow.to,
        window: {
          ...attentionWindow,
          kind: url.searchParams.get('window') === '7d' ? '7d' : '24h',
        },
        totals: {
          new_discoveries: 1,
          open_discoveries: 1,
          acknowledged_discoveries: 0,
          changed_applications: 1,
          projects_with_notification_problems: 0,
          failed_notification_deliveries: 0,
          resource_regressions: 1,
        },
        priority_items: [resourceAttentionItem, attentionItem],
        changed_applications: [
          {
            ...attentionComparison,
            project: attentionItem.project,
            application: attentionItem.application,
            changed_at: targetRelease.deployed_at,
          },
        ],
        notification_problems: [],
        recommendations: [attentionRecommendation, resourceAttentionRecommendation],
      })
    if (path === '/api/v1/organization') return json(route, organization)
    if (path === '/api/v1/projects') return json(route, { items: [project], next_cursor: null })
    if (path === `/api/v1/projects/${project.id}`) return json(route, project)
    if (path === `/api/v1/projects/${project.id}/notification-health`)
      return json(route, {
        state: 'idle',
        delivery_enabled: true,
        enabled_destination_count: destinations.length,
        pending_count: 0,
        due_count: 0,
        retrying_count: 0,
        in_flight_count: 0,
        expired_lease_count: 0,
        failed_count: 0,
        oldest_due_age_seconds: null,
        observed_at: '2026-08-17T20:00:00Z',
      })
    const destinationBase = `/api/v1/projects/${project.id}/webhook-destinations`
    if (path === destinationBase && route.request().method() === 'GET')
      return json(route, destinations)
    if (path === destinationBase && route.request().method() === 'POST') {
      destinations = [destination]
      return json(route, { ...destination, secret: 'one-time-signing-secret' }, 201)
    }
    if (path === `${destinationBase}/${destination.id}` && route.request().method() === 'GET')
      return json(route, destinations[0] ?? destination)
    if (path === `${destinationBase}/${destination.id}` && route.request().method() === 'PATCH')
      return json(route, {
        ...destination,
        ...(route.request().postDataJSON() as object),
        revision: 2,
      })
    if (path === `${destinationBase}/${destination.id}/test`) {
      deliveries = [delivery]
      return json(route, delivery)
    }
    if (path === `${destinationBase}/${destination.id}/rotate-secret`)
      return json(route, { ...destination, secret: 'rotated-one-time-secret' })
    if (path === `${destinationBase}/${destination.id}/disable`) {
      destinations = [{ ...destination, enabled: false, disabled_at: '2026-08-17T13:00:00Z' }]
      return json(route, destinations[0])
    }
    const deliveryBase = `/api/v1/projects/${project.id}/notification-deliveries`
    if (path === deliveryBase) return json(route, { items: deliveries, next_cursor: null })
    if (path === `${deliveryBase}/bulk-retry`) {
      recoveries = [
        {
          ...recoveryOperation,
          command_type: 'bulk_retry',
          target_delivery_id: null as string | null,
        },
      ]
      return json(route, {
        operation_id: recoveryOperation.id,
        selected_count: 1,
        retried_count: 1,
        skipped_count: 0,
        remaining_count: 0,
        has_more: false,
        replayed: false,
        completed_at: recoveryOperation.completed_at,
      })
    }
    if (path === `${deliveryBase}/${delivery.id}/retry`) {
      recoveries = [recoveryOperation]
      return json(route, {
        operation_id: recoveryOperation.id,
        delivery_id: delivery.id,
        status: 'pending',
        recovery_generation: 1,
        current_attempt_count: 0,
        total_attempt_count: 1,
        replayed: false,
        completed_at: recoveryOperation.completed_at,
      })
    }
    if (path === `${deliveryBase}/${delivery.id}/cancel`) {
      recoveries = [
        { ...recoveryOperation, command_type: 'cancel', retried_count: 0, cancelled_count: 1 },
      ]
      return json(route, {
        operation_id: recoveryOperation.id,
        delivery_id: delivery.id,
        status: 'cancelled',
        recovery_generation: 0,
        current_attempt_count: 1,
        total_attempt_count: 1,
        replayed: false,
        completed_at: recoveryOperation.completed_at,
      })
    }
    if (path === `${deliveryBase}/${delivery.id}`)
      return json(route, {
        ...delivery,
        attempts: [
          {
            id: '00000000-0000-4000-8000-000000000012',
            recovery_generation: 0,
            attempt_number: 1,
            started_at: '2026-08-17T12:00:00Z',
            finished_at: '2026-08-17T12:00:01Z',
            duration_ms: 1000,
            outcome: 'retry',
            http_status: 503,
            error_class: null,
            response_excerpt: 'must not render',
          },
        ],
      })
    const recoveryBase = `/api/v1/projects/${project.id}/notification-recovery-operations`
    if (path === recoveryBase) return json(route, { items: recoveries, next_cursor: null })
    if (path === `${recoveryBase}/${recoveryOperation.id}`)
      return json(route, {
        ...(recoveries[0] ?? recoveryOperation),
        affected_deliveries: [
          {
            delivery_id: delivery.id,
            recovery_generation: 1,
            action: 'retried',
            created_at: recoveryOperation.completed_at,
          },
        ],
      })
    if (path === `/api/v1/projects/${project.id}/applications`)
      return json(route, { items: [application], next_cursor: null })
    if (path === `/api/v1/projects/${project.id}/applications/${application.id}/workers`)
      return json(route, {
        items: [
          {
            agent_id: '00000000-0000-4000-8000-000000000021',
            cluster_id: group.cluster_id,
            cluster_name: 'Production',
            node_name: 'worker-amd64-01',
            agent_version: '0.1.0',
            architecture: 'x86_64',
            kernel_release: '6.9.2',
            first_observed_at: '2026-08-17T10:00:00Z',
            last_observed_at: '2026-08-17T12:00:00Z',
            agent_last_seen_at: '2026-08-17T12:00:12Z',
          },
          {
            agent_id: '00000000-0000-4000-8000-000000000022',
            cluster_id: group.cluster_id,
            cluster_name: 'Production',
            node_name: 'worker-legacy-02',
            agent_version: '0.0.9',
            architecture: null,
            kernel_release: null,
            first_observed_at: '2026-08-16T10:00:00Z',
            last_observed_at: '2026-08-16T12:00:00Z',
            agent_last_seen_at: '2026-08-16T12:00:12Z',
          },
        ],
        next_cursor: null,
      })
    if (path === `/api/v1/projects/${project.id}/applications/${application.id}/attention-summary`)
      return json(route, {
        generated_at: attentionWindow.to,
        window: attentionWindow,
        project: attentionItem.project,
        application: attentionItem.application,
        totals: {
          new_discoveries: 1,
          open_discoveries: 1,
          acknowledged_discoveries: 0,
          new_runtime_items: 1,
          disappeared_runtime_items: 0,
          unchanged_runtime_items: 2,
          total_runtime_items: 3,
          resource_regressions: 1,
          policy: {
            factual_total: 4,
            actionable_total: 2,
            evaluation_pending: 0,
            expected: 2,
            requires_review: 0,
            policy_conflict: 0,
            unclassified: 2,
          },
        },
        release_comparison: attentionComparison,
        priority_items: [resourceAttentionItem, attentionItem],
        recommendations: [
          attentionRecommendation,
          resourceAttentionRecommendation,
          {
            ...attentionRecommendation,
            id: 'policy-unclassified',
            reason_code: 'policy_unclassified',
            facts: { reason_count: 2 },
            resource: {
              type: 'application',
              project_id: project.id,
              application_id: application.id,
            },
          },
        ],
      })
    if (path === `/api/v1/projects/${project.id}/applications/${application.id}`)
      return json(route, application)
    if (path === `${inventoryBase}/summary`)
      return json(route, {
        identity_version: 1,
        item_count: 5,
        occurrence_count: 144,
        first_seen_at: inventoryItem.first_seen_at,
        last_seen_at: inventoryItem.last_seen_at,
        kinds: [
          { kind: 'process', item_count: 1, occurrence_count: 12 },
          { kind: 'destination', item_count: 1, occurrence_count: 24 },
          { kind: 'domain', item_count: 1, occurrence_count: 30 },
          { kind: 'syscall', item_count: 1, occurrence_count: 60 },
          { kind: 'inbound_endpoint', item_count: 1, occurrence_count: 18 },
        ],
      })
    if (path === `${inventoryBase}/distribution`) {
      const kind = url.searchParams.get('kind') ?? 'process'
      const identity =
        kind === 'file_activity'
          ? {
              operation: 'rename',
              process_command: 'mv',
              path: '/tmp/old-<script>.txt',
              new_path: '/tmp/new.txt',
              replaced: null,
            }
          : kind === 'inbound_endpoint'
            ? {
                transport: 'tcp',
                address_family: 'ipv6',
                local_address: '::',
                local_port: 8080,
                listener_observed: true,
                accept_observed: true,
              }
            : kind === 'destination'
              ? {
                  process_command: 'gateway',
                  address_family: 'ipv4',
                  destination_address: '203.0.113.7',
                  destination_port: 443,
                }
              : kind === 'domain'
                ? { process_command: 'gateway', name: 'api.example.com', query_type: 'A' }
                : kind === 'syscall'
                  ? { process_command: 'gateway', syscall: 'epoll_wait' }
                  : inventoryItem.semantic_summary
      return json(route, {
        identity_version: 1,
        kind,
        total_item_count: 2,
        total_occurrence_count: 20,
        entries: [
          {
            identity_token: `${kind}-identity`,
            semantic_summary: identity,
            item_count: 1,
            occurrence_count: 16,
          },
        ],
        other: { item_count: 1, occurrence_count: 4 },
      })
    }
    if (path.startsWith(`${inventoryBase}/facets/`)) {
      const facet = path.split('/').at(-1) ?? 'scope'
      const values: Record<string, [string, string]> = {
        cluster: ['00000000-0000-4000-8000-000000000005', 'Primary cluster'],
        namespace: ['production', 'production'],
        workload_kind: ['Deployment', 'Deployment'],
        workload_name: ['gateway', 'gateway'],
        container_name: ['gateway', 'gateway'],
      }
      const [value, label] = values[facet] ?? ['value', 'value']
      return json(route, {
        items: [{ value, label, item_count: 1, occurrence_count: 12 }],
        next_cursor: null,
      })
    }
    if (path === inventoryBase) {
      if (url.searchParams.get('cursor') === 'terminal')
        return json(route, { items: [], next_cursor: null })
      const kind = url.searchParams.get('kind') ?? 'process'
      const identity =
        kind === 'file_activity'
          ? {
              operation: 'rename',
              process_command: 'mv',
              path: '/tmp/old-<script>.txt',
              new_path: '/tmp/new.txt',
              replaced: null,
            }
          : kind === 'inbound_endpoint'
            ? {
                transport: 'tcp',
                address_family: 'ipv6',
                local_address: '::',
                local_port: 8080,
                listener_observed: true,
                accept_observed: true,
              }
            : kind === 'destination'
              ? {
                  process_command: 'gateway',
                  address_family: 'ipv4',
                  destination_address: '203.0.113.7',
                  destination_port: 443,
                }
              : kind === 'domain'
                ? { process_command: 'gateway', name: 'api.example.com', query_type: 'A' }
                : kind === 'syscall'
                  ? { process_command: 'gateway', syscall: 'epoll_wait' }
                  : inventoryItem.semantic_summary
      return json(route, {
        items: [{ ...inventoryItem, inventory_kind: kind, semantic_summary: identity }],
        next_cursor: 'terminal',
      })
    }
    if (path === `${inventoryBase}/${inventoryItemId}`) return json(route, inventoryDetail)
    if (path === `${inventoryBase}/${inventoryItemId}/releases`)
      return json(route, {
        items: [
          {
            release_id: targetRelease.id,
            release_display_name: targetRelease.display_name,
            version: targetRelease.version,
            deployed_at: targetRelease.deployed_at,
            presence: 'observed',
            occurrence_count: 8,
            first_seen_at: inventoryItem.first_seen_at,
            last_seen_at: inventoryItem.last_seen_at,
            release_evidence_count: 55,
          },
          {
            release_id: baselineRelease.id,
            release_display_name: baselineRelease.display_name,
            version: baselineRelease.version,
            deployed_at: baselineRelease.deployed_at,
            presence: 'not_observed',
            occurrence_count: null,
            first_seen_at: null,
            last_seen_at: null,
            release_evidence_count: 48,
          },
        ],
        next_cursor: null,
      })
    if (path === `${inventoryBase}/${inventoryItemId}/sightings`)
      return json(route, {
        items: [
          {
            cluster_id: group.cluster_id,
            namespace: "<script>alert('scope')</script>",
            workload_kind: group.workload_kind,
            workload_name: "javascript:alert('workload')",
            pod_uid: 'pod-uid',
            pod_name: 'gateway-abc',
            container_name: 'gateway',
            occurrence_count: 12,
            first_seen_at: group.first_seen_at,
            last_seen_at: group.last_seen_at,
            policy_evaluation: policyEvaluation,
            active_suppression: null,
            actionable: true,
          },
        ],
        next_cursor: null,
      })
    if (path === `${inventoryBase}/${inventoryItemId}/groups`)
      return json(route, {
        items: [
          {
            id: group.id,
            cluster_id: group.cluster_id,
            namespace: group.namespace,
            workload_kind: group.workload_kind,
            workload_name: group.workload_name,
            event_kind: group.event_kind,
            status: groupStatus,
            first_seen_at: group.first_seen_at,
            last_seen_at: group.last_seen_at,
            occurrence_count: group.occurrence_count,
          },
        ],
        next_cursor: null,
      })
    if (path === `${inventoryBase}/${inventoryItemId}/occurrences`)
      return json(route, {
        items: [{ ...occurrence, cluster_id: group.cluster_id, pod_uid: 'pod-uid' }],
        next_cursor: null,
      })
    if (path === '/api/v1/runtime-groups')
      return json(route, { items: [{ ...group, status: groupStatus }], next_cursor: null })
    if (path === `/api/v1/runtime-groups/${group.id}/occurrences`)
      return json(route, {
        items: [occurrence],
        next_cursor: null,
        ordering: 'received_at_desc_observed_at_desc_id_desc',
      })
    const action = path.match(
      new RegExp(`/api/v1/runtime-groups/${group.id}/(acknowledge|resolve|reopen)$`),
    )?.[1]
    if (action && route.request().method() === 'POST') {
      groupStatus =
        action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : 'open'
      return json(route, {
        ...group,
        status: groupStatus,
        status_changed_at: '2026-08-17T13:00:00Z',
      })
    }
    if (path === `/api/v1/runtime-groups/${group.id}`)
      return json(route, {
        ...group,
        status: groupStatus,
        representative_event: occurrence,
        notification: { state: 'pending', delivery_count: 0, succeeded_count: 0, failed_count: 0 },
      })
    if (path === `/api/v1/projects/${project.id}/applications/${application.id}/releases`)
      return json(route, { items: releases, next_cursor: null })
    if (path === `/api/v1/projects/${project.id}/applications/${application.id}/resources`)
      return json(route, resourceHistoryFixture)
    if (
      path ===
      `/api/v1/projects/${project.id}/applications/${application.id}/releases/${targetRelease.id}/resource-comparison`
    )
      return json(route, resourceComparisonFixture)
    if (
      path ===
      `/api/v1/projects/${project.id}/applications/${application.id}/releases/${targetRelease.id}/runtime-diff`
    )
      return json(route, {
        baseline: baselineRelease,
        target: targetRelease,
        baseline_selection_source: 'transition',
        items: [
          {
            group_id: group.id,
            classification: 'new',
            event_kind: group.event_kind,
            semantic_summary: group.semantic_summary,
            baseline_occurrence_count: 0,
            baseline_first_seen_at: null,
            baseline_last_seen_at: null,
            target_occurrence_count: 12,
            target_first_seen_at: group.first_seen_at,
            target_last_seen_at: group.last_seen_at,
          },
        ],
        next_cursor: null,
      })
    if (
      path ===
      `/api/v1/projects/${project.id}/applications/${application.id}/releases/${targetRelease.id}/runtime-diff/summary`
    )
      return json(route, {
        baseline: baselineRelease,
        target: targetRelease,
        baseline_selection_source: 'transition',
        total_item_count: 1,
        classifications: [
          { classification: 'new', item_count: 1 },
          { classification: 'disappeared', item_count: 0 },
          { classification: 'unchanged', item_count: 0 },
        ],
        largest_changes: [
          {
            group_id: group.id,
            classification: 'new',
            event_kind: group.event_kind,
            semantic_summary: group.semantic_summary,
            baseline_occurrence_count: 0,
            target_occurrence_count: 12,
            occurrence_delta: 12,
          },
        ],
      })
    return json(
      route,
      { error: 'not_found', message: 'resource not found', request_id: 'missing-id' },
      404,
      'missing-id',
    )
  })
  return {
    organization,
    project,
    application,
    group,
    releases,
    destination,
    delivery,
    recoveryOperation,
  }
}

export async function authenticate(page: Page) {
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
}

import type {
  ApplicationAttentionSummary,
  OrganizationAttentionSummary,
} from '../../shared/api/types'

const project = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Commerce <script>alert(1)</script>',
  slug: 'commerce',
}
const application = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Checkout & API',
  slug: 'checkout',
}
const baseline = {
  id: '30000000-0000-4000-8000-000000000001',
  version: '1.0.0',
  display_name: 'Checkout 1.0.0',
  deployed_at: '2026-08-20T10:00:00Z',
}
const target = {
  id: '30000000-0000-4000-8000-000000000002',
  version: '1.1.0',
  display_name: 'Checkout 1.1.0',
  deployed_at: '2026-08-22T10:00:00Z',
}
const comparison = {
  target_release: target,
  baseline_release: baseline,
  new_count: 4,
  disappeared_count: 2,
  unchanged_count: 20,
  total_item_count: 26,
  absolute_occurrence_delta_sum: 128,
  max_absolute_occurrence_delta: 72,
  largest_changes: [
    {
      group_id: '40000000-0000-4000-8000-000000000001',
      classification: 'new' as const,
      baseline_occurrence_count: 0,
      target_occurrence_count: 72,
      occurrence_delta: 72,
    },
  ],
}
const policyTotals = {
  factual_total: 12,
  actionable_total: 12,
  evaluation_pending: 0,
  expected: 0,
  requires_review: 0,
  policy_conflict: 0,
  unclassified: 12,
}

export const populatedOrganizationAttentionFixture = {
  generated_at: '2026-08-22T12:00:00Z',
  window: { kind: '24h', from: '2026-08-21T12:00:00Z', to: '2026-08-22T12:00:00Z' },
  totals: {
    new_discoveries: 7,
    open_discoveries: 12,
    acknowledged_discoveries: 4,
    changed_applications: 1,
    projects_with_notification_problems: 1,
    failed_notification_deliveries: 14,
    resource_regressions: 0,
    policy: policyTotals,
  },
  priority_items: [
    {
      id: 'notification:commerce',
      kind: 'notification_delivery_failing',
      priority: 'urgent',
      reason_code: 'notification_health_failing',
      facts: { reason_count: 14, failed_count: 14 },
      occurred_at: '2026-08-22T11:58:00Z',
      project,
      resource: { type: 'project', project_id: project.id },
    },
    {
      id: 'discovery:checkout',
      kind: 'open_discovery',
      priority: 'normal',
      reason_code: 'discovery_open',
      facts: { reason_count: 7, occurrence_count: 31 },
      occurred_at: '2026-08-22T11:30:00Z',
      project,
      application,
      resource: {
        type: 'runtime_group',
        project_id: project.id,
        application_id: application.id,
        runtime_group_id: '40000000-0000-4000-8000-000000000001',
        event_kind: 'process.exec',
        semantic_summary: { executable: 'checkout' },
        namespace: 'production',
        workload_kind: 'Deployment',
        workload_name: 'checkout',
      },
    },
    {
      id: 'restart-loop:checkout:api',
      kind: 'container_restart_loop',
      priority: 'normal',
      reason_code: 'container_restart_loop_observed',
      facts: {
        reason_count: 1,
        restart_loop: {
          projection_version: 1,
          threshold: 3,
          observed_restart_count: 4,
          window_started_at: '2026-08-22T11:40:00Z',
          window_ended_at: '2026-08-22T11:50:00Z',
          container_name: 'api',
        },
      },
      occurred_at: '2026-08-22T11:50:00Z',
      project,
      application,
      resource: {
        type: 'runtime_group',
        project_id: project.id,
        application_id: application.id,
        runtime_group_id: '40000000-0000-4000-8000-000000000009',
        event_kind: 'container.restart_loop',
        semantic_summary: {
          evidence_source: 'derived',
          projection_version: 1,
          threshold: 3,
          window_started_at: '2026-08-22T11:40:00Z',
          window_ended_at: '2026-08-22T11:50:00Z',
          observed_restart_count: 4,
          container_name: 'api',
        },
        namespace: 'production',
        workload_kind: 'Deployment',
        workload_name: 'checkout',
      },
    },
  ],
  changed_applications: [{ ...comparison, project, application, changed_at: target.deployed_at }],
  notification_problems: [
    {
      project,
      state: 'failing',
      delivery_enabled: true,
      enabled_destination_count: 1,
      pending_count: 3,
      due_count: 2,
      retrying_count: 1,
      in_flight_count: 0,
      expired_lease_count: 0,
      failed_count: 14,
      oldest_due_age_seconds: 920,
      observed_at: '2026-08-22T11:59:00Z',
      priority: 'urgent',
      reason_code: 'notification_health_failing',
    },
  ],
  recommendations: [
    {
      id: 'review-failed:commerce',
      kind: 'review_failed_deliveries',
      priority: 'urgent',
      reason_code: 'notification_health_failing',
      facts: { reason_count: 14, failed_count: 14 },
      project,
      resource: { type: 'project', project_id: project.id },
      created_from_snapshot_at: '2026-08-22T12:00:00Z',
    },
    {
      id: 'review-changes:checkout',
      kind: 'review_release_changes',
      priority: 'high',
      reason_code: 'release_runtime_changed',
      facts: { reason_count: 6, new_count: 4, disappeared_count: 2 },
      project,
      application,
      resource: {
        type: 'runtime_diff',
        project_id: project.id,
        application_id: application.id,
        target_release_id: target.id,
        target_release_display_name: target.display_name,
        baseline_release_id: baseline.id,
        baseline_release_display_name: baseline.display_name,
      },
      created_from_snapshot_at: '2026-08-22T12:00:00Z',
    },
  ],
} satisfies OrganizationAttentionSummary

export const allClearOrganizationAttentionFixture = {
  ...populatedOrganizationAttentionFixture,
  totals: {
    new_discoveries: 0,
    open_discoveries: 0,
    acknowledged_discoveries: 0,
    changed_applications: 0,
    projects_with_notification_problems: 0,
    failed_notification_deliveries: 0,
    resource_regressions: 0,
    policy: { ...policyTotals, factual_total: 0, actionable_total: 0, unclassified: 0 },
  },
  priority_items: [],
  changed_applications: [],
  notification_problems: [],
  recommendations: [],
} satisfies OrganizationAttentionSummary

export const populatedApplicationAttentionFixture = {
  generated_at: populatedOrganizationAttentionFixture.generated_at,
  window: populatedOrganizationAttentionFixture.window,
  project,
  application,
  totals: {
    new_discoveries: 7,
    open_discoveries: 12,
    acknowledged_discoveries: 4,
    new_runtime_items: 4,
    disappeared_runtime_items: 2,
    unchanged_runtime_items: 20,
    total_runtime_items: 26,
    resource_regressions: 0,
    policy: policyTotals,
  },
  release_comparison: comparison,
  priority_items: [
    populatedOrganizationAttentionFixture.priority_items[1]!,
    populatedOrganizationAttentionFixture.priority_items[2]!,
  ],
  recommendations: [populatedOrganizationAttentionFixture.recommendations[1]!],
} satisfies ApplicationAttentionSummary

const policyReasons = [
  ['policy_review_required', 4],
  ['policy_conflict', 2],
  ['policy_unclassified', 6],
  ['policy_evaluation_pending', 2],
] as const

export const policyAwareApplicationAttentionFixture = {
  ...populatedApplicationAttentionFixture,
  totals: {
    ...populatedApplicationAttentionFixture.totals,
    policy: {
      factual_total: 20,
      actionable_total: 12,
      evaluation_pending: 2,
      expected: 6,
      requires_review: 4,
      policy_conflict: 2,
      unclassified: 6,
    },
  },
  priority_items: [
    ...populatedApplicationAttentionFixture.priority_items,
    {
      id: 'policy-priority:checkout',
      kind: 'open_discovery',
      priority: 'high',
      reason_code: 'policy_conflict',
      facts: { reason_count: 2 },
      occurred_at: '2026-08-22T11:45:00Z',
      project,
      application,
      resource: { type: 'application', project_id: project.id, application_id: application.id },
    },
  ],
  recommendations: [
    ...populatedApplicationAttentionFixture.recommendations,
    ...policyReasons.map(([reason_code, reason_count]) => ({
      id: `policy-recommendation:${reason_code}`,
      kind: 'review_new_discoveries' as const,
      priority: reason_code === 'policy_conflict' ? ('high' as const) : ('normal' as const),
      reason_code,
      facts: { reason_count },
      project,
      application,
      resource: {
        type: 'application' as const,
        project_id: project.id,
        application_id: application.id,
      },
      created_from_snapshot_at: '2026-08-22T12:00:00Z',
    })),
  ],
} satisfies ApplicationAttentionSummary

export const unavailableApplicationAttentionFixture = {
  ...populatedApplicationAttentionFixture,
  totals: {
    ...populatedApplicationAttentionFixture.totals,
    new_runtime_items: 0,
    disappeared_runtime_items: 0,
    unchanged_runtime_items: 0,
    total_runtime_items: 0,
    policy: { ...policyTotals, factual_total: 0, actionable_total: 0, unclassified: 0 },
  },
  release_comparison: null,
  priority_items: [],
  recommendations: [],
} satisfies ApplicationAttentionSummary

const resourceCoverage = {
  covered_seconds: 1740,
  expected_seconds: 1800,
  ratio: 0.9667,
  sample_count: 116,
  contributor_count: 30,
  observed_replicas: 2,
  ready_replicas: 2,
  complete: true,
}
const resourceBaselineWindow = {
  from: '2026-08-22T09:30:00Z',
  to: '2026-08-22T10:00:00Z',
  duration_seconds: 1800,
  release: { id: baseline.id, display_name: baseline.display_name },
  episode_id: '60000000-0000-4000-8000-000000000001',
  coverage: resourceCoverage,
}
const resourceTargetWindow = {
  ...resourceBaselineWindow,
  from: '2026-08-22T10:10:00Z',
  to: '2026-08-22T10:40:00Z',
  release: { id: target.id, display_name: target.display_name },
  episode_id: '60000000-0000-4000-8000-000000000002',
}
const resourceFacts = {
  reason_count: 1,
  resource_regression: {
    finding_id: '60000000-0000-4000-8000-000000000003',
    reason_code: 'cpu_throttling_increased' as const,
    metric: 'cpu_throttled_period_ratio' as const,
    unit: 'ratio' as const,
    rule_version: 1,
    threshold: 0.05,
    sustained_buckets: 3,
    baseline: 0.01,
    target: 0.18,
    change: 0.17,
    baseline_window: resourceBaselineWindow,
    target_window: resourceTargetWindow,
  },
}
const resourceReference = {
  type: 'resource_comparison' as const,
  project_id: project.id,
  application_id: application.id,
  target_release_id: target.id,
  from: resourceTargetWindow.from,
  to: resourceTargetWindow.to,
}

export const resourceRegressionApplicationAttentionFixture = {
  ...populatedApplicationAttentionFixture,
  totals: { ...populatedApplicationAttentionFixture.totals, resource_regressions: 1 },
  priority_items: [
    {
      id: 'resource-regression:checkout',
      kind: 'resource_regression',
      priority: 'high',
      reason_code: 'cpu_throttling_increased',
      facts: resourceFacts,
      occurred_at: resourceTargetWindow.to,
      project,
      application,
      resource: resourceReference,
    },
  ],
  recommendations: [
    {
      id: 'review-resource-regression:checkout',
      kind: 'review_resource_regression',
      priority: 'high',
      reason_code: 'cpu_throttling_increased',
      facts: resourceFacts,
      project,
      application,
      resource: resourceReference,
      created_from_snapshot_at: resourceTargetWindow.to,
    },
  ],
} satisfies ApplicationAttentionSummary

export const boundaryOrganizationAttentionFixture = {
  ...populatedOrganizationAttentionFixture,
  priority_items: Array.from({ length: 50 }, (_, index) => ({
    ...populatedOrganizationAttentionFixture.priority_items[1]!,
    id: `boundary-${index}`,
  })),
  changed_applications: Array.from(
    { length: 10 },
    () => populatedOrganizationAttentionFixture.changed_applications[0]!,
  ),
  recommendations: Array.from({ length: 10 }, (_, index) => ({
    ...populatedOrganizationAttentionFixture.recommendations[1]!,
    id: `recommendation-${index}`,
  })),
} satisfies OrganizationAttentionSummary

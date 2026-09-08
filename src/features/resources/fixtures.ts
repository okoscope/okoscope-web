import type {
  ApplicationResourceHistory,
  ReleaseResourceComparison,
  ResourceCoverage,
} from '../../shared/api/types'

export const completeCoverage: ResourceCoverage = {
  covered_seconds: 120,
  expected_seconds: 120,
  ratio: 1,
  sample_count: 8,
  contributor_count: 2,
  observed_replicas: 2,
  ready_replicas: 2,
  complete: true,
}

const baselineRelease = {
  id: '30000000-0000-4000-8000-000000000001',
  display_name: 'Gateway 1.7',
}
const targetRelease = {
  id: '30000000-0000-4000-8000-000000000002',
  display_name: 'Gateway 1.8',
}

export const resourceHistoryFixture = {
  metric: 'memory_current_bytes',
  unit: 'bytes',
  step: 'minute',
  normalization: 'per_ready_replica',
  from: '2026-09-07T11:58:00Z',
  to: '2026-09-07T12:02:00Z',
  availability: 'available',
  containers: ['api', 'sidecar'],
  releases: [{ release: targetRelease, observed_at: '2026-09-07T12:00:00Z' }],
  points: [
    {
      from: '2026-09-07T11:58:00Z',
      to: '2026-09-07T11:59:00Z',
      value: 440_401_920,
      availability: 'available',
      coverage: completeCoverage,
      release: baselineRelease,
      container: 'api',
      limit: { value: 1_073_741_824, unit: 'bytes' },
    },
    {
      from: '2026-09-07T11:59:00Z',
      to: '2026-09-07T12:00:00Z',
      value: null,
      availability: 'insufficient_coverage',
      coverage: {
        ...completeCoverage,
        covered_seconds: 30,
        ratio: 0.25,
        sample_count: 2,
        contributor_count: 1,
        observed_replicas: 1,
        complete: false,
      },
      release: null,
      container: 'api',
      limit: null,
    },
    {
      from: '2026-09-07T12:00:00Z',
      to: '2026-09-07T12:01:00Z',
      value: 639_631_360,
      availability: 'available',
      coverage: completeCoverage,
      release: targetRelease,
      container: 'api',
      limit: { value: 1_073_741_824, unit: 'bytes' },
    },
  ],
} satisfies ApplicationResourceHistory

const comparisonWindow = (release: typeof targetRelease, hour: string) => ({
  from: `2026-09-07T${hour}:00:00Z`,
  to: `2026-09-07T${hour}:30:00Z`,
  duration_seconds: 1800,
  release,
  episode_id:
    release.id === targetRelease.id
      ? '40000000-0000-4000-8000-000000000002'
      : '40000000-0000-4000-8000-000000000001',
  coverage: { ...completeCoverage, covered_seconds: 1740, expected_seconds: 1800, ratio: 0.9667 },
})

export const resourceComparisonFixture = {
  state: 'comparable',
  interpretation: 'observed_after_release',
  baseline_selection_source: 'transition',
  baseline_window: comparisonWindow(baselineRelease, '10'),
  target_window: comparisonWindow(targetRelease, '11'),
  collection_progress: 1,
  metrics: [
    {
      metric: 'cpu_throttled_period_ratio',
      unit: 'ratio',
      state: 'comparable',
      interpretation: 'resource_pressure',
      availability: 'available',
      baseline: 0.01,
      target: 0.18,
      absolute_change: 0.17,
      relative_change: 17,
      percentage_point_change: 17,
      limit: null,
    },
    {
      metric: 'memory_current_bytes',
      unit: 'bytes',
      state: 'comparable',
      interpretation: 'observed_increase',
      availability: 'available',
      baseline: 440_401_920,
      target: 639_631_360,
      absolute_change: 199_229_440,
      relative_change: 0.4524,
      percentage_point_change: null,
      limit: { value: 1_073_741_824, unit: 'bytes' },
    },
  ],
  findings: [
    {
      id: '50000000-0000-4000-8000-000000000001',
      reason_code: 'cpu_throttling_increased',
      priority: 'high',
      metric: 'cpu_throttled_period_ratio',
      rule_version: 1,
      threshold: 0.05,
      sustained_buckets: 3,
      baseline: 0.01,
      target: 0.18,
      change: 0.17,
    },
  ],
} satisfies ReleaseResourceComparison

export const collectingComparisonFixture = {
  ...resourceComparisonFixture,
  state: 'collecting',
  baseline_window: null,
  target_window: null,
  collection_progress: 0.4,
  metrics: [],
  findings: [],
} satisfies ReleaseResourceComparison

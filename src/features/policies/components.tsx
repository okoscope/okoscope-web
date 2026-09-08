import type {
  ActivePolicySuppression,
  PolicyEvaluation,
  PolicyPlacementMatcher,
  PolicySuppression,
} from '../../shared/api/types'
import { useT } from '../../shared/i18n'
import { formatTimestamp } from '../tenant/format'

export function PolicyEffectBadge({
  effect,
}: {
  effect: 'expected' | 'requires_review' | null | undefined
}) {
  const t = useT()
  const presentation = effect
    ? {
        expected: [t('expected'), 'border-emerald-700 bg-emerald-950 text-emerald-200'],
        requires_review: [t('requiresReview'), 'border-amber-700 bg-amber-950 text-amber-200'],
      }[effect]
    : [t('unclassified'), 'border-slate-600 bg-slate-900 text-slate-200']

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${presentation[1]}`}
    >
      {presentation[0]}
    </span>
  )
}

export function PolicyVerdictBadge({ evaluation }: { evaluation: PolicyEvaluation }) {
  if (evaluation.state === 'evaluation_pending')
    return (
      <span className="inline-flex rounded-full border px-2 py-1 text-xs font-bold border-violet-700 bg-violet-950 text-violet-200">
        Evaluating policy
      </span>
    )
  const verdict = evaluation.verdict ?? 'unclassified'
  const copy = {
    unclassified: ['Unclassified', 'border-slate-600 bg-slate-900 text-slate-200'],
    expected: ['Expected', 'border-emerald-700 bg-emerald-950 text-emerald-200'],
    requires_review: ['Requires review', 'border-amber-700 bg-amber-950 text-amber-200'],
    policy_conflict: ['Policy conflict', 'border-rose-700 bg-rose-950 text-rose-200'],
  }[verdict]
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${copy[1]}`}>
      {copy[0]}
    </span>
  )
}

export function SuppressionBadge({ suppression }: { suppression: ActivePolicySuppression | null }) {
  if (!suppression) return null
  return (
    <span
      className="inline-flex rounded-full border px-2 py-1 text-xs font-bold border-sky-700 bg-sky-950 text-sky-200"
      title={`${suppression.reason}. Expires ${formatTimestamp(suppression.expires_at)}`}
    >
      Suppressed until {formatTimestamp(suppression.expires_at)}
    </span>
  )
}

export function PolicyState({
  evaluation,
  suppression,
}: {
  evaluation: PolicyEvaluation
  suppression: ActivePolicySuppression | null
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <PolicyVerdictBadge evaluation={evaluation} />
      <SuppressionBadge suppression={suppression} />
    </div>
  )
}

export const placementSummary = (placement: PolicyPlacementMatcher) => {
  const dimensions = [
    ['clusters', placement.cluster_ids],
    ['namespaces', placement.namespaces],
    ['workload kinds', placement.workload_kinds],
    ['workloads', placement.workload_names],
  ] as const
  const constrained = dimensions.filter(([, values]) => values?.length)
  return constrained.length
    ? constrained.map(([label, values]) => `${label}: ${values?.join(', ')}`).join(' · ')
    : 'All application placements'
}

export const suppressionBehaviorSummary = ({
  behavior_matcher: matcher,
}: Pick<PolicySuppression, 'behavior_matcher'>) => {
  switch (matcher.kind) {
    case 'process':
      return matcher.executable
    case 'destination':
      return `${matcher.process_command} → ${matcher.destination_address}:${matcher.destination_port} (${matcher.address_family})`
    case 'domain':
      return `${matcher.process_command} → ${matcher.name} (${matcher.query_type})`
    case 'syscall':
      return `${matcher.process_command} → ${matcher.syscall}`
    case 'inbound_endpoint':
      return `${matcher.transport.toUpperCase()} ${matcher.local_address}:${matcher.local_port}`
    case 'file_activity':
      return `${matcher.process_command} → ${matcher.operation} ${matcher.path}${matcher.new_path ? ` → ${matcher.new_path}` : ''}`
    case 'lifecycle_process_exit':
    case 'lifecycle_container_termination':
    case 'lifecycle_container_restart':
      return [
        matcher.kind.replaceAll('_', ' '),
        matcher.identity,
        matcher.container_name,
        matcher.reason,
      ]
        .filter(Boolean)
        .join(' · ')
  }
}

export function PolicyFilters({
  verdict,
  suppressed,
  evaluationPending,
  onChange,
}: {
  verdict?: string | undefined
  suppressed?: boolean | undefined
  evaluationPending?: boolean | undefined
  onChange: (value: {
    verdict?: 'unclassified' | 'expected' | 'requires_review' | 'policy_conflict' | undefined
    suppressed?: boolean | undefined
    evaluation_pending?: boolean | undefined
  }) => void
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-3">
      <legend className="sr-only">Policy state filters</legend>
      <label className="text-sm">
        Policy verdict
        <select
          value={verdict ?? ''}
          onChange={(event) =>
            onChange({
              verdict: (event.target.value || undefined) as
                'unclassified' | 'expected' | 'requires_review' | 'policy_conflict' | undefined,
            })
          }
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
        >
          <option value="">Any verdict</option>
          <option value="unclassified">Unclassified</option>
          <option value="expected">Expected</option>
          <option value="requires_review">Requires review</option>
          <option value="policy_conflict">Policy conflict</option>
        </select>
      </label>
      <label className="text-sm">
        Suppression
        <select
          value={suppressed === undefined ? '' : String(suppressed)}
          onChange={(event) =>
            onChange({
              suppressed: event.target.value === '' ? undefined : event.target.value === 'true',
            })
          }
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
        >
          <option value="">Any</option>
          <option value="false">Not suppressed</option>
          <option value="true">Suppressed</option>
        </select>
      </label>
      <label className="text-sm">
        Evaluation
        <select
          value={evaluationPending === undefined ? '' : String(evaluationPending)}
          onChange={(event) =>
            onChange({
              evaluation_pending:
                event.target.value === '' ? undefined : event.target.value === 'true',
            })
          }
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2"
        >
          <option value="">Any</option>
          <option value="false">Current</option>
          <option value="true">Pending</option>
        </select>
      </label>
    </fieldset>
  )
}

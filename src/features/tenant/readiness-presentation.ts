import type { ConnectionReadiness } from '../../shared/api/types'
import type { MessageKey } from '../../shared/i18n'

type ReadinessState = ConnectionReadiness['state']
type ReadinessReason = Exclude<ConnectionReadiness['reason'], null | undefined>

export type ReadinessPresentation = {
  statusKey: MessageKey
  explanationKey: MessageKey
  actionKey?: MessageKey
  actionInOnboarding: boolean
}

export type ReadinessTone = 'positive' | 'warning' | 'critical' | 'neutral'

const states: Record<ReadinessState, Omit<ReadinessPresentation, 'statusKey'>> = {
  credential_created: {
    explanationKey: 'readinessHelp_credential_created',
    actionKey: 'healthActionInstallAgent',
    actionInOnboarding: true,
  },
  waiting_for_agent: {
    explanationKey: 'readinessHelp_waiting_for_agent',
    actionKey: 'healthActionCheckAgent',
    actionInOnboarding: true,
  },
  agent_authenticated: {
    explanationKey: 'readinessHelp_agent_authenticated',
    actionKey: 'healthActionReviewInstallation',
    actionInOnboarding: true,
  },
  workload_not_matched: {
    explanationKey: 'healthReasonSelectorNoMatch',
    actionKey: 'healthActionReviseSelector',
    actionInOnboarding: true,
  },
  permission_denied: {
    explanationKey: 'readinessHelp_permission_denied',
    actionKey: 'healthActionReviewRbac',
    actionInOnboarding: true,
  },
  kernel_unsupported: {
    explanationKey: 'readinessHelp_kernel_unsupported',
    actionKey: 'healthActionReviewAgentLogs',
    actionInOnboarding: false,
  },
  waiting_for_event: {
    explanationKey: 'readinessHelp_waiting_for_event',
    actionKey: 'healthActionGenerateTraffic',
    actionInOnboarding: false,
  },
  receiving_events: {
    explanationKey: 'readinessHelp_receiving_events',
    actionInOnboarding: false,
  },
  stale: {
    explanationKey: 'readinessHelp_stale',
    actionKey: 'healthActionCheckAgent',
    actionInOnboarding: true,
  },
  credential_revoked: {
    explanationKey: 'readinessHelp_credential_revoked',
    actionKey: 'healthActionReplaceCredential',
    actionInOnboarding: true,
  },
}

const reasons: Record<
  ReadinessReason,
  Pick<ReadinessPresentation, 'explanationKey' | 'actionKey' | 'actionInOnboarding'>
> = {
  selector_no_match: {
    explanationKey: 'healthReasonSelectorNoMatch',
    actionKey: 'healthActionReviseSelector',
    actionInOnboarding: true,
  },
  kubernetes_watch_forbidden: {
    explanationKey: 'healthReasonKubernetesWatchForbidden',
    actionKey: 'healthActionReviewRbac',
    actionInOnboarding: true,
  },
  ebpf_unavailable: {
    explanationKey: 'healthReasonEbpfUnavailable',
    actionKey: 'healthActionReviewAgentLogs',
    actionInOnboarding: false,
  },
  btf_unavailable: {
    explanationKey: 'healthReasonBtfUnavailable',
    actionKey: 'healthActionReviewAgentLogs',
    actionInOnboarding: false,
  },
  event_not_observed: {
    explanationKey: 'healthReasonEventNotObserved',
    actionKey: 'healthActionGenerateTraffic',
    actionInOnboarding: false,
  },
}

export function getReadinessPresentation(readiness: ConnectionReadiness): ReadinessPresentation {
  const state = states[readiness.state]
  const reason = readiness.reason ? reasons[readiness.reason] : undefined
  return {
    statusKey: `readiness_${readiness.state}`,
    ...(reason ?? state),
  }
}

export function getReadinessTone(state: ReadinessState): ReadinessTone {
  if (state === 'receiving_events') return 'positive'
  if (state === 'credential_revoked' || state === 'permission_denied') return 'critical'
  if (state === 'workload_not_matched' || state === 'kernel_unsupported' || state === 'stale')
    return 'warning'
  return 'neutral'
}

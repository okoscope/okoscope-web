import type {
  ContainerRestartLoopPayload,
  ContainerRestartPayload,
  ContainerTerminationPayload,
  EventCorrelation,
  EvidenceSource,
  InventoryKind,
  ProcessExitPayload,
  ProcessTermination,
  RuntimeGroup,
} from '../../shared/api/types'

export type EvidencePresentation = {
  label: string
  description: string
  className: string
}

export const evidencePresentation: Record<EvidenceSource | 'unknown', EvidencePresentation> = {
  kernel: {
    label: 'Kernel evidence',
    description: 'Observed by the Linux kernel.',
    className: 'border-sky-700 bg-sky-950 text-sky-200',
  },
  kubernetes: {
    label: 'Kubernetes evidence',
    description: 'Reported by Kubernetes or the container runtime.',
    className: 'border-violet-700 bg-violet-950 text-violet-200',
  },
  derived: {
    label: 'Derived finding',
    description: 'Derived from a bounded, versioned set of observations.',
    className: 'border-cyan-700 border-dashed bg-cyan-950 text-cyan-200',
  },
  unknown: {
    label: 'Evidence source unavailable',
    description: 'This older or future event does not expose a recognized evidence source.',
    className: 'border-slate-600 bg-slate-900 text-slate-300',
  },
}

export const correlationPresentation = (correlation?: EventCorrelation) => {
  if (!correlation || correlation.status === 'absent')
    return { label: 'Not correlated', description: 'No qualified related event is available.' }
  if (correlation.status === 'qualified')
    return {
      label: 'Correlated evidence',
      description: 'The server qualified related evidence for the same trusted runtime context.',
    }
  return {
    label: 'Ambiguous correlation',
    description: `${correlation.candidate_count} possible matches were found; none was selected.`,
  }
}

type TerminationTranslator = (
  key:
    | 'processExitedStatus'
    | 'nativeKernelExitStatus'
    | 'processTerminatedBySignal'
    | 'conventionalExitCode'
    | 'sigkillEvidenceUnknown'
    | 'signalEvidenceSenderUnknown'
    | 'coreDumpFlagUnconfirmed',
  values?: Record<string, string | number>,
) => string

export const terminationText = (termination: ProcessTermination, t: TerminationTranslator) =>
  termination.type === 'exited'
    ? {
        primary: t('processExitedStatus', { status: termination.status }),
        explanation: t('nativeKernelExitStatus'),
      }
    : {
        primary: t('processTerminatedBySignal', {
          signalName: termination.signal_name,
          signal: termination.signal,
        }),
        conventional:
          termination.conventional_exit_code === undefined
            ? undefined
            : t('conventionalExitCode', { code: termination.conventional_exit_code }),
        explanation:
          termination.signal_name === 'SIGKILL'
            ? t('sigkillEvidenceUnknown')
            : t('signalEvidenceSenderUnknown'),
        coreFlag: termination.core_dump_flag ? t('coreDumpFlagUnconfirmed') : undefined,
      }

export type TerminationPayload =
  | ProcessExitPayload
  | ContainerTerminationPayload
  | ContainerRestartPayload
  | ContainerRestartLoopPayload

export const isTerminationPayload = (value: unknown): value is TerminationPayload =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  ['ProcessExit', 'ContainerTermination', 'ContainerRestart', 'ContainerRestartLoop'].includes(
    String(value.type),
  )

type ActivityPresentation = {
  itemLabel: string
  countLabel: string
  behaviorLabel: string
}

const activityCopy: Record<InventoryKind, ActivityPresentation> = {
  process: {
    itemLabel: 'Process launches',
    countLabel: 'launches',
    behaviorLabel: 'Process launch',
  },
  destination: {
    itemLabel: 'Outbound connections',
    countLabel: 'connection observations',
    behaviorLabel: 'Outbound connection',
  },
  domain: { itemLabel: 'Domains', countLabel: 'DNS observations', behaviorLabel: 'DNS request' },
  syscall: { itemLabel: 'System calls', countLabel: 'observations', behaviorLabel: 'System call' },
  inbound_endpoint: {
    itemLabel: 'Inbound connections',
    countLabel: 'inbound observations',
    behaviorLabel: 'Inbound connection',
  },
  file_activity: {
    itemLabel: 'File activity',
    countLabel: 'file activity observations',
    behaviorLabel: 'File activity',
  },
  lifecycle: {
    itemLabel: 'Lifecycle events',
    countLabel: 'lifecycle observations',
    behaviorLabel: 'Lifecycle event',
  },
}

export function getActivityPresentation(kind: InventoryKind): ActivityPresentation {
  return activityCopy[kind]
}

export function getEventKindLabel(
  eventKind: string,
  summary?: RuntimeGroup['semantic_summary'],
): string {
  if (summary) {
    if ('executable' in summary) return 'Process launch'
    if ('destination_address' in summary) return 'Outbound connection'
    if ('name' in summary && 'query_type' in summary) return 'DNS request'
    if ('syscall' in summary) return 'System call'
    if ('local_address' in summary)
      return eventKind === 'network.accept' ? 'Accepted inbound connection' : 'Opened port'
    if ('operation' in summary && 'path' in summary) return `File ${String(summary.operation)}`
  }
  const known: Record<string, string> = {
    ProcessExec: 'Process launch',
    NetworkConnect: 'Outbound connection',
    NetworkDnsQuery: 'DNS request',
    NetworkDnsResponse: 'DNS response',
    Syscall: 'System call',
    'network.listen': 'Opened port',
    'network.accept': 'Accepted inbound connection',
    NetworkListen: 'Opened port',
    NetworkAccept: 'Accepted inbound connection',
    'file.create': 'File create',
    'file.modify': 'File modify',
    'file.delete': 'File delete',
    'file.rename': 'File rename',
    'process.exit': 'Process terminated',
    ProcessExit: 'Process terminated',
    'container.terminated': 'Container terminated',
    ContainerTermination: 'Container terminated',
    'container.restart': 'Container restarted',
    ContainerRestart: 'Container restarted',
    'container.restart_loop': 'Restart loop observed',
    ContainerRestartLoop: 'Restart loop observed',
  }
  return known[eventKind] ?? 'Observed activity'
}

export type AddressFamily = 'ipv4' | 'ipv6'

export function formatEndpoint(
  addressFamily: AddressFamily,
  address: string,
  port: number,
): string {
  return addressFamily === 'ipv6' ? `[${address}]:${Number(port)}` : `${address}:${Number(port)}`
}

export function getWildcardEndpointLabel(
  addressFamily: AddressFamily,
  address: string,
): string | undefined {
  if (addressFamily === 'ipv4' && address === '0.0.0.0') return 'All IPv4 interfaces'
  if (addressFamily === 'ipv6' && address === '::') return 'All IPv6 interfaces'
  return undefined
}

export const directionLabel = (direction: 'egress' | 'ingress') =>
  direction === 'egress' ? 'Outgoing' : 'Incoming'

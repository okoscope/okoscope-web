import type { FileActivityOperation, InventoryKind } from '../../shared/api/types'

export type InventorySearch = {
  kind: InventoryKind
  operation?: FileActivityOperation | undefined
  release_id?: string | undefined
  cluster_id?: string | undefined
  namespace?: string | undefined
  workload_kind?: string | undefined
  workload_name?: string | undefined
  container_name?: string | undefined
  observed_from?: string | undefined
  observed_to?: string | undefined
  search?: string | undefined
  identity_token?: string | undefined
  verdict?: 'unclassified' | 'expected' | 'requires_review' | 'policy_conflict' | undefined
  suppressed?: boolean | undefined
  evaluation_pending?: boolean | undefined
  cursor?: string | undefined
}
export type InventoryEvidence = 'releases' | 'sightings' | 'groups' | 'occurrences'
export type InventoryDetailSearch = { evidence: InventoryEvidence; cursor?: string | undefined }

const text = (value: unknown, max = 253) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
const timestamp = (value: unknown) => {
  const parsed = text(value)
  return parsed && !Number.isNaN(Date.parse(parsed)) ? parsed : undefined
}
const compact = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T

export function parseInventorySearch(input: Record<string, unknown>): InventorySearch {
  const kind: InventoryKind = [
    'process',
    'destination',
    'domain',
    'syscall',
    'inbound_endpoint',
    'file_activity',
    'lifecycle',
  ].includes(String(input.kind))
    ? (input.kind as InventoryKind)
    : 'process'
  return compact({
    kind,
    operation: ['create', 'modify', 'delete', 'rename'].includes(String(input.operation))
      ? (input.operation as FileActivityOperation)
      : undefined,
    release_id: text(input.release_id),
    cluster_id: text(input.cluster_id),
    namespace: text(input.namespace),
    workload_kind: text(input.workload_kind),
    workload_name: text(input.workload_name),
    container_name: text(input.container_name),
    observed_from: timestamp(input.observed_from),
    observed_to: timestamp(input.observed_to),
    search: text(input.search, 200),
    identity_token: text(input.identity_token, 1000),
    verdict: ['unclassified', 'expected', 'requires_review', 'policy_conflict'].includes(
      String(input.verdict),
    )
      ? (input.verdict as InventorySearch['verdict'])
      : undefined,
    suppressed:
      input.suppressed === true || input.suppressed === 'true'
        ? true
        : input.suppressed === false || input.suppressed === 'false'
          ? false
          : undefined,
    evaluation_pending:
      input.evaluation_pending === true || input.evaluation_pending === 'true'
        ? true
        : input.evaluation_pending === false || input.evaluation_pending === 'false'
          ? false
          : undefined,
    cursor: text(input.cursor, 2000),
  })
}

export function parseInventoryDetailSearch(input: Record<string, unknown>): InventoryDetailSearch {
  const evidence: InventoryEvidence = ['releases', 'sightings', 'groups', 'occurrences'].includes(
    String(input.evidence),
  )
    ? (input.evidence as InventoryEvidence)
    : 'releases'
  return compact({ evidence, cursor: text(input.cursor, 2000) })
}

export function changeInventoryScope(
  current: InventorySearch,
  updates: Partial<InventorySearch>,
): InventorySearch {
  const next = { ...current, ...updates }
  delete next.cursor
  if (updates.kind !== undefined && updates.kind !== current.kind) {
    delete next.identity_token
    if (updates.kind !== 'file_activity') delete next.operation
  }
  return compact(next)
}

export function changeEvidence(
  current: InventoryDetailSearch,
  evidence: InventoryEvidence,
): InventoryDetailSearch {
  const next = { ...current, evidence }
  delete next.cursor
  return next
}

export const summarySearch = (scope: InventorySearch) => {
  const {
    release_id,
    cluster_id,
    namespace,
    workload_kind,
    workload_name,
    container_name,
    observed_from,
    observed_to,
    search,
    operation,
    verdict,
    suppressed,
    evaluation_pending,
  } = scope
  return compact({
    release_id,
    cluster_id,
    namespace,
    workload_kind,
    workload_name,
    container_name,
    observed_from,
    observed_to,
    search,
    operation,
    verdict,
    suppressed,
    evaluation_pending,
  })
}

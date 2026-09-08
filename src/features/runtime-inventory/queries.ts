import { queryOptions } from '@tanstack/react-query'
import { ApiClientError, type ApiClient } from '../../shared/api/client'
import type {
  InventoryFacet,
  InventoryDistribution,
  InventoryFacetPage,
  InventoryGroupPage,
  InventoryItemDetail,
  InventoryItemPage,
  InventoryOccurrencePage,
  InventoryReleasePresencePage,
  InventorySightingPage,
  InventorySummary,
} from '../../shared/api/types'
import type { InventoryEvidence, InventorySearch } from './url-state'
import { summarySearch } from './url-state'

export const INVENTORY_PAGE_SIZE = 50
export const INVENTORY_DISTRIBUTION_SIZE = 5
const normalized = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value)
      .sort()
      .filter(([, item]) => item !== undefined),
  )
const query = (input: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(input).forEach(
    ([key, value]) => value !== undefined && params.set(key, String(value)),
  )
  return params.toString() ? `?${params}` : ''
}
const base = (projectId: string, applicationId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/runtime-inventory`

export const inventoryKeys = {
  summary: (projectId: string, applicationId: string, search: InventorySearch) =>
    [
      'runtime-inventory-summary',
      projectId,
      applicationId,
      normalized(summarySearch(search)),
    ] as const,
  distribution: (projectId: string, applicationId: string, search: InventorySearch) =>
    [
      'runtime-inventory-distribution',
      projectId,
      applicationId,
      search.kind,
      normalized(summarySearch(search)),
      INVENTORY_DISTRIBUTION_SIZE,
    ] as const,
  list: (projectId: string, applicationId: string, search: InventorySearch) =>
    ['runtime-inventory-list', projectId, applicationId, normalized(search)] as const,
  facet: (
    projectId: string,
    applicationId: string,
    facet: InventoryFacet,
    search: InventorySearch,
    facetSearch?: string,
    cursor?: string,
  ) =>
    [
      'runtime-inventory-facet',
      projectId,
      applicationId,
      facet,
      normalized(search),
      facetSearch ?? null,
      cursor ?? null,
    ] as const,
  item: (projectId: string, applicationId: string, itemId: string) =>
    ['runtime-inventory-item', projectId, applicationId, itemId] as const,
  evidence: (
    projectId: string,
    applicationId: string,
    itemId: string,
    evidence: InventoryEvidence,
    cursor?: string,
  ) =>
    [
      'runtime-inventory-evidence',
      projectId,
      applicationId,
      itemId,
      evidence,
      cursor ?? null,
    ] as const,
}

export const inventorySummaryOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: InventorySearch,
) =>
  queryOptions({
    queryKey: inventoryKeys.summary(projectId, applicationId, search),
    queryFn: ({ signal }) =>
      api.get<InventorySummary>(
        `${base(projectId, applicationId)}/summary${query(summarySearch(search))}`,
        {
          protected: true,
          signal,
        },
      ),
  })

export const inventoryDistributionOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: InventorySearch,
) =>
  queryOptions({
    queryKey: inventoryKeys.distribution(projectId, applicationId, search),
    queryFn: ({ signal }) =>
      api.get<InventoryDistribution>(
        `${base(projectId, applicationId)}/distribution${query({ ...summarySearch(search), kind: search.kind, limit: INVENTORY_DISTRIBUTION_SIZE })}`,
        { protected: true, signal },
      ),
  })

export const inventoryListOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: InventorySearch,
) =>
  queryOptions({
    queryKey: inventoryKeys.list(projectId, applicationId, search),
    queryFn: ({ signal }) =>
      api.get<InventoryItemPage>(
        `${base(projectId, applicationId)}${query({ ...search, limit: INVENTORY_PAGE_SIZE })}`,
        {
          protected: true,
          signal,
        },
      ),
  })

const facetField: Record<InventoryFacet, keyof InventorySearch> = {
  cluster: 'cluster_id',
  namespace: 'namespace',
  workload_kind: 'workload_kind',
  workload_name: 'workload_name',
  container_name: 'container_name',
}
export function inventoryFacetPath(
  projectId: string,
  applicationId: string,
  facet: InventoryFacet,
  search: InventorySearch,
  facetSearch?: string,
  cursor?: string,
) {
  const scope = { ...search }
  delete scope.cursor
  delete scope[facetField[facet]]
  return `${base(projectId, applicationId)}/facets/${facet}${query({ ...scope, facet_search: facetSearch, cursor, limit: INVENTORY_PAGE_SIZE })}`
}
export const inventoryFacetOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  facet: InventoryFacet,
  search: InventorySearch,
  facetSearch?: string,
  cursor?: string,
) =>
  queryOptions({
    queryKey: inventoryKeys.facet(projectId, applicationId, facet, search, facetSearch, cursor),
    queryFn: ({ signal }) =>
      api.get<InventoryFacetPage>(
        inventoryFacetPath(projectId, applicationId, facet, search, facetSearch, cursor),
        { protected: true, signal },
      ),
  })

export const inventoryItemOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  itemId: string,
) =>
  queryOptions({
    queryKey: inventoryKeys.item(projectId, applicationId, itemId),
    queryFn: ({ signal }) =>
      api.get<InventoryItemDetail>(
        `${base(projectId, applicationId)}/${encodeURIComponent(itemId)}`,
        {
          protected: true,
          signal,
        },
      ),
  })

type EvidencePage =
  | InventoryReleasePresencePage
  | InventorySightingPage
  | InventoryGroupPage
  | InventoryOccurrencePage
export function expectedEvidencePath(
  projectId: string,
  applicationId: string,
  itemId: string,
  evidence: InventoryEvidence,
) {
  return `${base(projectId, applicationId)}/${encodeURIComponent(itemId)}/${evidence}`
}
export const inventoryEvidenceOptions = <T extends EvidencePage>(
  api: ApiClient,
  projectId: string,
  applicationId: string,
  itemId: string,
  evidence: InventoryEvidence,
  cursor?: string,
) =>
  queryOptions({
    queryKey: inventoryKeys.evidence(projectId, applicationId, itemId, evidence, cursor),
    queryFn: ({ signal }) =>
      api.get<T>(
        `${expectedEvidencePath(projectId, applicationId, itemId, evidence)}${query({ cursor, limit: INVENTORY_PAGE_SIZE })}`,
        { protected: true, signal },
      ),
  })

export const isInvalidCursorError = (error: unknown) =>
  error instanceof ApiClientError &&
  error.detail.kind === 'api' &&
  error.detail.status === 400 &&
  ['invalid_cursor', 'cursor_invalid', 'expired_cursor'].includes(error.detail.code)

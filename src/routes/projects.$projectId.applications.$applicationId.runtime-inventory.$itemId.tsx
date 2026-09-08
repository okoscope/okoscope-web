import { RetentionCoverage } from '../features/runtime-retention/coverage'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { EvidenceList, InventoryIdentity } from '../features/runtime-inventory/components'
import {
  inventoryEvidenceOptions,
  inventoryItemOptions,
  isInvalidCursorError,
} from '../features/runtime-inventory/queries'
import {
  changeEvidence,
  parseInventoryDetailSearch,
  type InventoryDetailSearch,
  type InventoryEvidence,
} from '../features/runtime-inventory/url-state'
import type {
  InventoryGroupPage,
  InventoryOccurrencePage,
  InventoryReleasePresencePage,
  InventorySightingPage,
} from '../shared/api/types'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import {
  ApiErrorPanel,
  EmptyState,
  OwnershipError,
  PaginationControls,
} from '../features/observability/components'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
import { Loading } from '../shared/ui/loading'
import { formatCount, formatTimestamp } from '../features/tenant/format'
import { getActivityPresentation } from '../features/observability/presentation'
import { ObservationPolicyActions } from '../features/policies/from-observation'

export const Route = createFileRoute(
  '/projects/$projectId/applications/$applicationId/runtime-inventory/$itemId',
)({
  validateSearch: parseInventoryDetailSearch,
  component: RuntimeInventoryDetailPage,
})

function RuntimeInventoryDetailPage() {
  const { projectId, applicationId, itemId } = Route.useParams()
  const search: InventoryDetailSearch = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const api = useApi()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))
  const item = useQuery(inventoryItemOptions(api, projectId, applicationId, itemId))
  const releases = useQuery({
    ...inventoryEvidenceOptions<InventoryReleasePresencePage>(
      api,
      projectId,
      applicationId,
      itemId,
      'releases',
      search.cursor,
    ),
    enabled: item.isSuccess && search.evidence === 'releases',
  })
  const sightings = useQuery({
    ...inventoryEvidenceOptions<InventorySightingPage>(
      api,
      projectId,
      applicationId,
      itemId,
      'sightings',
      search.cursor,
    ),
    enabled: item.isSuccess && search.evidence === 'sightings',
  })
  const groups = useQuery({
    ...inventoryEvidenceOptions<InventoryGroupPage>(
      api,
      projectId,
      applicationId,
      itemId,
      'groups',
      search.cursor,
    ),
    enabled: item.isSuccess && search.evidence === 'groups',
  })
  const occurrences = useQuery({
    ...inventoryEvidenceOptions<InventoryOccurrencePage>(
      api,
      projectId,
      applicationId,
      itemId,
      'occurrences',
      search.cursor,
    ),
    enabled: item.isSuccess && search.evidence === 'occurrences',
  })
  const active = { releases, sightings, groups, occurrences }[search.evidence]

  useEffect(() => {
    if (application.data)
      document.title = `Observation history · ${application.data.name} · Okoscope`
  }, [application.data])
  if (project.isPending || application.isPending || item.isPending)
    return <Loading label="Loading inventory evidence…" />
  if (project.isError || application.isError || item.isError)
    return (
      <ApiErrorPanel
        title="Activity item not found"
        error={item.error ?? application.error ?? project.error}
        onRetry={() => {
          void project.refetch()
          void application.refetch()
          void item.refetch()
        }}
      />
    )
  if (
    item.data.project_id !== projectId ||
    item.data.application_id !== applicationId ||
    item.data.id !== itemId
  )
    return (
      <OwnershipError
        parent={
          <Link
            className="underline"
            to="/projects/$projectId/applications/$applicationId/runtime-inventory"
            params={{ projectId, applicationId }}
            search={{ kind: item.data.inventory_kind }}
          >
            Back to Application Activity
          </Link>
        }
      />
    )

  const evidenceTabs: { kind: InventoryEvidence; label: string }[] = [
    { kind: 'releases', label: 'Releases' },
    { kind: 'sightings', label: 'Where observed' },
    { kind: 'groups', label: 'Discoveries' },
    { kind: 'occurrences', label: 'Observation history' },
  ]
  const clearCursor = () => void navigate({ search: { evidence: search.evidence }, replace: true })
  const invalidCursor = isInvalidCursorError(active.error)
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/projects/$projectId" params={{ projectId }}>
          {project.data.name}
        </Link>
        <span>/</span>
        <Link
          to="/projects/$projectId/applications/$applicationId"
          params={{ projectId, applicationId }}
        >
          {application.data.name}
        </Link>
        <span>/</span>
        <Link
          to="/projects/$projectId/applications/$applicationId/runtime-inventory"
          params={{ projectId, applicationId }}
          search={{ kind: item.data.inventory_kind }}
        >
          Application Activity
        </Link>
        <span>/</span>
        <span aria-current="page">Observation history</span>
      </nav>
      <RetentionCoverage coverage={item.data.coverage} inventory />
      <Card>
        <p className="eyebrow">{getActivityPresentation(item.data.inventory_kind).itemLabel}</p>
        <h1 className="mt-2 text-2xl font-semibold">
          <InventoryIdentity item={item.data} />
        </h1>
        <dl className="details mt-5">
          <dt>{getActivityPresentation(item.data.inventory_kind).countLabel}</dt>
          <dd>{formatCount(item.data.occurrence_count)}</dd>
          <dt>First observed</dt>
          <dd>{formatTimestamp(item.data.first_seen_at)}</dd>
          <dt>Last observed</dt>
          <dd>{formatTimestamp(item.data.last_seen_at)}</dd>
        </dl>
        <ObservationPolicyActions
          projectId={projectId}
          applicationId={applicationId}
          source={{ itemId }}
        />
      </Card>
      <div role="tablist" aria-label="Observation details" className="flex flex-wrap gap-2">
        {evidenceTabs.map(({ kind, label }) => (
          <Button
            key={kind}
            role="tab"
            aria-selected={search.evidence === kind}
            variant={search.evidence === kind ? 'default' : 'outline'}
            onClick={() => void navigate({ search: changeEvidence(search, kind) })}
          >
            {label}
          </Button>
        ))}
      </div>
      {active.isPending ? (
        <Loading label={`Loading ${search.evidence} observations…`} />
      ) : active.isError ? (
        invalidCursor ? (
          <Card role="alert" className="border-amber-700">
            <h2 className="text-xl font-semibold">This observation page is no longer valid</h2>
            <Button className="mt-4" onClick={clearCursor}>
              Return to first page
            </Button>
          </Card>
        ) : (
          <ApiErrorPanel
            title="Could not load observations"
            error={active.error}
            onRetry={() => void active.refetch()}
          />
        )
      ) : active.data.items.length === 0 ? (
        <EmptyState
          title={search.cursor ? 'End of observation results' : 'No observations available'}
          description={
            search.cursor
              ? 'This terminal cursor page is empty. Use browser Back or return to the first page.'
              : `No ${search.evidence} observations are available for this item.`
          }
        />
      ) : search.evidence === 'releases' ? (
        <EvidenceList kind="releases" page={releases.data!} />
      ) : search.evidence === 'sightings' ? (
        <EvidenceList kind="sightings" page={sightings.data!} />
      ) : search.evidence === 'groups' ? (
        <EvidenceList
          kind="groups"
          page={groups.data!}
          projectId={projectId}
          applicationId={applicationId}
        />
      ) : (
        <EvidenceList kind="occurrences" page={occurrences.data!} />
      )}
      {active.data && (
        <PaginationControls
          nextCursor={active.data.next_cursor}
          onNext={(cursor) => void navigate({ search: { ...search, cursor } })}
        />
      )}
      {search.cursor && active.data?.items.length === 0 && (
        <Button variant="outline" onClick={clearCursor}>
          Return to first page
        </Button>
      )}
    </div>
  )
}

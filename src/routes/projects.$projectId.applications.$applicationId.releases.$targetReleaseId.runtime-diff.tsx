import { RetentionCoverage } from '../features/runtime-retention/coverage'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  ApiErrorPanel,
  baselineSelectionPresentation,
  EmptyState,
  OwnershipError,
  PaginationControls,
  RuntimeDiffList,
} from '../features/observability/components'
import {
  releasesOptions,
  runtimeDiffOptions,
  runtimeDiffSummaryOptions,
} from '../features/observability/queries'
import { RuntimeDiffVisualization } from '../features/observability/visualization'
import { ResourceComparison } from '../features/resources/resource-comparison'
import { changeBaseline, parseRuntimeDiffSearch } from '../features/observability/url-state'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { Card } from '../shared/ui/card'
import { Loading } from '../shared/ui/loading'
import { formatTimestamp } from '../features/tenant/format'
import { useLocalization } from '../shared/i18n'

export const Route = createFileRoute(
  '/projects/$projectId/applications/$applicationId/releases/$targetReleaseId/runtime-diff',
)({ validateSearch: parseRuntimeDiffSearch, component: RuntimeDiffPage })
function RuntimeDiffPage() {
  const { projectId, applicationId, targetReleaseId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const api = useApi()
  const { locale } = useLocalization()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))
  const releaseChoices = useQuery(releasesOptions(api, projectId, applicationId, {}))
  const diff = useQuery(runtimeDiffOptions(api, projectId, applicationId, targetReleaseId, search))
  const diffSummary = useQuery(
    runtimeDiffSummaryOptions(api, projectId, applicationId, targetReleaseId, search.baseline),
  )
  useEffect(() => {
    document.title = `Changes after release · ${application.data?.name ?? 'Okoscope'}`
  }, [application.data])
  if (project.isPending || application.isPending || diff.isPending || releaseChoices.isPending)
    return <Loading label="Loading Changes after release…" />
  if (project.isError || application.isError || diff.isError || releaseChoices.isError)
    return (
      <ApiErrorPanel
        title="Changes after release unavailable"
        error={diff.error ?? releaseChoices.error ?? application.error ?? project.error}
        onRetry={() => void diff.refetch()}
      />
    )
  const owned = (r: typeof diff.data.target) =>
    r.project_id === projectId && r.application_id === applicationId
  if (
    !owned(diff.data.target) ||
    diff.data.target.id !== targetReleaseId ||
    (diff.data.baseline && !owned(diff.data.baseline))
  )
    return (
      <OwnershipError
        parent={
          <Link
            className="underline"
            to="/projects/$projectId/applications/$applicationId/releases"
            params={{ projectId, applicationId }}
          >
            Back to Releases
          </Link>
        }
      />
    )
  const summaryOwned = diffSummary.data
    ? owned(diffSummary.data.target) &&
      diffSummary.data.target.id === targetReleaseId &&
      (!diffSummary.data.baseline || owned(diffSummary.data.baseline))
    : true
  if (!summaryOwned)
    return (
      <OwnershipError
        parent={
          <Link
            className="underline"
            to="/projects/$projectId/applications/$applicationId/releases"
            params={{ projectId, applicationId }}
          >
            Back to Releases
          </Link>
        }
      />
    )
  if (
    diffSummary.data &&
    diffSummary.data.baseline_selection_source !== diff.data.baseline_selection_source
  )
    return (
      <ApiErrorPanel
        title="Comparison provenance mismatch"
        error={new Error('Runtime Diff and its summary disagree about baseline selection.')}
        onRetry={() => {
          void diff.refetch()
          void diffSummary.refetch()
        }}
      />
    )
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs flex-wrap">
        <Link to="/projects">Projects</Link>
        <span>/</span>
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
          to="/projects/$projectId/applications/$applicationId/releases"
          params={{ projectId, applicationId }}
        >
          Releases
        </Link>
        <span>/</span>
        <span aria-current="page">Changes after release</span>
      </nav>
      <div>
        <p className="eyebrow">Release comparison</p>
        <h1 className="mt-2 text-4xl font-semibold">Changes after release</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Compare observed application activity between releases. A change is not automatically a
          problem, and “no longer observed” does not prove that behavior is absent.
        </p>
      </div>
      <RetentionCoverage coverage={diff.data.coverage} />
      <Card>
        <label className="block text-sm font-medium" htmlFor="baseline">
          Baseline release
        </label>
        <select
          id="baseline"
          className="mt-2 w-full rounded border border-slate-700 bg-slate-950 p-2"
          value={search.baseline ?? ''}
          onChange={(event) =>
            void navigate({ search: changeBaseline(search, event.target.value || undefined) })
          }
        >
          <option value="">Backend-selected baseline</option>
          {releaseChoices.data.items
            .filter((item) => item.id !== targetReleaseId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_name}
              </option>
            ))}
        </select>
        <dl className="details mt-5">
          <dt>Target</dt>
          <dd>
            {diff.data.target.display_name} · {formatTimestamp(diff.data.target.deployed_at)}
          </dd>
          <dt>Baseline</dt>
          <dd>
            {diff.data.baseline
              ? `${diff.data.baseline.display_name} · ${formatTimestamp(diff.data.baseline.deployed_at)}`
              : 'No baseline available'}
          </dd>
          <dt>Baseline selection</dt>
          <dd className="min-w-0 break-words">
            {baselineSelectionPresentation(diff.data.baseline_selection_source, locale)}
          </dd>
        </dl>
      </Card>
      <ResourceComparison
        projectId={projectId}
        applicationId={applicationId}
        targetReleaseId={targetReleaseId}
        baselineReleaseId={search.baseline}
      />
      {diff.data.baseline &&
        (diffSummary.isPending ? (
          <Loading label="Loading complete comparison summary…" />
        ) : diffSummary.isError && !diffSummary.data ? (
          <ApiErrorPanel
            title="Comparison summary unavailable"
            error={diffSummary.error}
            onRetry={() => void diffSummary.refetch()}
          />
        ) : diffSummary.data ? (
          <>
            {diffSummary.isError && (
              <ApiErrorPanel
                title="Comparison summary may be stale"
                error={diffSummary.error}
                onRetry={() => void diffSummary.refetch()}
              />
            )}
            <RuntimeDiffVisualization summary={diffSummary.data} />
          </>
        ) : null)}
      {!diff.data.baseline ? (
        <EmptyState
          title="No comparison baseline"
          description="This is the first comparable release or no baseline is available."
        />
      ) : diff.data.items.length ? (
        <RuntimeDiffList
          entries={diff.data.items}
          projectId={projectId}
          applicationId={applicationId}
        />
      ) : (
        <EmptyState
          title="No observed changes"
          description="The selected releases have no observed activity changes on this page."
        />
      )}
      <PaginationControls
        nextCursor={diff.data.next_cursor}
        onNext={(cursor) => void navigate({ search: { ...search, cursor } })}
      />
    </div>
  )
}

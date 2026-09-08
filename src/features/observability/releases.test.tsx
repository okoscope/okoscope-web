import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import type { DeploymentEpisode, Release } from '../../shared/api/types'
import {
  DeploymentEpisodeList,
  ReleaseMetadata,
  baselineSelectionPresentation,
  hasEpisodeOwnershipMismatch,
} from './components'
import { deploymentEpisodesOptions, deploymentEpisodesPath, observabilityKeys } from './queries'

afterEach(cleanup)

const manualRelease: Release = {
  id: 'release-manual',
  project_id: 'project',
  application_id: 'application',
  version: '2.14.0',
  display_name: 'Payments 2.14.0',
  description: null,
  deployed_at: '2026-08-18T00:00:00Z',
  created_at: '2026-08-18T00:00:00Z',
  source: 'manual',
  identity_version: null,
  identity_digest: null,
  identity_components: null,
  revision_count: 0,
  active_episode_count: 0,
}

const observedRelease: Release = {
  ...manualRelease,
  id: 'release-observed',
  display_name: 'payments · 1 image · abababab',
  source: 'observed',
  identity_version: 1,
  identity_digest: 'ab'.repeat(32),
  identity_components: [
    {
      name: 'payments',
      image: 'registry.example/payments:2.14.0',
      category: 'application',
      digest: 'ab'.repeat(32),
    },
  ],
  revision_count: 2,
  active_episode_count: 2,
}

const episode = ({
  id,
  revision_id,
  ...values
}: Partial<Omit<DeploymentEpisode, 'release_display_name'>> &
  Pick<DeploymentEpisode, 'id' | 'revision_id'>): DeploymentEpisode => ({
  id,
  release_id: observedRelease.id,
  release_display_name: observedRelease.display_name,
  revision_id,
  cluster_id: 'cluster',
  occurrence_number: 1,
  state: 'active',
  transition_kind: 'concurrent',
  first_observed_at: '2026-08-18T00:00:00Z',
  first_ready_at: null,
  last_observed_at: '2026-08-18T00:05:00Z',
  ended_at: null,
  pod_count: 4,
  ready_pod_count: 2,
  workload_ready_pod_count: 4,
  ready_pod_share: 0.5,
  snapshot_observed_at: null,
  predecessors: [],
  ...values,
})

describe('automatic Release presentation', () => {
  it('shows the backend-provided manual name without Kubernetes metadata', () => {
    render(<ReleaseMetadata release={manualRelease} />)
    expect(screen.getByText('Manual')).toBeVisible()
    expect(screen.getByText('Payments 2.14.0')).toBeVisible()
    expect(screen.queryByText('2.14.0')).not.toBeInTheDocument()
    expect(screen.queryByText('Image identity digest')).not.toBeInTheDocument()
    expect(screen.queryByText('Kubernetes revisions')).not.toBeInTheDocument()
  })

  it('shows observed image identity and revision and episode counts', () => {
    render(<ReleaseMetadata release={observedRelease} />)
    expect(screen.getByText('Observed')).toBeVisible()
    expect(screen.getByText('payments · 1 image · abababab')).toBeVisible()
    expect(screen.getByText(observedRelease.identity_digest!)).toBeVisible()
    expect(screen.getByText('Kubernetes revisions')).toBeVisible()
    expect(screen.getAllByText('2')).toHaveLength(2)
    expect(document.querySelector('script')).toBeNull()
  })

  it('keeps a multi-image name and complete image composition without deriving change claims', () => {
    const release: Release = {
      ...observedRelease,
      display_name: 'payments · 3 images · cdcdcdcd',
      identity_digest: 'cd'.repeat(32),
      identity_components: JSON.parse(`[
        {
          "name": "file-activity",
          "image": "busybox:1.37",
          "digest": "${'9d'.repeat(32)}"
        },
        {
          "name": "payment-api",
          "image": "busybox:1.36",
          "category": "application",
          "digest": "${'73'.repeat(32)}"
        },
        {}
      ]`),
    }
    const { container } = render(<ReleaseMetadata release={release} />)
    expect(screen.getByText(release.display_name)).toBeVisible()
    expect(screen.getByText(release.identity_digest!)).toBeVisible()
    expect(screen.getByText('Image identity components')).toBeVisible()
    expect(container.querySelectorAll('ol > li')).toHaveLength(3)
    expect(screen.getByLabelText('Image identity components 1')).toHaveTextContent(
      `name“file-activity”image“busybox:1.37”digest“${'9d'.repeat(32)}”`,
    )
    expect(screen.getByLabelText('Image identity components 2')).toHaveTextContent(
      `name“payment-api”image“busybox:1.36”category“application”digest“${'73'.repeat(32)}”`,
    )
    expect(screen.getByLabelText('Image identity components 3')).toBeInTheDocument()
    expect(screen.queryByText(/primary container|changed container/i)).not.toBeInTheDocument()
  })
})

describe('deployment episode evidence', () => {
  it('keeps repeated and concurrent revisions distinct and explains readiness semantics', () => {
    render(
      <DeploymentEpisodeList
        episodes={[
          episode({ id: 'episode-one', revision_id: 'revision-a' }),
          episode({
            id: 'episode-two',
            revision_id: 'revision-b',
            occurrence_number: 2,
            transition_kind: 'rollback_candidate',
            state: 'inactive',
            ended_at: '2026-08-18T00:10:00Z',
            ready_pod_share: null,
          }),
        ]}
      />,
    )
    expect(screen.getByText('revision-a')).toBeVisible()
    expect(screen.getByText('revision-b')).toBeVisible()
    expect(screen.getByText('Concurrent revision')).toBeVisible()
    expect(screen.getByText('Rollback candidate')).toBeVisible()
    expect(screen.queryByText(/^Rollback$/i)).not.toBeInTheDocument()
    expect(screen.getByText('Ongoing')).toBeVisible()
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/not traffic share.*does not confirm canary or A\/B/i)).toHaveLength(
      2,
    )
  })

  it('scopes lazy query identity and pagination independently', () => {
    expect(observabilityKeys.deploymentEpisodes('p', 'a', 'r', 'one')).not.toEqual(
      observabilityKeys.deploymentEpisodes('p', 'a', 'r', 'two'),
    )
    expect(observabilityKeys.deploymentEpisodes('p', 'a', 'r', 'one')).not.toEqual(
      observabilityKeys.deploymentEpisodes('p', 'other', 'r', 'one'),
    )
    expect(deploymentEpisodesPath('project/id', 'app id', 'release/id', 'next page')).toBe(
      '/api/v1/projects/project%2Fid/applications/app%20id/releases/release%2Fid/episodes?cursor=next+page&limit=25',
    )
    const api = new ApiClient({ apiBaseUrl: '/' }, vi.fn())
    expect(deploymentEpisodesOptions(api, 'p', 'a', 'r', undefined, false).enabled).toBe(false)
    expect(deploymentEpisodesOptions(api, 'p', 'a', 'r', undefined, true).enabled).toBe(true)
  })

  it('detects an episode response outside the requested Release scope', () => {
    const owned = episode({ id: 'owned', revision_id: 'revision-a' })
    const mismatched = { ...owned, id: 'mismatched', release_id: 'another-release' }
    expect(hasEpisodeOwnershipMismatch([owned], observedRelease.id)).toBe(false)
    expect(hasEpisodeOwnershipMismatch([owned, mismatched], observedRelease.id)).toBe(true)
  })
})

describe('Runtime Diff baseline selection provenance', () => {
  it.each([
    ['explicit', /operator/],
    ['transition', /transition evidence/],
    ['concurrent_transition_fallback', /concurrent transition evidence/],
    ['legacy_deployment_order', /legacy deployment order/],
    ['none', /no comparison baseline/i],
  ] as const)('presents %s without client-side inference', (source, expected) => {
    expect(baselineSelectionPresentation(source)).toMatch(expected)
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RuntimeDiffSummary } from '../../shared/api/types'
import { RuntimeDiffVisualization } from './visualization'

const release = {
  id: '40000000-0000-4000-8000-000000000001',
  project_id: '20000000-0000-4000-8000-000000000001',
  application_id: '30000000-0000-4000-8000-000000000001',
  version: '2.14.0',
  display_name: 'Payments 2.14.0',
  description: null,
  deployed_at: '2026-08-18T00:00:00Z',
  created_at: '2026-08-18T00:00:00Z',
  source: 'manual' as const,
  identity_version: null,
  identity_digest: null,
  identity_components: null,
  revision_count: 0,
  active_episode_count: 0,
}

describe('RuntimeDiffVisualization', () => {
  it('shows complete classifications and explicit increase/decrease evidence', () => {
    const summary: RuntimeDiffSummary = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      baseline: { ...release, id: '40000000-0000-4000-8000-000000000002', version: '2.13.0' },
      target: release,
      baseline_selection_source: 'explicit',
      total_item_count: 3,
      classifications: [
        { classification: 'new', item_count: 1 },
        { classification: 'disappeared', item_count: 1 },
        { classification: 'unchanged', item_count: 1 },
      ],
      largest_changes: [
        {
          group_id: '60000000-0000-4000-8000-000000000001',
          classification: 'new',
          event_kind: 'exec',
          semantic_summary: { executable: '<script>worker</script>' },
          baseline_occurrence_count: 0,
          target_occurrence_count: 20,
          occurrence_delta: 20,
        },
        {
          group_id: '60000000-0000-4000-8000-000000000002',
          classification: 'disappeared',
          event_kind: 'exec',
          semantic_summary: { executable: '/legacy' },
          baseline_occurrence_count: 12,
          target_occurrence_count: 0,
          occurrence_delta: -12,
        },
      ],
    }
    const { container } = render(<RuntimeDiffVisualization summary={summary} />)

    expect(
      screen.getByLabelText(/<script>worker<\/script>.*Increase.*delta \+20/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/legacy.*Decrease.*delta -12/)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText(/complete comparison/)).toBeInTheDocument()
  })

  it('presents listener behavior by local endpoint without remote clients', () => {
    const summary: RuntimeDiffSummary = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      baseline: { ...release, id: '40000000-0000-4000-8000-000000000002', version: '2.13.0' },
      target: release,
      baseline_selection_source: 'explicit',
      total_item_count: 1,
      classifications: [{ classification: 'unchanged', item_count: 1 }],
      largest_changes: [
        {
          group_id: '60000000-0000-4000-8000-000000000003',
          classification: 'unchanged',
          event_kind: 'network.listen',
          semantic_summary: {
            process_command: 'payments',
            transport: 'tcp',
            address_family: 'ipv6',
            local_address: '::',
            local_port: 8080,
          },
          baseline_occurrence_count: 1,
          target_occurrence_count: 1,
          occurrence_delta: 0,
        },
      ],
    }
    render(<RuntimeDiffVisualization summary={summary} />)
    expect(screen.getByText('payments → [::]:8080 (TCP, IPV6)')).toBeVisible()
    expect(screen.queryByText(/remote|51234|203\.0\.113\.9/i)).not.toBeInTheDocument()
  })

  it('uses backend file classifications and ordered rename identity', () => {
    const summary: RuntimeDiffSummary = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      baseline: release,
      target: release,
      baseline_selection_source: 'explicit',
      total_item_count: 3,
      classifications: [
        { classification: 'new', item_count: 1 },
        { classification: 'unchanged', item_count: 1 },
        { classification: 'disappeared', item_count: 1 },
      ],
      largest_changes: [
        {
          group_id: 'file-group',
          classification: 'unchanged',
          event_kind: 'file.rename',
          semantic_summary: {
            operation: 'rename',
            process_command: 'mv',
            path: '/old',
            new_path: '/new',
            replaced: null,
          },
          baseline_occurrence_count: 2,
          target_occurrence_count: 2,
          occurrence_delta: 0,
        },
      ],
    }
    render(<RuntimeDiffVisualization summary={summary} />)
    expect(screen.getByText('mv · rename · /old → /new · unknown')).toBeVisible()
    for (const label of ['New', 'No longer observed', 'Still observed'])
      expect(screen.getByText(label)).toBeVisible()
  })
})

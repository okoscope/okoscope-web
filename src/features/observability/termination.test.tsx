import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EventOccurrence, RuntimeGroup } from '../../shared/api/types'
import { OccurrenceTimeline, SemanticSummary } from './components'
import { correlationPresentation, terminationText } from './presentation'
import { LocalizationProvider, translate } from '../../shared/i18n'

describe('termination evidence presentation', () => {
  it('never promotes SIGKILL or conventional 137 to OOM evidence', () => {
    const copy = terminationText(
      {
        type: 'signaled',
        signal: 9,
        signal_name: 'SIGKILL',
        core_dump_flag: false,
        conventional_exit_code: 137,
      },
      (key, values) => translate('en', key, values),
    )
    expect(copy.primary).toBe('Terminated by SIGKILL (9)')
    expect(copy.conventional).toContain('derived convention')
    expect(copy.explanation).toContain('OOM, are unknown')
    expect(copy.explanation).not.toContain('OOMKilled')
  })

  it('describes the core bit as a flag rather than a core file', () => {
    const copy = terminationText(
      {
        type: 'signaled',
        signal: 11,
        signal_name: 'SIGSEGV',
        core_dump_flag: true,
        conventional_exit_code: 139,
      },
      (key, values) => translate('en', key, values),
    )
    expect(copy.coreFlag).toBe('Core-dump flag set; creation of a core file is not confirmed.')
  })

  it('renders Kubernetes OOMKilled as source-qualified runtime evidence', () => {
    render(
      <SemanticSummary
        value={{
          evidence_source: 'kubernetes',
          container_name: 'api',
          reason: 'OOMKilled',
          exit_code: 137,
        }}
      />,
    )
    expect(screen.getByText('Kubernetes evidence')).toBeVisible()
    expect(screen.getByText('OOMKilled')).toBeVisible()
    expect(screen.getByText(/reported by Kubernetes\/runtime/)).toBeVisible()
  })

  it('localizes every visible signal termination sentence', () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <SemanticSummary
          value={{
            evidence_source: 'kernel',
            identity: '/app/payment-worker',
            termination: {
              type: 'signaled',
              signal: 11,
              signal_name: 'SIGSEGV',
              core_dump_flag: true,
              conventional_exit_code: 139,
            },
          }}
        />
      </LocalizationProvider>,
    )
    expect(screen.getByText('Процесс завершён сигналом SIGSEGV (11)')).toBeVisible()
    expect(screen.getByText('Процесс')).toBeVisible()
    expect(screen.getByText('/app/payment-worker')).toBeVisible()
    expect(screen.getByText(/Условный код завершения 139/)).toBeVisible()
    expect(screen.getByText(/Установлен флаг core dump/)).toBeVisible()
    expect(screen.getByText(/не определяют его отправителя/)).toBeVisible()
    expect(screen.queryByText(/Terminated|Kernel evidence identifies|Core-dump flag/)).toBeNull()
  })

  it('renders the legacy source field as explicit kernel evidence instead of JSON', () => {
    const legacySummary = {
      correlation: {
        exec_event_id: 'a783c76c-bd2b-4f0c-ae64-756cf60445ed',
        executable: 'mv',
        generation: 1,
        status: 'observed',
      },
      identity: 'mv',
      source: 'kernel',
      termination: { status: 0, type: 'exited' },
    } as unknown as RuntimeGroup['semantic_summary']

    render(<SemanticSummary value={legacySummary} />)

    expect(screen.getByText('Kernel evidence')).toBeVisible()
    expect(screen.getByText('Exited with status 0')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Copy JSON details' })).not.toBeInTheDocument()
  })

  it('does not choose an ambiguous candidate', () => {
    expect(
      correlationPresentation({
        status: 'ambiguous',
        candidate_count: 2,
        related_event_ids: [],
      }),
    ).toEqual({
      label: 'Ambiguous correlation',
      description: '2 possible matches were found; none was selected.',
    })
  })

  it('renders receive-ordered independent evidence and an aggregate restart gap', async () => {
    const occurrence: EventOccurrence = {
      id: 'restart',
      event_id: 'restart-event',
      observed_at: '2026-08-23T10:00:00Z',
      received_at: '2026-08-23T10:00:05Z',
      node_name: 'node-1',
      namespace: 'production',
      pod_name: 'api-1',
      container_name: 'api',
      process_command: '',
      event_kind: 'container.restart',
      payload: {
        type: 'ContainerRestart',
        data: {
          source: 'kubernetes',
          runtime_container_id: 'containerd://api',
          restart_count: 7,
          restart_delta: 3,
          observation_gap: true,
          waiting_reason: 'CrashLoopBackOff',
        },
      },
      correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
      related_evidence: [],
      release_id: null,
      release_version: null,
      release_display_name: 'Unattributed',
    }
    render(<OccurrenceTimeline occurrences={[occurrence]} />)
    expect(screen.getByText('Newest received evidence first')).toBeVisible()
    await userEvent.click(screen.getByText('Technical details'))
    expect(screen.getByText(/Restart count increased 4 → 7/)).toBeVisible()
    expect(screen.getByText(/Exact individual restart times are unavailable/)).toBeVisible()
    expect(screen.getByText(/waiting\/backoff state, not a termination cause/)).toBeVisible()
  })

  it('renders a derived restart-loop summary with bounded window facts', () => {
    const value: RuntimeGroup['semantic_summary'] = {
      evidence_source: 'derived',
      projection_version: 1,
      threshold: 3,
      window_started_at: '2026-08-23T09:50:00Z',
      window_ended_at: '2026-08-23T10:00:00Z',
      observed_restart_count: 4,
      container_name: 'api',
      latest_waiting_reason: 'CrashLoopBackOff',
    }
    render(<SemanticSummary value={value} />)
    expect(screen.getByText('Derived finding')).toBeVisible()
    expect(screen.getByText('4 (threshold 3)')).toBeVisible()
    expect(screen.getByText('CrashLoopBackOff')).toBeVisible()
  })
})

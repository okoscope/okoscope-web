import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { SnapshotHistory } from './snapshots'
const coverage = {
  closed_before: '2026-08-01T00:00:00Z',
  history_expired_before: '2025-08-01T00:00:00Z',
  detail_scope: 'raw',
}
function setup(error = false) {
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const get = vi.spyOn(api, 'get')
  if (error) get.mockRejectedValue(new Error('offline'))
  else get.mockResolvedValue({ items: [], next_cursor: null, granularity: 'utc_day', coverage })
  const onChange = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiProvider value={api}>
        <SnapshotHistory
          projectId="p"
          applicationId="a"
          groupId="g"
          search={{
            snapshot_cursor: 'next',
            snapshot_from: '2026-01-01',
            snapshot_to: '2026-02-01',
            snapshot_release: 'release',
          }}
          onChange={onChange}
        />
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, onChange }
}
describe('snapshot history', () => {
  it('keeps empty filtered history distinct from absence and sends server filters', async () => {
    const { get, onChange } = setup()
    expect(
      await screen.findByText('No snapshots for the selected period on this page.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Missing data in expired periods does not mean activity was absent/),
    ).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      '/api/v1/runtime-groups/g/snapshots?limit=50&cursor=next&day_from=2026-01-01&day_to=2026-02-01&release_id=release',
      expect.objectContaining({ protected: true }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'First snapshot page' }))
    expect(onChange).toHaveBeenCalledWith({
      snapshot_cursor: undefined,
      snapshot_from: '2026-01-01',
      snapshot_to: '2026-02-01',
      snapshot_release: 'release',
    })
  })
  it('reports API errors with retry rather than an empty history claim', async () => {
    setup(true)
    expect(
      await screen.findByRole('heading', { name: 'Snapshots unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(
      screen.queryByText('No snapshots for the selected period on this page.'),
    ).not.toBeInTheDocument()
  })
})

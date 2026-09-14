import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiClientError, type ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { LocalizationProvider } from '../../shared/i18n'
import type { RuntimeBehaviorUserLabel } from '../../shared/api/types'
import { contractFixture } from '../../shared/api/types'
import { inventoryKeys } from './queries'
import {
  BehaviorUserLabels,
  InventoryUserLabelEditor,
  InventoryUserLabelHeading,
} from './user-label'

const label = (displayName: string, updatedAt = '2026-09-14T10:00:00Z') =>
  ({
    display_name: displayName,
    created_by_user_id: '10000000-0000-4000-8000-000000000001',
    updated_by_user_id: '10000000-0000-4000-8000-000000000001',
    created_at: '2026-09-14T09:00:00Z',
    updated_at: updatedAt,
  }) satisfies RuntimeBehaviorUserLabel

function renderEditor(api: Partial<ApiClient>, userLabel: RuntimeBehaviorUserLabel | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={api as ApiClient}>
        <InventoryUserLabelEditor
          projectId="project /"
          applicationId="application ?"
          itemId="item #"
          userLabel={userLabel}
        />
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, queryClient }
}

describe('runtime behavior user labels', () => {
  it('keeps unnamed and named technical identities visible and renders hostile names inertly', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    const { container, rerender } = render(
      <InventoryUserLabelHeading
        item={{ user_label: null }}
        technicalIdentity="TCP IPv4 10.0.0.1:5432"
        headingClassName="heading"
      />,
    )
    expect(screen.getByText('TCP IPv4 10.0.0.1:5432')).toHaveClass('heading')

    rerender(
      <InventoryUserLabelHeading
        item={{ user_label: label(hostile) }}
        technicalIdentity="worker --queue reports"
        headingClassName="heading"
      />,
    )
    expect(screen.getByText(hostile)).toHaveClass('heading')
    expect(screen.getByText('worker --queue reports')).toBeVisible()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders duplicate and multiple linked labels without hiding the canonical event', () => {
    render(
      <BehaviorUserLabels
        labels={[
          label('Database connection'),
          label('Database connection', '2026-09-14T11:00:00Z'),
        ]}
        technicalTitle="Network connect — api → postgres:5432"
        headingClassName="heading"
      />,
    )
    expect(screen.getByRole('list', { name: 'Behavior names' })).toBeVisible()
    expect(screen.getAllByText('Database connection')).toHaveLength(2)
    expect(screen.getByText('Network connect — api → postgres:5432')).toBeVisible()
  })

  it('sends trimmed create input with a null revision and validates Unicode/control limits', async () => {
    const user = userEvent.setup()
    const put = vi.fn().mockResolvedValue(label('Подключение к NATS'))
    renderEditor({ put })
    await user.click(screen.getByRole('button', { name: 'Add name' }))
    const input = screen.getByRole('textbox', { name: 'Behavior name' })
    await user.type(input, '  Подключение к NATS  ')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        '/api/v1/projects/project%20%2F/applications/application%20%3F/runtime-inventory/item%20%23/user-label',
        {
          protected: true,
          body: { display_name: 'Подключение к NATS', expected_updated_at: null },
        },
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Add name' }))
    const reopenedInput = screen.getByRole('textbox', { name: 'Behavior name' })
    await user.clear(reopenedInput)
    await user.type(reopenedInput, `${'🙂'.repeat(121)}`)
    expect(screen.getByText('Use no more than 120 characters.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save name' })).toBeDisabled()
    fireEvent.change(reopenedInput, { target: { value: 'bad\u007fname' } })
    expect(screen.getByText('Control characters are not allowed.')).toBeVisible()
  })

  it('passes the current revision to delete and reports stale conflicts accessibly', async () => {
    const user = userEvent.setup()
    const current = label('Database connection')
    const conflict = new ApiClientError({
      kind: 'api',
      status: 409,
      code: 'label_conflict',
      message: 'stale',
      requestId: 'request-1',
    })
    const del = vi.fn().mockRejectedValue(conflict)
    const { queryClient } = renderEditor({ delete: del }, current)
    queryClient.setQueryData(inventoryKeys.item('project /', 'application ?', 'item #'), {
      ...contractFixture.inventoryItemDetail,
      user_label: label('Latest database connection', '2026-09-14T12:00:00Z'),
    })
    await user.click(screen.getByRole('button', { name: 'Edit name' }))
    await user.click(screen.getByRole('button', { name: 'Remove name' }))
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith(
        expect.stringContaining(`expected_updated_at=${encodeURIComponent(current.updated_at)}`),
        { protected: true },
      ),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This behavior name changed elsewhere.',
    )
    expect(screen.getByRole('textbox')).toHaveValue('Latest database connection')
  })

  it('localizes editor controls in Russian', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()
    render(
      <LocalizationProvider initialLocale="ru">
        <QueryClientProvider client={queryClient}>
          <ApiProvider value={{} as ApiClient}>
            <InventoryUserLabelEditor projectId="p" applicationId="a" itemId="i" userLabel={null} />
          </ApiProvider>
        </QueryClientProvider>
      </LocalizationProvider>,
    )
    await user.click(await screen.findByRole('button', { name: 'Добавить название' }))
    expect(screen.getByRole('textbox', { name: 'Название поведения' })).toBeVisible()
    expect(screen.getByText('Введите название.')).toBeVisible()
  })
})

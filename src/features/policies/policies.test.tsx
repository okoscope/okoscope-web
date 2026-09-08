import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { parseRuntimeGroupSearch } from '../observability/url-state'
import { parseInventorySearch } from '../runtime-inventory/url-state'
import { LocalizationProvider } from '../../shared/i18n'
import {
  PolicyEffectBadge,
  PolicyFilters,
  PolicyState,
  suppressionBehaviorSummary,
} from './components'

describe('managed runtime policy presentation', () => {
  it('localizes policy effects and renders them as badges', () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <PolicyEffectBadge effect="expected" />
      </LocalizationProvider>,
    )

    expect(screen.getByText('Ожидается')).toHaveClass('rounded-full', 'border')
  })

  it('renders verdict and suppression as independent states', () => {
    render(
      <PolicyState
        evaluation={{
          state: 'current',
          verdict: 'requires_review',
          reason_code: 'outside_placement',
          explanation: {},
        }}
        suppression={{
          id: '10000000-0000-4000-8000-000000000001',
          reason: 'Maintenance window',
          expires_at: '2026-08-29T12:00:00Z',
          created_at: '2026-08-28T12:00:00Z',
        }}
      />,
    )
    expect(screen.getByText('Requires review')).toBeVisible()
    expect(screen.getByText(/Suppressed until/)).toHaveAttribute(
      'title',
      expect.stringContaining('Maintenance window'),
    )
  })

  it('keeps closed policy filters in URL state', () => {
    expect(
      parseRuntimeGroupSearch({
        verdict: 'expected',
        suppressed: 'false',
        evaluation_pending: 'true',
      }),
    ).toMatchObject({ verdict: 'expected', suppressed: false, evaluation_pending: true })
    expect(parseInventorySearch({ kind: 'process', verdict: 'unknown' })).toEqual({
      kind: 'process',
    })
  })

  it('describes the exact behavior targeted by a suppression', () => {
    expect(
      suppressionBehaviorSummary({
        behavior_matcher: {
          kind: 'destination',
          process_command: '/usr/bin/payment-api',
          address_family: 'ipv4',
          destination_address: '10.0.0.8',
          destination_port: 8081,
        },
      }),
    ).toBe('/usr/bin/payment-api → 10.0.0.8:8081 (ipv4)')
  })

  it('emits policy filters independently', async () => {
    const onChange = vi.fn()
    render(<PolicyFilters onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Policy verdict'), 'policy_conflict')
    await userEvent.selectOptions(screen.getByLabelText('Suppression'), 'true')
    expect(onChange).toHaveBeenNthCalledWith(1, { verdict: 'policy_conflict' })
    expect(onChange).toHaveBeenNthCalledWith(2, { suppressed: true })
  })
})

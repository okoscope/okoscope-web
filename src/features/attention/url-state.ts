import type { AttentionWindowKind } from '../../shared/api/types'

export type AttentionSearch = { window: AttentionWindowKind }

export const parseAttentionSearch = (search: Record<string, unknown>): AttentionSearch => ({
  window: search.window === '7d' ? '7d' : '24h',
})

export type ApplicationAttentionSection = 'overview' | 'recommendations' | 'priority'
export type ApplicationAttentionSearch = { section: ApplicationAttentionSection }

export const parseApplicationAttentionSearch = (
  search: Record<string, unknown>,
): ApplicationAttentionSearch => ({
  section:
    search.section === 'overview' ||
    search.section === 'recommendations' ||
    search.section === 'priority'
      ? search.section
      : 'recommendations',
})

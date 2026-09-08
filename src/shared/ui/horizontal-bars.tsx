import type { ReactNode } from 'react'
import { formatCount } from '../../features/tenant/format'

export const safePercentage = (value: number, total: number) =>
  Number.isFinite(value) && Number.isFinite(total) && value > 0 && total > 0
    ? Math.min(100, (value / total) * 100)
    : 0

export const formatPercentage = (value: number, total: number) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(safePercentage(value, total))}%`

export const formatSignedCount = (value: number) =>
  `${value > 0 ? '+' : ''}${new Intl.NumberFormat().format(value)}`

export type HorizontalBarItem = {
  id: string
  label: ReactNode
  accessibleLabel: string
  value: number
  meta?: ReactNode
  selected?: boolean
  onSelect?: (() => void) | undefined
}

export function HorizontalBars({
  items,
  total,
  ariaLabel,
}: {
  items: HorizontalBarItem[]
  total: number
  ariaLabel: string
}) {
  return (
    <ol aria-label={ariaLabel} className="space-y-3">
      {items.map((item) => {
        const percentage = formatPercentage(item.value, total)
        const content = (
          <>
            <span className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 break-all text-sm font-semibold">{item.label}</span>
              <span className="shrink-0 text-sm tabular-nums">
                {formatCount(item.value)} · {percentage}
              </span>
            </span>
            {item.meta && <span className="mt-1 block text-xs text-slate-400">{item.meta}</span>}
            <span
              aria-hidden="true"
              className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-800"
            >
              <span
                className="block h-full rounded-full bg-cyan-400 motion-reduce:transition-none"
                style={{ width: `${safePercentage(item.value, total)}%` }}
              />
            </span>
          </>
        )
        return (
          <li key={item.id}>
            {item.onSelect ? (
              <button
                type="button"
                aria-label={`${item.accessibleLabel}: ${formatCount(item.value)} observations, ${percentage}`}
                aria-pressed={item.selected}
                onClick={item.onSelect}
                className={`w-full rounded-lg border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none ${item.selected ? 'border-cyan-300 bg-cyan-950/50' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}
              >
                {content}
              </button>
            ) : (
              <div
                aria-label={`${item.accessibleLabel}: ${formatCount(item.value)} observations, ${percentage}`}
                className="rounded-lg border border-slate-700 bg-slate-950 p-3"
              >
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

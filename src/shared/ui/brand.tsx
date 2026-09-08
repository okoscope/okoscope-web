import { useId } from 'react'
import { cn } from '../lib/utils'

export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId()

  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className={cn('brand-mark', className)}>
      <defs>
        <linearGradient id={gradientId} x1="10" y1="58" x2="86" y2="14">
          <stop stopColor="#3458ff" />
          <stop offset="0.48" stopColor="#08b9ff" />
          <stop offset="1" stopColor="#15f0bd" />
        </linearGradient>
      </defs>
      <path
        d="M8 36c11-15 24-23 40-23s29 8 40 23C77 51 64 59 48 59S19 51 8 36Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle
        cx="48"
        cy="36"
        r="18"
        fill="#071526"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
      />
      <circle cx="48" cy="36" r="11" fill="#0a1a30" stroke="#2464d8" strokeWidth="2" />
      <circle cx="53" cy="31" r="3.5" fill="#f8fafc" />
      <path d="M48 4v9M48 59v9M75 36h8" stroke="#10e5d1" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <BrandMark className={compact ? 'h-9 w-12' : 'h-11 w-14'} />
      <span className="brand-copy">
        <span className="brand-name">
          <strong>{'OKO'}</strong>
          {'SCOPE'}
        </span>
        {!compact && <span className="brand-tagline">Runtime observability</span>}
      </span>
    </span>
  )
}

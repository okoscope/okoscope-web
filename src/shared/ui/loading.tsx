import { useT } from '../i18n'
export function Loading({ label }: { label?: string }) {
  const t = useT()
  return (
    <div
      aria-live="polite"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300"
    >
      {label ?? t('loading')}
    </div>
  )
}

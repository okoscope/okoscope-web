import { useLocalization } from '.'
import { useEffect, useRef } from 'react'

export function LanguageSelector({
  className = '',
  showLabel = true,
}: {
  className?: string
  showLabel?: boolean
}) {
  const { locale, setLocale, t } = useLocalization()
  const selectLocale = (value: string) => setLocale(value as 'en' | 'ru')
  const selectRef = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const select = selectRef.current
    if (!select) return
    const handle = () => selectLocale(select.value)
    select.addEventListener('change', handle)
    return () => select.removeEventListener('change', handle)
  })
  return (
    <label className={`inline-flex items-center gap-2 text-sm text-slate-300 ${className}`}>
      {showLabel && <span>{t('language')}</span>}
      <select
        ref={selectRef}
        aria-label={t('language')}
        value={locale}
        onChange={(event) => selectLocale(event.target.value)}
        onInput={(event) => selectLocale(event.currentTarget.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
      >
        <option value="en">{t('english')}</option>
        <option value="ru">{t('russian')}</option>
      </select>
    </label>
  )
}

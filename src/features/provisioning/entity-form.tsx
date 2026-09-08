import { FormEvent, useState } from 'react'
import { ApiClientError } from '../../shared/api/client'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'

export type NamedResourceValue = { name: string; slug: string }
export type NamedResourceErrors = Partial<Record<keyof NamedResourceValue, string>>

const cyrillic: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ъ: '',
  ь: '',
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => cyrillic[letter] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '')
}

export function validateNamedResource(
  value: NamedResourceValue,
  messages = {
    name: 'Name must be 1–120 characters without leading or trailing spaces.',
    slug: 'Slug must be 1–63 lowercase letters or digits separated by single hyphens.',
  },
): NamedResourceErrors {
  const errors: NamedResourceErrors = {}
  if (value.name.length < 1 || value.name.length > 120 || value.name.trim() !== value.name)
    errors.name = messages.name
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || value.slug.length > 63)
    errors.slug = messages.slug
  return errors
}

export function apiFieldErrors(error: unknown): NamedResourceErrors {
  if (!(error instanceof ApiClientError) || error.detail.kind !== 'api') return {}
  const fields = error.detail.fields ?? {}
  return {
    ...(fields.name ? { name: fields.name } : {}),
    ...(fields.slug ? { slug: fields.slug } : {}),
  }
}

export function NamedResourceForm({
  label,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  label: string
  pending: boolean
  error?: unknown
  onSubmit: (value: NamedResourceValue) => void
  onCancel?: () => void
}) {
  const t = useT()
  const [value, setValue] = useState<NamedResourceValue>({ name: '', slug: '' })
  const [slugDirty, setSlugDirty] = useState(false)
  const [localErrors, setLocalErrors] = useState<NamedResourceErrors>({})
  const errors = { ...apiFieldErrors(error), ...localErrors }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    const nextErrors = validateNamedResource(value, {
      name: t('nameInvalid'),
      slug: t('slugInvalid'),
    })
    setLocalErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onSubmit(value)
  }
  return (
    <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor={`${label}-name`}>
          {t('name')}
        </label>
        <input
          id={`${label}-name`}
          autoFocus
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus:ring-2 focus:ring-cyan-300"
          value={value.name}
          maxLength={120}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${label}-name-error` : undefined}
          onChange={(event) => {
            const name = event.target.value
            setValue((current) => ({
              ...current,
              name,
              ...(slugDirty ? {} : { slug: slugify(name) }),
            }))
            setLocalErrors({})
          }}
        />
        {errors.name && (
          <p id={`${label}-name-error`} className="mt-1 text-sm text-rose-300">
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor={`${label}-slug`}>
          {t('slug')}
        </label>
        <input
          id={`${label}-slug`}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono focus:ring-2 focus:ring-cyan-300"
          value={value.slug}
          maxLength={63}
          aria-invalid={Boolean(errors.slug)}
          aria-describedby={errors.slug ? `${label}-slug-error` : undefined}
          onChange={(event) => {
            setSlugDirty(true)
            setValue((current) => ({ ...current, slug: event.target.value }))
            setLocalErrors({})
          }}
        />
        {errors.slug && (
          <p id={`${label}-slug-error`} className="mt-1 text-sm text-rose-300">
            {errors.slug}
          </p>
        )}
      </div>
      {error instanceof ApiClientError && error.detail.kind === 'api' && (
        <div role="alert" className="text-sm text-rose-300">
          <p>{error.detail.message}</p>
          <p className="mt-1 font-mono text-xs">
            {t('requestId')} {error.detail.requestId}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('creating') : t('createEntity', { entity: label })}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {t('close')}
          </Button>
        )}
      </div>
    </form>
  )
}

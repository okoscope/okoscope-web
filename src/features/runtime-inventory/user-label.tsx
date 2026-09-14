import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type {
  InventoryItem,
  InventoryItemDetail,
  InventoryItemPage,
  RuntimeBehaviorUserLabel,
} from '../../shared/api/types'
import { ApiClientError } from '../../shared/api/client'
import { useApi } from '../../shared/api/context'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Modal } from '../../shared/ui/modal'
import { deleteInventoryUserLabel, inventoryKeys, putInventoryUserLabel } from './queries'

const invalidControlCharacter = /\p{Cc}/u

function validationMessage(value: string, t: ReturnType<typeof useLocalization>['t']) {
  const trimmed = value.trim()
  if (!trimmed) return t('behaviorLabelRequired')
  if (Array.from(trimmed).length > 120) return t('behaviorLabelTooLong')
  if (invalidControlCharacter.test(trimmed)) return t('behaviorLabelControlCharacters')
  return undefined
}

const isConflict = (error: unknown) =>
  error instanceof ApiClientError &&
  error.detail.kind === 'api' &&
  error.detail.status === 409 &&
  error.detail.code === 'label_conflict'

export function InventoryUserLabelHeading({
  item,
  technicalIdentity,
  headingClassName,
  as: Heading = 'h2',
}: {
  item: Pick<InventoryItem, 'user_label'>
  technicalIdentity: ReactNode
  headingClassName: string
  as?: 'h1' | 'h2'
}) {
  if (!item.user_label) return <Heading className={headingClassName}>{technicalIdentity}</Heading>
  return (
    <div>
      <Heading className={headingClassName}>{item.user_label.display_name}</Heading>
      <div className="mt-1 text-sm font-normal text-slate-400">{technicalIdentity}</div>
    </div>
  )
}

export function BehaviorUserLabels({
  labels,
  technicalTitle,
  headingClassName,
  as: Heading = 'div',
}: {
  labels: RuntimeBehaviorUserLabel[]
  technicalTitle: ReactNode
  headingClassName: string
  as?: 'h1' | 'h2' | 'div'
}) {
  const { t } = useLocalization()
  if (labels.length === 0) return <Heading className={headingClassName}>{technicalTitle}</Heading>
  return (
    <div>
      {labels.length === 1 ? (
        <Heading className={headingClassName}>{labels[0]!.display_name}</Heading>
      ) : (
        <ul aria-label={t('behaviorLabels')} className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <li
              key={`${label.display_name}:${label.updated_at}`}
              className="rounded-full border border-cyan-800 px-2 py-1 text-sm text-cyan-100"
            >
              {label.display_name}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 text-sm font-normal text-slate-400">{technicalTitle}</div>
    </div>
  )
}

export function InventoryUserLabelEditor({
  projectId,
  applicationId,
  itemId,
  userLabel,
}: {
  projectId: string
  applicationId: string
  itemId: string
  userLabel: RuntimeBehaviorUserLabel | null
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { t } = useLocalization()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(userLabel?.display_name ?? '')
  const [status, setStatus] = useState<string>()
  const validation = validationMessage(displayName, t)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['runtime-inventory-list'] }),
      queryClient.invalidateQueries({ queryKey: ['runtime-inventory-distribution'] }),
      queryClient.invalidateQueries({ queryKey: ['runtime-inventory-item'] }),
      queryClient.invalidateQueries({ queryKey: ['runtime-groups'] }),
      queryClient.invalidateQueries({ queryKey: ['runtime-group'] }),
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'applications', applicationId, 'attention'],
      }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'deliveries'] }),
    ])
    const detail = queryClient.getQueryData<InventoryItemDetail>(
      inventoryKeys.item(projectId, applicationId, itemId),
    )
    if (detail) return detail.user_label
    for (const [, page] of queryClient.getQueriesData<InventoryItemPage>({
      queryKey: ['runtime-inventory-list'],
    })) {
      const current = page?.items.find((item) => item.id === itemId)
      if (current) return current.user_label
    }
    return null
  }
  const save = useMutation({
    mutationFn: () =>
      putInventoryUserLabel(api, projectId, applicationId, itemId, {
        display_name: displayName.trim(),
        expected_updated_at: userLabel?.updated_at ?? null,
      }),
    onSuccess: async () => {
      await refresh()
      setOpen(false)
      setStatus(t('behaviorLabelSaved'))
    },
    onError: async (error) => {
      if (isConflict(error)) {
        const current = await refresh()
        setDisplayName(current?.display_name ?? '')
      }
    },
  })
  const remove = useMutation({
    mutationFn: () =>
      deleteInventoryUserLabel(api, projectId, applicationId, itemId, userLabel?.updated_at),
    onSuccess: async () => {
      await refresh()
      setOpen(false)
      setStatus(t('behaviorLabelRemoved'))
    },
    onError: async (error) => {
      if (isConflict(error)) {
        const current = await refresh()
        setDisplayName(current?.display_name ?? '')
      }
    },
  })
  const error = save.error ?? remove.error
  const pending = save.isPending || remove.isPending
  return (
    <>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDisplayName(userLabel?.display_name ?? '')
            setStatus(undefined)
            save.reset()
            remove.reset()
            setOpen(true)
          }}
        >
          {userLabel ? t('editBehaviorLabel') : t('addBehaviorLabel')}
        </Button>
        {status && (
          <span role="status" className="text-sm text-emerald-300">
            {status}
          </span>
        )}
      </div>
      {open && (
        <Modal
          title={userLabel ? t('editBehaviorLabel') : t('addBehaviorLabel')}
          description={t('behaviorLabelHelp')}
          onClose={() => setOpen(false)}
          closeDisabled={pending}
        >
          <div className="space-y-4">
            <label className="block text-sm" htmlFor={`behavior-label-${itemId}`}>
              {t('behaviorLabel')}
            </label>
            <input
              id={`behavior-label-${itemId}`}
              autoFocus
              value={displayName}
              aria-invalid={validation ? true : undefined}
              aria-describedby={`behavior-label-help-${itemId}`}
              onChange={(event) => {
                setDisplayName(event.target.value)
                save.reset()
                remove.reset()
              }}
              className="w-full rounded border border-slate-700 bg-slate-950 p-2"
            />
            <p id={`behavior-label-help-${itemId}`} className="text-sm text-slate-400">
              {validation ?? t('behaviorLabelLimit')}
            </p>
            {error && (
              <div role="alert" className="rounded-lg border border-rose-800 p-3 text-sm">
                <strong>
                  {isConflict(error) ? t('behaviorLabelConflict') : t('behaviorLabelSaveFailed')}
                </strong>
                {isConflict(error) && (
                  <p className="mt-1 text-slate-300">{t('behaviorLabelConflictHelp')}</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                {userLabel && (
                  <span>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => remove.mutate()}
                    >
                      {remove.isPending ? t('removingBehaviorLabel') : t('removeBehaviorLabel')}
                    </Button>
                    <span className="mt-1 block max-w-72 text-xs text-slate-400">
                      {t('behaviorLabelRemoveHelp')}
                    </span>
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(validation) || pending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? t('savingBehaviorLabel') : t('saveBehaviorLabel')}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

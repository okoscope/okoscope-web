import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LocalizationProvider,
  englishMessages,
  formatDateTime,
  formatNumber,
  LANGUAGE_STORAGE_KEY,
  pluralCategory,
  resolveLocale,
  russianMessages,
  translate,
  useLocalization,
} from '.'

describe('localization', () => {
  afterEach(() => vi.restoreAllMocks())
  it('keeps dictionary keys aligned and interpolates values', () => {
    expect(Object.keys(russianMessages).sort()).toEqual(Object.keys(englishMessages).sort())
    expect(translate('ru', 'errorCode', { code: 'E_42' })).toBe('Код ошибки: E_42')
    expect(translate('ru', 'neverObserved')).toBe('Никогда не наблюдалось')
    expect(translate('ru', 'applicationActivity')).toBe('Активность приложения')
    expect(translate('ru', 'processLaunches')).toBe('Запуски процессов')
    expect(translate('ru', 'networkActivity')).toBe('Сетевая активность')
    expect(translate('ru', 'recommendations')).toBe('Рекомендации')
    expect(translate('ru', 'comingSoon')).toBe('Скоро')
    expect(translate('ru', 'newDiscoveries')).toBe('Новые обнаружения')
    expect(translate('ru', 'changesAfterRelease')).toBe('Изменения после релиза')
  })
  it('resolves saved, browser, and fallback locales', () => {
    expect(resolveLocale({ getItem: () => 'ru' }, ['en-US'])).toBe('ru')
    expect(resolveLocale({ getItem: () => null }, ['fr', 'ru-RU'])).toBe('ru')
    expect(resolveLocale({ getItem: () => null }, ['fr'])).toBe('en')
    expect(
      resolveLocale(
        {
          getItem: () => {
            throw new Error('denied')
          },
        },
        ['ru'],
      ),
    ).toBe('ru')
  })
  it('switches immediately, persists, and updates document language', () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocalizationProvider initialLocale="en">{children}</LocalizationProvider>
    )
    const { result } = renderHook(useLocalization, { wrapper })
    act(() => result.current.setLocale('ru'))
    expect(result.current.t('projects')).toBe('Проекты')
    expect(document.documentElement.lang).toBe('ru')
    expect(setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'ru')
  })
  it('formats values with an explicit locale', () => {
    expect(formatNumber('en', 1234)).not.toBe(formatNumber('ru', 1234))
    expect(
      formatDateTime('ru', new Date('2025-01-02T12:00:00Z'), {
        timeZone: 'UTC',
        dateStyle: 'medium',
      }),
    ).toContain('2025')
    expect(pluralCategory('ru', 2)).toBe('few')
  })
  it('preserves nested code tokens and attributes inside translate=no while translating surrounding UI', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <div>
          <button>Projects</button>
          <code translate="no">
            <span title="Projects">enabled</span>
          </code>
        </div>
      </LocalizationProvider>,
    )
    expect(await screen.findByRole('button', { name: 'Проекты' })).toBeVisible()
    const token = screen.getByText('enabled')
    expect(token).toHaveTextContent('enabled')
    expect(token).toHaveAttribute('title', 'Projects')
  })
  it('translates complete dynamic UI states without mixing languages', async () => {
    function DynamicButton() {
      const [saving, setSaving] = useState(false)
      return (
        <button onClick={() => setSaving(true)}>{saving ? 'Saving…' : 'Create destination'}</button>
      )
    }
    render(
      <LocalizationProvider initialLocale="ru">
        <DynamicButton />
      </LocalizationProvider>,
    )
    const button = await screen.findByRole('button', { name: 'Создать назначение' })
    fireEvent.click(button)
    expect(await screen.findByRole('button', { name: 'Сохранение…' })).toBeVisible()
  })
  it('translates dynamic runtime inventory labels and count forms', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <section aria-label="Most observed dns request">
          <p>18 unique behaviors</p>
          <p>1 unique identities</p>
          <p>Other observed dns request</p>
          <p>Deployment/payment-api</p>
        </section>
      </LocalizationProvider>,
    )
    expect(await screen.findByText('18 уникальных вариантов поведения')).toBeVisible()
    expect(screen.getByText('1 уникальная идентичность')).toBeVisible()
    expect(screen.getByText('Прочие наблюдаемые DNS-запрос')).toBeVisible()
    expect(screen.getByText('Deployment/payment-api')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Наиболее наблюдаемые DNS-запрос' })).toBeVisible()
  })
  it('translates termination and restart event labels through the legacy dictionary', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <div>
          <a href="/process-exit">Process terminated</a>
          <span>Container terminated</span>
          <span>Container restarted</span>
          <span>Restart loop observed</span>
        </div>
      </LocalizationProvider>,
    )
    expect(await screen.findByRole('link', { name: 'Процесс завершён' })).toBeVisible()
    expect(screen.getByText('Контейнер завершён')).toBeVisible()
    expect(screen.getByText('Контейнер перезапущен')).toBeVisible()
    expect(screen.getByText('Обнаружен цикл перезапусков')).toBeVisible()
  })
  it('translates the temporary suppression dialog', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <section>
          <h2>Temporarily suppress observation</h2>
          <p>All application placements</p>
        </section>
      </LocalizationProvider>,
    )
    expect(
      await screen.findByRole('heading', { name: 'Временно подавить наблюдение' }),
    ).toBeVisible()
    expect(screen.getByText('Все размещения приложения')).toBeVisible()
  })
  it('translates discovery empty states', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <section>
          <h2>No matching discoveries</h2>
          <p>Adjust the filters to broaden this view.</p>
          <h2>No discoveries yet</h2>
          <p>Newly observed behavior will appear here.</p>
        </section>
      </LocalizationProvider>,
    )
    expect(await screen.findByText('Нет подходящих обнаружений')).toBeVisible()
    expect(screen.getByText('Измените фильтры, чтобы расширить выборку.')).toBeVisible()
    expect(screen.getByText('Обнаружений пока нет')).toBeVisible()
    expect(
      screen.getByText('Здесь появится поведение, впервые обнаруженное в приложении.'),
    ).toBeVisible()
  })
})

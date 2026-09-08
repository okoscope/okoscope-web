import { Activity, CircleCheck, Database, Download, Settings, UserRound } from 'lucide-react'
import type { Locale } from '../../shared/i18n'
import { SetupFlow, type SetupStage } from './quick-start-flow'

const stages: SetupStage[] = [
  {
    en: 'Prepare',
    ru: 'Подготовка',
    steps: [
      { id: 'database', icon: Database, en: 'Database Secret', ru: 'Secret базы данных' },
      {
        id: 'production-values',
        icon: Settings,
        en: 'Access & settings',
        ru: 'Доступ и настройки',
      },
    ],
  },
  {
    en: 'Deploy',
    ru: 'Развёртывание',
    steps: [
      { id: 'rollout', icon: Download, en: 'Install server', ru: 'Установка сервера' },
      { id: 'verify', icon: CircleCheck, en: 'Check readiness', ru: 'Проверка готовности' },
    ],
  },
  {
    en: 'Connect',
    ru: 'Подключение',
    steps: [
      { id: 'claim', icon: UserRound, en: 'First owner', ru: 'Первый владелец' },
      { id: 'connect-agents', icon: Activity, en: 'Agents & first event', ru: 'Агенты и событие' },
    ],
  },
]

export function getSelfHostingIcon(sectionId: string) {
  return stages.flatMap((stage) => stage.steps).find((step) => step.id === sectionId)?.icon
}

export function SelfHostingFlow({ locale }: { locale: Locale }) {
  const title =
    locale === 'ru' ? 'От базы данных до первого события' : 'From database to the first event'
  return <SetupFlow locale={locale} stages={stages} title={title} />
}

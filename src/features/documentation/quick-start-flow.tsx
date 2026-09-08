import {
  Activity,
  ArrowDown,
  ArrowRight,
  CircleCheck,
  Download,
  KeyRound,
  Server,
  UserRound,
} from 'lucide-react'
import type { Locale } from '../../shared/i18n'
import type { LucideIcon } from 'lucide-react'
import './quick-start-flow.css'

const stages = [
  {
    en: 'Prepare',
    ru: 'Подготовка',
    steps: [
      { id: 'access', icon: UserRound, en: 'Access & Application', ru: 'Доступ и приложение' },
      { id: 'workload', icon: Server, en: 'Kubernetes workload', ru: 'Нагрузка Kubernetes' },
    ],
  },
  {
    en: 'Install',
    ru: 'Установка',
    steps: [
      { id: 'secret', icon: KeyRound, en: 'Token Secret', ru: 'Secret с токеном' },
      { id: 'deploy', icon: Download, en: 'Install agent', ru: 'Установка агента' },
    ],
  },
  {
    en: 'Verify',
    ru: 'Проверка',
    steps: [
      { id: 'check-agent', icon: CircleCheck, en: 'Check startup', ru: 'Проверка запуска' },
      { id: 'first-event', icon: Activity, en: 'First observation', ru: 'Первое наблюдение' },
    ],
  },
]

export function getQuickStartIcon(sectionId: string) {
  return stages.flatMap((stage) => stage.steps).find((step) => step.id === sectionId)?.icon
}

export function QuickStartFlow({ locale }: { locale: Locale }) {
  const title = locale === 'ru' ? 'От доступа до первого события' : 'From access to the first event'
  return <SetupFlow locale={locale} stages={stages} title={title} />
}

export type SetupStage = {
  en: string
  ru: string
  steps: { id: string; icon: LucideIcon; en: string; ru: string }[]
}

export function SetupFlow({
  locale,
  stages,
  title,
}: {
  locale: Locale
  stages: SetupStage[]
  title: string
}) {
  return (
    <nav className="docs-setup-flow" aria-label={title}>
      <div className="docs-setup-flow-stages">
        {stages.map((stage, stageIndex) => (
          <div className="docs-setup-flow-stage" key={stage.en}>
            <p className="docs-setup-flow-stage-title">{stage[locale]}</p>
            <ol
              start={stages
                .slice(0, stageIndex)
                .reduce((count, item) => count + item.steps.length, 1)}
              role="list"
              aria-label={stage[locale]}
            >
              {stage.steps.map((step, stepIndex) => {
                const Icon = step.icon
                return (
                  <li key={step.id}>
                    <a href={`#${step.id}`}>
                      <span className="docs-setup-flow-badge" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <span>{step[locale]}</span>
                    </a>
                    {stepIndex < stage.steps.length - 1 && (
                      <ArrowDown
                        className="docs-setup-flow-inner-arrow"
                        size={18}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                )
              })}
            </ol>
            {stageIndex < stages.length - 1 && (
              <ArrowRight className="docs-setup-flow-arrow" size={24} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}

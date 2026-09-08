import { Link, useRouterState } from '@tanstack/react-router'
import { Fragment, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BellCheck,
  BellOff,
  BellRing,
  BookOpen,
  Cpu,
  Database,
  EyeOff,
  FileCog,
  Gauge,
  GitCompareArrows,
  History,
  ListChecks,
  MonitorX,
  Network,
  RotateCcw,
  ScanSearch,
  ScrollText,
  SearchX,
  Server,
  ServerCog,
  ShieldCheck,
  ShieldKeyhole,
  Unplug,
  Wrench,
} from 'lucide-react'
import { useLocalization, type Locale } from '../../shared/i18n'
import { LanguageSelector } from '../../shared/i18n/language-selector'
import { Brand } from '../../shared/ui/brand'
import { CodeExample } from '../../shared/ui/code-example'
import { articles, controls, type ArticleList, type ListIcon, type SectionIcon } from './content'
import './documentation.css'
import { getQuickStartIcon, QuickStartFlow } from './quick-start-flow'
import { getSelfHostingIcon, SelfHostingFlow } from './self-hosting-flow'

const sectionIcons = {
  processes: Cpu,
  network: Network,
  files: FileCog,
  review: ListChecks,
} satisfies Record<SectionIcon, typeof Cpu>

const listIcons = {
  cluster: Server,
  tools: Wrench,
  network: Network,
  security: ShieldCheck,
  database: Database,
} satisfies Record<ListIcon, typeof Cpu>

const troubleshootingIcons: Record<string, typeof Cpu> = {
  connection: Unplug,
  empty: SearchX,
  web: MonitorX,
  delivery: BellOff,
}

const dataSecurityIcons: Record<string, typeof Cpu> = {
  collection: ScanSearch,
  permissions: ShieldKeyhole,
  'runtime-retention': History,
  'notification-retention': BellRing,
}

const compatibilityIcons: Record<string, typeof Cpu> = {
  platform: ServerCog,
  profiles: Gauge,
  evidence: EyeOff,
}

const workflowIcons: Record<string, typeof Cpu> = {
  'new-connection': Network,
  policies: ScrollText,
  release: GitCompareArrows,
  restarts: RotateCcw,
  notifications: BellCheck,
}

function getArticleSectionIcon(slug: string, sectionId: string) {
  if (slug === 'quick-start') return getQuickStartIcon(sectionId)
  if (slug === 'self-hosting') return getSelfHostingIcon(sectionId)
  if (slug === 'workflows') return workflowIcons[sectionId]
  if (slug === 'compatibility-and-limits') return compatibilityIcons[sectionId]
  if (slug === 'data-and-security') return dataSecurityIcons[sectionId]
  if (slug === 'troubleshooting') return troubleshootingIcons[sectionId]
  return undefined
}

export function Documentation({ slug }: { slug: string }) {
  const { locale, t } = useLocalization()
  const ui = controls[locale]
  const hash = useRouterState({ select: (state) => state.location.hash })
  const article = articles.find((item) => item.slug === slug)
  useEffect(() => {
    document.title = `${article?.title[locale] ?? ui.notFound} · ${t('documentation')} · Okoscope`
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView())
  }, [article, locale, hash, t, ui.notFound])
  const navigation = (
    <ul>
      {articles.map((item) => (
        <li key={item.slug}>
          <Link
            to="/docs/$slug"
            params={{ slug: item.slug }}
            aria-current={slug === item.slug ? 'page' : undefined}
          >
            <BrandText text={item.title[locale]} />
          </Link>
        </li>
      ))}
    </ul>
  )
  return (
    <div className="docs-shell">
      <a className="docs-skip" href="#main-content">
        {ui.skip}
      </a>
      <header className="docs-header">
        <Link to="/docs" aria-label="OKOSCOPE" className="brand-link">
          <Brand />
        </Link>
        <nav aria-label={t('primaryNavigation')}>
          <Link to="/docs">{t('documentation')}</Link>
          <Link to="/">{ui.application}</Link>
          <LanguageSelector showLabel={false} />
        </nav>
      </header>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav aria-label={ui.articles}>{navigation}</nav>
        </aside>
        <div className="docs-reading">
          <details className="docs-mobile">
            <summary>{ui.articles}</summary>
            <nav aria-label={ui.articles}>{navigation}</nav>
          </details>
          <main id="main-content" tabIndex={-1}>
            <p className="eyebrow">{t('documentation')}</p>
            <h1>
              <BrandText text={article?.title[locale] ?? ui.notFound} />
            </h1>
            {article ? (
              <>
                <p className="docs-intro">
                  <DocumentationText
                    text={article.intro[locale]}
                    accent={article.introAccent?.[locale]}
                  />
                </p>
                {(slug === 'quick-start' || slug === 'self-hosting') && (
                  <p>
                    <a href="https://github.com/okoscope/okoscope/tree/main/deploy/helm">
                      {ui.repository}
                    </a>
                  </p>
                )}
                <nav className="docs-toc" aria-label={ui.onPage}>
                  <p className="docs-toc-label">{ui.onPage}</p>
                  <ul>
                    {article.sections.map((section) => {
                      const Icon = getArticleSectionIcon(slug, section.id)
                      return (
                        <li
                          key={section.id}
                          className={`docs-toc-level-${section.headingLevel ?? 2}${Icon ? ' docs-toc-icon-item' : ''}`}
                        >
                          <a href={`#${section.id}`}>
                            {Icon && (
                              <Icon className="docs-toc-icon" size={16} aria-hidden="true" />
                            )}
                            <BrandText text={section.title[locale]} />
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
                {article.sections.map((section) => {
                  const Heading = section.headingLevel === 3 ? 'h3' : 'h2'
                  const Icon =
                    getArticleSectionIcon(slug, section.id) ??
                    (section.icon ? sectionIcons[section.icon] : null)
                  return (
                    <Fragment key={section.id}>
                      {slug === 'quick-start' && section.id === 'access' && (
                        <QuickStartFlow locale={locale} />
                      )}
                      {slug === 'self-hosting' && section.id === 'database' && (
                        <SelfHostingFlow locale={locale} />
                      )}
                      <section aria-labelledby={section.id}>
                        <Heading id={section.id}>
                          {Icon && (
                            <Icon className="docs-section-icon" size={22} aria-hidden="true" />
                          )}
                          <a href={`#${section.id}`}>
                            <BrandText text={section.title[locale]} />
                          </a>
                        </Heading>
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index}>
                            <DocumentationText text={paragraph[locale]} />
                          </p>
                        ))}
                        {section.list && <DocumentationList list={section.list} locale={locale} />}
                        {section.callout && (
                          <aside
                            className="docs-callout"
                            aria-label={section.callout.title[locale]}
                          >
                            <AlertTriangle
                              className="docs-callout-icon"
                              size={20}
                              aria-hidden="true"
                            />
                            <div>
                              <strong>{section.callout.title[locale]}</strong>
                              <p>
                                <DocumentationText text={section.callout.body[locale]} />
                              </p>
                            </div>
                          </aside>
                        )}
                        {section.diagram && (
                          <figure className="docs-diagram">
                            <img
                              src={section.diagram.source[locale]}
                              alt={section.diagram.alt[locale]}
                              loading="lazy"
                              decoding="async"
                            />
                            {section.diagram.caption && (
                              <figcaption>
                                <DocumentationText text={section.diagram.caption[locale]} />
                              </figcaption>
                            )}
                          </figure>
                        )}
                        {section.definitions && (
                          <ul className="docs-definitions">
                            {section.definitions.map((definition) => (
                              <li key={definition.term.en}>
                                <strong>
                                  <BrandText text={definition.term[locale]} />
                                </strong>{' '}
                                <BrandText text={definition.description[locale]} />
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.code && (
                          <CodeExample
                            key={locale}
                            labels={ui}
                            language={section.codeLanguage}
                            code={
                              typeof section.code === 'string' ? section.code : section.code[locale]
                            }
                          />
                        )}
                      </section>
                    </Fragment>
                  )
                })}
                <nav className="docs-related" aria-label={ui.related}>
                  <h2>{ui.related}</h2>
                  <div className="docs-related-grid">
                    {article.related.map((related) => {
                      const item = articles.find((entry) => entry.slug === related)!
                      return (
                        <Link
                          className="docs-related-card"
                          key={related}
                          to="/docs/$slug"
                          params={{ slug: related }}
                        >
                          <BookOpen className="docs-related-icon" size={18} aria-hidden="true" />
                          <span>
                            <BrandText text={item.title[locale]} />
                          </span>
                          <ArrowUpRight
                            className="docs-related-arrow"
                            size={16}
                            aria-hidden="true"
                          />
                        </Link>
                      )
                    })}
                  </div>
                </nav>
              </>
            ) : (
              <p>{ui.notFoundHelp}</p>
            )}
            <footer>
              <Link to="/docs">{ui.overview}</Link>
              <Link to="/">{ui.application}</Link>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}

function BrandText({ text }: { text: string }) {
  return text.split(/(Okoscope)/g).map((part, index) =>
    part === 'Okoscope' ? (
      <strong className="docs-brand-text" key={index}>
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

function DocumentationList({ list, locale }: { list: ArticleList; locale: Locale }) {
  const List = list.ordered ? 'ol' : 'ul'
  const hasIcons = !list.ordered && list.items.every((item) => item.icon)
  return (
    <List
      className={`docs-instructions${hasIcons ? ' docs-icon-list' : ''}`}
      role={hasIcons ? 'list' : undefined}
    >
      {list.items.map((item, index) => {
        const Icon = hasIcons && item.icon ? listIcons[item.icon] : null
        return (
          <li key={index}>
            {Icon && <Icon className="docs-list-icon" size={20} aria-hidden="true" />}
            <span>
              <DocumentationText text={item[locale]} />
            </span>
          </li>
        )
      })}
    </List>
  )
}

const documentationLinks = {
  'https://okoscope.com/onboarding': 'https://okoscope.com/onboarding',
  'https://okoscope.com': 'https://okoscope.com',
  'https://github.com/okoscope/okoscope': 'https://github.com/okoscope/okoscope',
  'deploy/kubernetes/agent/daemonset.yaml':
    'https://github.com/okoscope/okoscope/blob/main/deploy/kubernetes/agent/daemonset.yaml',
  'deploy/kubernetes/common/secret.example.yaml':
    'https://github.com/okoscope/okoscope/blob/main/deploy/kubernetes/common/secret.example.yaml',
  'deploy/kubernetes/common/namespace.yaml':
    'https://github.com/okoscope/okoscope/blob/main/deploy/kubernetes/common/namespace.yaml',
  'deploy/kubernetes/common/postgres.yaml':
    'https://github.com/okoscope/okoscope/blob/main/deploy/kubernetes/common/postgres.yaml',
  'deploy/kubernetes/common':
    'https://github.com/okoscope/okoscope/tree/main/deploy/kubernetes/common',
  'deploy/kubernetes/agent':
    'https://github.com/okoscope/okoscope/tree/main/deploy/kubernetes/agent',
} as const

const documentationLinkPattern = new RegExp(
  `(${Object.keys(documentationLinks)
    .sort((left, right) => right.length - left.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
)

function DocumentationText({ text, accent }: { text: string; accent?: string | undefined }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          className={part.slice(2, -2) === accent ? 'docs-intro-accent' : undefined}
          key={index}
        >
          <BrandText text={part.slice(2, -2)} />
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code className="docs-inline-code" key={index}>
          {part.slice(1, -1)}
        </code>
      )
    }
    return <DocumentationLinks text={part} key={index} />
  })
}

function DocumentationLinks({ text }: { text: string }) {
  const { locale } = useLocalization()
  const guidePattern =
    /(\/docs\/(?:quick-start|self-hosting|compatibility-and-limits|data-and-security|troubleshooting))/g
  return text.split(guidePattern).map((part, index) => {
    const guide = articles.find((article) => `/docs/${article.slug}` === part)
    return guide ? (
      <Link to="/docs/$slug" params={{ slug: guide.slug }} key={index}>
        <BrandText text={guide.title[locale]} />
      </Link>
    ) : (
      <DocumentationExternalLinks text={part} key={index} />
    )
  })
}

function DocumentationExternalLinks({ text }: { text: string }) {
  return text.split(documentationLinkPattern).map((part, index) => {
    const href = documentationLinks[part as keyof typeof documentationLinks]
    return href ? (
      <a href={href} key={index}>
        <BrandText text={part} />
      </a>
    ) : (
      <BrandText text={part} key={index} />
    )
  })
}

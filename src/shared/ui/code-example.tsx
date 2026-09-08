import { useState, type ReactNode } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'
import './code-example.css'

function renderCodeTokens(tokens: string | Prism.Token | (string | Prism.Token)[]): ReactNode {
  if (typeof tokens === 'string') return tokens
  if (Array.isArray(tokens)) {
    return tokens.map((token, index) =>
      typeof token === 'string' ? (
        token
      ) : (
        <span className={`token ${token.type}`} key={index}>
          {renderCodeTokens(token.content)}
        </span>
      ),
    )
  }
  return <span className={`token ${tokens.type}`}>{renderCodeTokens(tokens.content)}</span>
}

export function CodeExample({
  code,
  language,
  labels: ui,
}: {
  code: string
  language: 'bash' | 'yaml' | undefined
  labels: { copy: string; copied: string; copyFailed: string; example: string }
}) {
  const grammar = language ? Prism.languages[language] : undefined
  const [status, setStatus] = useState<'copied' | 'copyFailed' | null>(null)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setStatus('copied')
    } catch {
      setStatus('copyFailed')
    }
  }
  return (
    <div className="docs-code">
      <div className="docs-code-toolbar">
        {language && (
          <span className="docs-code-language">{language === 'bash' ? 'Bash' : 'YAML'}</span>
        )}
        <button type="button" onClick={() => void copy()}>
          {ui.copy}
        </button>
        <span role="status">{status ? ui[status] : ''}</span>
      </div>
      <pre tabIndex={0} aria-label={ui.example}>
        <code translate="no" className={language ? `language-${language}` : undefined}>
          {grammar ? renderCodeTokens(Prism.tokenize(code, grammar)) : code}
        </code>
      </pre>
    </div>
  )
}

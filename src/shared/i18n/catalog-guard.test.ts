import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { legacyRussian } from './legacy'

const technicalLiterals = new Set(['OKOSCOPE', 'Okoscope', 'ms', 'null'])

function jsxInterfaceLiterals(): Set<string> {
  const literals = new Set<string>()
  const files = ts.sys.readDirectory(
    'src',
    ['.tsx'],
    ['**/*.test.tsx'],
    ['routes/**/*.tsx', 'features/**/*.tsx', 'shared/ui/**/*.tsx'],
  )
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      ts.sys.readFile(file) ?? '',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const visit = (node: ts.Node): void => {
      if (ts.isJsxText(node)) {
        const value = node.text.replace(/\s+/g, ' ').trim()
        if (/[A-Za-z]/.test(value)) literals.add(value)
      }
      if (
        ts.isJsxAttribute(node) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        ['aria-label', 'placeholder', 'title', 'label', 'description', 'current'].includes(
          node.name.getText(),
        )
      )
        literals.add(node.initializer.text)
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText() === 'label' &&
        ts.isStringLiteral(node.initializer)
      )
        literals.add(node.initializer.text)
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return literals
}

describe('translation catalog guardrails', () => {
  it('keeps translations centralized and covers the established UI vocabulary', () => {
    expect(Object.keys(legacyRussian).length).toBeGreaterThan(100)
    expect(legacyRussian['No activity observed']).toBe('Активность не наблюдалась')
    expect(legacyRussian['End of activity results']).toBe('Конец списка активности')
    expect(new Set(Object.keys(legacyRussian)).size).toBe(Object.keys(legacyRussian).length)
    for (const [english, russian] of Object.entries(legacyRussian)) {
      expect(english.trim()).not.toBe('')
      expect(russian, english).toMatch(/[А-Яа-яЁё]/)
    }
    const missing = [...jsxInterfaceLiterals()].filter(
      (literal) => !technicalLiterals.has(literal) && !(literal in legacyRussian),
    )
    expect(missing).toEqual([])
  })
})

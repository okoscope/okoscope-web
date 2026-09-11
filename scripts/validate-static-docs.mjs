import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const contentRoot = path.join(repositoryRoot, 'public-docs/src/content/docs')
const outputRoot = path.join(repositoryRoot, 'public-docs/dist')
const expectedSlugs = [
  'access-control',
  'account-email',
  'application-resources',
  'capabilities',
  'compatibility-and-limits',
  'data-and-security',
  'how-it-works',
  'index',
  'quick-start',
  'self-hosting',
  'troubleshooting',
  'workflows',
]

const errors = []
/** @type {Set<string>} */
const canonicalUrls = new Set()

for (const locale of ['en', 'ru']) {
  const files = (await readdir(path.join(contentRoot, locale)))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => path.basename(file, '.mdx'))
    .sort()
  if (JSON.stringify(files) !== JSON.stringify(expectedSlugs)) {
    errors.push(
      `${locale}: expected paired articles ${expectedSlugs.join(', ')}, found ${files.join(', ')}`,
    )
  }

  for (const slug of expectedSlugs) {
    const sourcePath = path.join(contentRoot, locale, `${slug}.mdx`)
    const source = await readFile(sourcePath, 'utf8')
    const routeSlug = slug === 'index' ? '' : `${slug}/`
    const canonical = `https://okoscope.com/docs/${locale}/${routeSlug}`
    const alternateLocale = locale === 'en' ? 'ru' : 'en'
    const alternate = `https://okoscope.com/docs/${alternateLocale}/${routeSlug}`
    for (const required of ['title:', 'description:', canonical, alternate]) {
      if (!source.includes(required)) errors.push(`${sourcePath}: missing ${required}`)
    }
    if (canonicalUrls.has(canonical)) errors.push(`${sourcePath}: duplicate canonical ${canonical}`)
    canonicalUrls.add(canonical)

    for (const match of source.matchAll(/\]\((\/docs\/(?:en|ru)\/[^)#\s]*)(?:#[^)]+)?\)/g)) {
      const urlPath = match[1]
      const relative = urlPath.replace(/^\/docs\//, '').replace(/\/$/, '')
      const target =
        relative === 'en' || relative === 'ru'
          ? path.join(contentRoot, relative, 'index.mdx')
          : path.join(contentRoot, `${relative}.mdx`)
      try {
        await access(target)
      } catch {
        errors.push(`${sourcePath}: broken documentation link ${urlPath}`)
      }
    }

    for (const match of source.matchAll(/!\[[^\]]*\]\((\/documentation\/[^)]+)\)/g)) {
      try {
        await access(path.join(repositoryRoot, 'public', match[1].slice(1)))
      } catch {
        errors.push(`${sourcePath}: missing image ${match[1]}`)
      }
    }

    const htmlPath =
      slug === 'index'
        ? path.join(outputRoot, locale, 'index.html')
        : path.join(outputRoot, locale, slug, 'index.html')
    let html
    try {
      html = await readFile(htmlPath, 'utf8')
    } catch {
      errors.push(`${htmlPath}: generated page is missing`)
      continue
    }
    for (const required of [
      `<html lang="${locale}"`,
      `rel="canonical" href="${canonical}"`,
      `hreflang="en"`,
      `hreflang="ru"`,
      'property="og:title"',
      'name="twitter:title"',
    ]) {
      if (!html.includes(required)) errors.push(`${htmlPath}: missing generated ${required}`)
    }
  }
}

const sitemapFiles = (await readdir(outputRoot)).filter((file) => file.startsWith('sitemap'))
if (sitemapFiles.length === 0) errors.push('generated sitemap is missing')
else {
  const sitemapText = (
    await Promise.all(sitemapFiles.map((file) => readFile(path.join(outputRoot, file), 'utf8')))
  ).join('\n')
  for (const canonical of canonicalUrls) {
    if (!sitemapText.includes(canonical)) errors.push(`sitemap is missing ${canonical}`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Validated ${canonicalUrls.size} localized static documentation pages.`)

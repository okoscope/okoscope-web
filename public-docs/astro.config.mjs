import sitemap from '@astrojs/sitemap'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const articles = [
  '',
  'access-control',
  'how-it-works',
  'account-email',
  'quick-start',
  'self-hosting',
  'application-resources',
  'capabilities',
  'workflows',
  'compatibility-and-limits',
  'data-and-security',
  'troubleshooting',
]

export default defineConfig({
  site: 'https://okoscope.com',
  base: '/docs',
  publicDir: '../public',
  integrations: [
    starlight({
      title: 'Okoscope',
      logo: {
        src: './src/assets/logo.svg',
        alt: '',
      },
      components: {
        Header: './src/components/Header.astro',
        SiteTitle: './src/components/SiteTitle.astro',
      },
      description: 'Okoscope documentation for Kubernetes runtime observability.',
      defaultLocale: 'en',
      locales: {
        en: { label: 'English', lang: 'en' },
        ru: { label: 'Русский', lang: 'ru' },
      },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/okoscope/okoscope' }],
      sidebar: articles.map((slug) => ({ slug })),
      customCss: ['./src/styles/custom.css'],
      head: [
        { tag: 'meta', attrs: { property: 'og:site_name', content: 'Okoscope' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://okoscope.com/social-preview.png' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://okoscope.com/social-preview.png' },
        },
        {
          tag: 'script',
          content: `document.addEventListener('change', (event) => {
            const select = event.target instanceof Element
              ? event.target.closest('starlight-lang-select select')
              : null;
            if (!(select instanceof HTMLSelectElement) || !window.location.hash) return;
            event.stopImmediatePropagation();
            window.location.href = select.value + window.location.hash;
          }, true);`,
        },
      ],
    }),
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', ru: 'ru' } } }),
  ],
})

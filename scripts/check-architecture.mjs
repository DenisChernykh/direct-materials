import { readFile } from 'node:fs/promises'
import { glob } from 'node:fs/promises'

const forbidden = [
  ['frontend', '/src/db'],
  ['frontend', '/src/env'],
  ['frontend', '/src/instagram'],
]

const files = []
for await (const file of glob('src/frontend/**/*.{ts,tsx}')) files.push(file)
const violations = []

const frontendStyles = await readFile('src/frontend/styles.css', 'utf8')
const requiredStyleMarkers = [
  "@import 'tailwindcss'",
  '@theme inline',
  ':root',
  '--background:',
  '--primary:',
  '@layer base',
]
for (const marker of requiredStyleMarkers) {
  if (!frontendStyles.includes(marker))
    violations.push(
      `src/frontend/styles.css: missing Tailwind token marker ${marker}`,
    )
}

const legacySelectors = [
  'app-shell',
  'sidebar',
  'logo-mark',
  'side-nav',
  'side-link',
  'nav-icon',
  'sidebar-bottom',
  'muted-link',
  'user-box',
  'avatar',
  'icon-button',
  'main-column',
  'content-wrap',
  'mobile-header',
  'page-stack',
  'page-header',
  'eyebrow',
  'text-button',
  'primary-button',
  'secondary-button',
  'destructive-button',
  'button-content-hidden',
  'button-loading',
  'full',
  'centered',
  'connection-banner',
  'connection-icon',
  'connection-copy',
  'metrics-grid',
  'metric-card',
  'metric-label',
  'metric-detail',
  'metric-value',
  'section-block',
  'form-layout',
  'form-section',
  'form-section-heading',
  'form-fields',
  'field-label',
  'field-grid',
  'switch-row',
  'switch',
  'sticky-panel',
  'aside-label',
  'preview-status',
  'status-dot',
  'aside-actions',
  'table-section',
  'table-scroll',
  'table-sub',
  'error-code',
  'public-page',
  'public-header',
  'public-content',
  'auth-page',
  'auth-glow',
  'auth-card',
  'auth-form',
  'auth-heading',
  'auth-footer',
  'empty-state',
  'empty-icon',
  'screen-state',
  'spinner',
  'toolbar',
  'search-box',
  'alert-dialog-content',
]
for (const selector of legacySelectors) {
  if (new RegExp(`\\.${selector}(?=[\\s,{:#.])`).test(frontendStyles))
    violations.push(
      `src/frontend/styles.css: legacy component selector .${selector}`,
    )
}

for (const file of files) {
  const source = await readFile(file, 'utf8')
  if (source.includes('style={{'))
    violations.push(
      `${file}: use Tailwind utilities instead of inline style objects`,
    )
  for (const [label, pattern] of forbidden) {
    if (source.includes(pattern))
      violations.push(`${file}: ${label} boundary imports ${pattern}`)
  }
}

for await (const file of glob('src/frontend/pages/**/*.{ts,tsx}')) {
  const source = await readFile(file, 'utf8')
  if (source.includes('/shared/api') || source.includes('../shared/api'))
    violations.push(`${file}: pages must consume API through feature models`)
}

for await (const file of glob('src/modules/*/application.ts')) {
  const source = await readFile(file, 'utf8')
  for (const pattern of ['/db', '/env', '/infrastructure', '/presentation']) {
    if (source.includes(pattern))
      violations.push(`${file}: application layer imports ${pattern}`)
  }
}

for await (const file of glob('src/modules/*/application/**/*.{ts,tsx}')) {
  const source = await readFile(file, 'utf8')
  for (const pattern of ['/db', '/env', '/infrastructure', '/presentation']) {
    if (source.includes(pattern))
      violations.push(`${file}: application layer imports ${pattern}`)
  }
}

for await (const file of glob('src/modules/*/presentation/**/*.{ts,tsx}')) {
  const source = await readFile(file, 'utf8')
  for (const pattern of ['/db', '/env', '/infrastructure', '/instagram/api']) {
    if (source.includes(pattern))
      violations.push(`${file}: presentation layer imports ${pattern}`)
  }
}
if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exit(1)
}
console.log(`architecture ok (${files.length} frontend files checked)`)

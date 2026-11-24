/**
 * Gera favicon e ícones do PWA a partir da geometria do logotipo.
 * Uso: npm run icons (renderiza com o Chromium do Playwright; sem dependência extra).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, type Page } from '@playwright/test'
import { BRAND_COLORS, LOGO_BLADE_PATHS, LOGO_TILE_RADIUS } from '../src/components/brand/logo-geometry.ts'
import { pngToIco } from './ico.ts'

const PUBLIC_DIR = new URL('../public/', import.meta.url)

const GRADIENT =
  `<defs><linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${BRAND_COLORS.start}"/><stop offset="1" stop-color="${BRAND_COLORS.end}"/>` +
  `</linearGradient></defs>`

/** Lâminas brancas do obturador, na grade de 48, posicionadas por `transform`. */
function blades(transform: string): string {
  return `<g transform="${transform}" fill="#ffffff">${LOGO_BLADE_PATHS.map((d) => `<path d="${d}"/>`).join('')}</g>`
}

/** Ladrilho arredondado com o degradê: favicon e ícone "any", como o símbolo do site. */
const TILE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">` +
  GRADIENT +
  `<rect width="48" height="48" rx="${LOGO_TILE_RADIUS}" fill="url(#brand)"/>` +
  blades('') +
  `</svg>`

/**
 * Degradê cheio e o obturador dentro da zona segura (círculo de 80%): mascarável e Apple,
 * que recortam os cantos por conta própria. O obturador (diâmetro 33 na grade de 48) ocupa 56% do lado.
 */
const FULL_BLEED_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
  GRADIENT +
  `<rect width="512" height="512" fill="url(#brand)"/>` +
  blades('translate(256 256) scale(8.7) translate(-24 -24)') +
  `</svg>`

const PNG_TARGETS = [
  { file: 'icons/icon-192.png', svg: TILE_SVG, size: 192 },
  { file: 'icons/icon-512.png', svg: TILE_SVG, size: 512 },
  { file: 'icons/icon-maskable-512.png', svg: FULL_BLEED_SVG, size: 512 },
  { file: 'apple-touch-icon.png', svg: FULL_BLEED_SVG, size: 180 },
] as const

async function renderPng(page: Page, svg: string, size: number): Promise<Uint8Array> {
  await page.setViewportSize({ width: size, height: size })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${sized}</body>`)
  return page.locator('svg').screenshot({ omitBackground: true })
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await mkdir(new URL('icons/', PUBLIC_DIR), { recursive: true })

  await writeFile(new URL('favicon.svg', PUBLIC_DIR), `${TILE_SVG}\n`)
  console.log('public/favicon.svg')

  for (const target of PNG_TARGETS) {
    await writeFile(new URL(target.file, PUBLIC_DIR), await renderPng(page, target.svg, target.size))
    console.log(`public/${target.file} (${target.size} px)`)
  }

  await writeFile(new URL('favicon.ico', PUBLIC_DIR), pngToIco(await renderPng(page, TILE_SVG, 32), 32))
  console.log('public/favicon.ico (32 px)')
} finally {
  await browser.close()
}

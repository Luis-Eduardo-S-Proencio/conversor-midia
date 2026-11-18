/**
 * Gera favicon e ícones do PWA a partir da geometria do logotipo.
 * Uso: npm run icons (renderiza com o Chromium do Playwright; sem dependência extra).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, type Page } from '@playwright/test'
import { BRAND_COLORS, LOGO_FRAME_PATH, LOGO_PIECE_PATH } from '../src/components/brand/logo-geometry.ts'
import { pngToIco } from './ico.ts'

const PUBLIC_DIR = new URL('../public/', import.meta.url)

function symbol(transform: string): string {
  return (
    `<g transform="${transform}">` +
    `<path fill="${BRAND_COLORS.frame}" d="${LOGO_FRAME_PATH}"/>` +
    `<path fill="${BRAND_COLORS.piece}" d="${LOGO_PIECE_PATH}"/>` +
    `</g>`
  )
}

/** Ladrilho arredondado: favicon e ícone "any". Funciona em abas claras e escuras. */
const TILE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
  `<rect width="32" height="32" rx="7" fill="${BRAND_COLORS.background}"/>` +
  symbol('translate(5 5) scale(0.6875)') +
  `</svg>`

/** Fundo cheio com o símbolo dentro da zona segura (círculo de 80%): mascarável e Apple. */
const FULL_BLEED_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
  `<rect width="512" height="512" fill="${BRAND_COLORS.background}"/>` +
  symbol('translate(112 112) scale(9)') +
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

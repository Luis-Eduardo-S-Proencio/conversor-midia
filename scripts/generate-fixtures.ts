/**
 * Gera as imagens de teste em tests/fixtures/images/ (pequenas, determinísticas, sem fotos reais).
 * Uso: npm run fixtures. Desenha com o canvas do Chromium do Playwright; sem dependência extra.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, type Page } from '@playwright/test'
import { concat, withExifOrientation } from '../src/test/image-bytes.ts'

const OUTPUT_DIR = new URL('../tests/fixtures/images/', import.meta.url)

type Drawing = 'quadrants' | 'halves' | 'scene'

interface Recipe {
  width: number
  height: number
  type: string
  quality?: number
  drawing: Drawing
}

/** Desenha no canvas do navegador e devolve os bytes codificados. */
async function render(page: Page, recipe: Recipe): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await page.evaluate(async ({ width, height, type, quality, drawing }) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponível')
    const fill = (color: string, x: number, y: number, w: number, h: number) => {
      context.fillStyle = color
      context.fillRect(x, y, w, h)
    }
    if (drawing === 'quadrants') {
      // Vermelho, verde e azul; o quadrante inferior direito fica transparente.
      fill('#ff0000', 0, 0, width / 2, height / 2)
      fill('#00ff00', width / 2, 0, width / 2, height / 2)
      fill('#0000ff', 0, height / 2, width / 2, height / 2)
    } else if (drawing === 'halves') {
      fill('#ff0000', 0, 0, width / 2, height)
      fill('#0000ff', width / 2, 0, width / 2, height)
    } else {
      fill('#2a3a52', 0, 0, width, height)
      fill('#d7b072', width * 0.7, height * 0.15, width * 0.12, width * 0.12)
      fill('#3e5470', 0, height * 0.6, width, height * 0.4)
    }
    const blob = await canvas.convertToBlob({ type, quality })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }, recipe)
  return Uint8Array.from(bytes)
}

// GIF 1×1 transparente clássico (43 bytes): só a assinatura importa, para testar a recusa.
const GIF_1X1 = [
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const halves = await render(page, { width: 64, height: 32, type: 'image/jpeg', quality: 0.95, drawing: 'halves' })

  const fixtures: Record<string, Uint8Array> = {
    'quadrantes.png': await render(page, { width: 64, height: 64, type: 'image/png', drawing: 'quadrants' }),
    'foto.jpg': await render(page, { width: 64, height: 48, type: 'image/jpeg', quality: 0.9, drawing: 'scene' }),
    // Gravada deitada (64 × 32) com orientação EXIF 6: aparece em pé (32 × 64), metade vermelha em cima.
    'foto-girada.jpg': withExifOrientation(halves, 6),
    'transparente.webp': await render(page, { width: 48, height: 48, type: 'image/webp', quality: 0.9, drawing: 'quadrants' }),
    'texto.png': concat('Isto é um texto com extensão de imagem, não uma imagem.\n'),
    'vazio.png': new Uint8Array(),
    'animacao.gif': Uint8Array.from(GIF_1X1),
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  for (const [name, bytes] of Object.entries(fixtures)) {
    await writeFile(new URL(name, OUTPUT_DIR), bytes)
    console.log(`tests/fixtures/images/${name} (${bytes.length} bytes)`)
  }
} finally {
  await browser.close()
}

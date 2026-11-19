/** Auxiliares compartilhados pelos testes das ferramentas de imagem (abrir, enviar, baixar, conferir). */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { readImageHeader } from '../../src/core/image/header'
import { detectImageType } from '../../src/core/image/signature'
import { WCAG_TAGS } from './routes.ts'

export const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/images/${name}`, import.meta.url))

export const hasOffscreenCanvas = (page: Page) => page.evaluate(() => typeof OffscreenCanvas !== 'undefined')

const UNSUPPORTED_ENGINE =
  'Este motor não tem OffscreenCanvas (ex.: WebKit do Playwright no Windows). O Safari real tem e precisa ser testado em macOS ou iOS.'

/** Abre a ferramenta; em motores sem os recursos necessários, o teste se pula com o motivo. */
export async function openImageTool(page: Page, path: string, heading: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  test.skip(!(await hasOffscreenCanvas(page)), UNSUPPORTED_ENGINE)
}

export const fileInput = (page: Page) => page.locator('input[type="file"]').first()

/** Só o botão visível: as ações existem no painel (desktop) e na barra fixa (celular). */
export const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

export async function download(page: Page, trigger: Locator) {
  const [file] = await Promise.all([page.waitForEvent('download'), trigger.click()])
  return { name: file.suggestedFilename(), bytes: new Uint8Array(await readFile(await file.path())) }
}

/** Decodifica o arquivo baixado no próprio navegador e lê a cor (RGBA) de um pixel. */
export async function pixelAt(page: Page, bytes: Uint8Array, x: number, y: number): Promise<number[]> {
  return page.evaluate(
    async ({ data, x, y }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]))
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.drawImage(bitmap, 0, 0)
      return Array.from(context.getImageData(x, y, 1, 1).data)
    },
    { data: Array.from(bytes), x, y },
  )
}

export function expectColor(actual: number[], expected: [number, number, number]) {
  expected.forEach((channel, index) => expect(Math.abs((actual[index] ?? -1) - channel)).toBeLessThanOrEqual(16))
}

/** PNG de listras verticais de 1 px, pretas e brancas, gerado no navegador. Reduzido, deve virar cinza uniforme. */
export async function stripesPng(page: Page, width: number, height: number): Promise<Buffer> {
  const bytes = await page.evaluate(
    async ({ width, height }) => {
      const canvas = new OffscreenCanvas(width, height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.fillStyle = '#000000'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#ffffff'
      for (let x = 1; x < width; x += 2) context.fillRect(x, 0, 1, height)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    },
    { width, height },
  )
  return Buffer.from(bytes)
}

/** Decodifica o arquivo no próprio navegador e lê o vermelho de cada pixel de uma linha. */
export async function redRowAt(page: Page, bytes: Uint8Array, y: number): Promise<number[]> {
  return page.evaluate(
    async ({ data, y }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]))
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas indisponível')
      context.drawImage(bitmap, 0, 0)
      const pixels = context.getImageData(0, y, bitmap.width, 1).data
      return Array.from({ length: bitmap.width }, (_, x) => pixels[x * 4] ?? -1)
    },
    { data: Array.from(bytes), y },
  )
}

/** Listras reduzidas sem moiré: a linha toda fica perto da média entre preto e branco. */
export function expectUniformGray(row: number[]) {
  expect(Math.min(...row)).toBeGreaterThanOrEqual(115)
  expect(Math.max(...row)).toBeLessThanOrEqual(140)
}

/** Confere o formato real (assinatura de bytes) e as dimensões do cabeçalho. */
export function expectImage(bytes: Uint8Array, format: 'jpeg' | 'png' | 'webp', width: number, height: number) {
  expect(detectImageType(bytes)).toEqual({ kind: 'supported', format })
  expect(readImageHeader(bytes, format, bytes.length)).toMatchObject({ status: 'ok', header: { width, height } })
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([])
}

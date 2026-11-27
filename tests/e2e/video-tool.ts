/** Auxiliares compartilhados pelos testes das ferramentas de vídeo (abrir, enviar, baixar, conferir). */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, type Locator, type Page } from '@playwright/test'
import { ALL_FORMATS, BufferSource, Input } from 'mediabunny'
import { detectVideoType } from '../../src/core/video/signature'
import type { VideoFormat } from '../../src/core/video/formats'

export const videoFixture = (name: string) => fileURLToPath(new URL(`../fixtures/videos/${name}`, import.meta.url))

/**
 * Abrir o vídeo inicia o Worker de vídeo (cerca de 500 KB) e consulta os codificadores do navegador: com
 * vários navegadores testando ao mesmo tempo, pode passar dos 5 s padrão.
 */
export const OPEN_TIMEOUT = 15_000

export const timeField = (page: Page, name: 'Início' | 'Fim') => page.getByRole('textbox', { name, exact: true })

/** O navegador decodifica vídeo (WebCodecs)? O WebKit do Playwright no Windows não: lá só dá para copiar. */
export const canDecodeVideo = (page: Page) => page.evaluate(() => typeof VideoDecoder !== 'undefined')

export const UNSUPPORTED_DECODING =
  'Este motor não tem decodificador de vídeo (ex.: WebKit do Playwright no Windows). O Safari real tem e precisa ser testado em macOS ou iOS.'

export interface VideoProbe {
  format: string
  duration: number
  width: number
  height: number
  videoCodec: string | null
  audioCodec: string | null
  firstTimestamp: number
  tags: Record<string, unknown>
}

/** Lê o arquivo baixado no Node, sem decodificar: formato, faixas, duração, medidas e metadados. */
export async function probeVideo(bytes: Uint8Array): Promise<VideoProbe> {
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS })
  try {
    const video = await input.getPrimaryVideoTrack()
    if (!video) throw new Error('sem faixa de vídeo')
    const audio = await input.getPrimaryAudioTrack()
    const rotation = await video.getRotation()
    const [width, height] = [await video.getSquarePixelWidth(), await video.getSquarePixelHeight()]
    const { raw, ...tags } = await input.getMetadataTags()
    return {
      format: (await input.getFormat()).name,
      duration: await input.computeDuration(),
      ...(rotation % 180 === 0 ? { width, height } : { width: height, height: width }),
      videoCodec: await video.getCodec(),
      audioCodec: audio ? await audio.getCodec() : null,
      firstTimestamp: await video.getFirstTimestamp(),
      tags: { ...tags, ...(raw && { raw }) },
    }
  } finally {
    input.dispose()
  }
}

/** Confere o formato real pela assinatura de bytes. */
export function expectVideoFormat(bytes: Uint8Array, format: VideoFormat) {
  expect(detectVideoType(bytes)).toEqual({ kind: 'supported', format })
}

export interface AudioProbe {
  format: string
  videoTracks: number
  audioTracks: number
  codec: string | null
  duration: number
  tags: Record<string, unknown>
}

/** Lê o arquivo de som baixado no Node, sem decodificar: formato, faixas, codec, duração e metadados. */
export async function probeAudio(bytes: Uint8Array): Promise<AudioProbe> {
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS })
  try {
    const audio = await input.getPrimaryAudioTrack()
    const { raw, ...tags } = await input.getMetadataTags()
    return {
      format: (await input.getFormat()).name,
      videoTracks: (await input.getVideoTracks()).length,
      audioTracks: (await input.getAudioTracks()).length,
      codec: audio ? await audio.getCodec() : null,
      duration: await input.computeDuration(),
      tags: { ...tags, ...(raw && { raw }) },
    }
  } finally {
    input.dispose()
  }
}

/** Assinatura do arquivo de som: M4A ("ftyp"), WEBM (EBML) ou MP3 (ID3 ou o sincronismo de quadro). */
export function audioSignature(bytes: Uint8Array): 'm4a' | 'webm' | 'mp3' | 'unknown' {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length))
  if (ascii(4, 4) === 'ftyp') return 'm4a'
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm'
  if (ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) return 'mp3'
  return 'unknown'
}

/** Junta as violações de CSP da página (inclusive as de Workers, que aparecem no console). */
export async function trackCspViolations(page: Page): Promise<string[]> {
  const violations: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (/Content[- ]Security[- ]Policy|Refused to/i.test(text)) violations.push(text)
  })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`Content-Security-Policy: ${event.violatedDirective} bloqueou ${event.blockedURI}`)
    })
  })
  return violations
}

export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'gray' | 'other'

/** Cor pelo canal dominante: codificar vídeo altera os valores, e cada navegador converte cores do seu jeito. */
export function classify([red = 0, green = 0, blue = 0]: readonly number[]): Color {
  const high = (value: number) => value > 150
  const low = (value: number) => value < 100
  if (high(red) && low(green) && low(blue)) return 'red'
  if (low(red) && high(green) && low(blue)) return 'green'
  if (low(red) && low(green) && high(blue)) return 'blue'
  if (high(red) && high(green) && low(blue)) return 'yellow'
  // Os três canais quase iguais: cinza (ex.: o filtro P&B), do preto ao branco.
  if (Math.max(red, green, blue) - Math.min(red, green, blue) < 30) return 'gray'
  return 'other'
}

/** Decodifica o vídeo baixado no próprio navegador (num player fora da página) e lê a cor de pontos de um quadro. */
export async function frameColors(page: Page, bytes: Uint8Array, time: number, points: ReadonlyArray<readonly [number, number]>) {
  const pixels = await page.evaluate(
    async ({ data, time, points }) => {
      const url = URL.createObjectURL(new Blob([new Uint8Array(data)]))
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      try {
        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve
          video.onerror = () => reject(new Error('o navegador não abriu o vídeo'))
          video.src = url
        })
        await new Promise((resolve) => {
          video.onseeked = resolve
          video.currentTime = time
        })
        const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('canvas indisponível')
        context.drawImage(video, 0, 0)
        return points.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data))
      } finally {
        video.removeAttribute('src')
        video.load()
        URL.revokeObjectURL(url)
      }
    },
    { data: Array.from(bytes), time, points },
  )
  return pixels.map(classify)
}

/** Tempo atual do player da página. */
export const playerTime = (page: Page) => page.locator('video').first().evaluate((video: HTMLVideoElement) => video.currentTime)

/** Leva o player da página a um tempo e espera o quadro chegar. */
export async function seekPlayer(page: Page, time: number) {
  await page
    .locator('video')
    .first()
    .evaluate(
      (video: HTMLVideoElement, target) =>
        new Promise<void>((resolve) => {
          video.addEventListener('seeked', () => resolve(), { once: true })
          video.currentTime = target
        }),
      time,
    )
}

/** Espera o player da página ter os dados do vídeo (metadados carregados). */
export async function waitForPlayer(page: Page) {
  await expect.poll(() => page.locator('video').first().evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1)
}

/** Solta vídeos de teste na página de uma vez, como quem arrasta vários arquivos. */
export async function dropFiles(page: Page, names: readonly string[]) {
  const files = await Promise.all(names.map(async (name) => ({ name, data: Array.from(await readFile(videoFixture(name))) })))
  await page.evaluate((list) => {
    const transfer = new DataTransfer()
    for (const { name, data } of list) transfer.items.add(new File([new Uint8Array(data)], name))
    document.body.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  }, files)
}

/** Quanto a página passa da largura da tela (0 = sem rolagem lateral). */
export const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/** Alvos de toque visíveis com menos de 44 px de altura (links dentro de texto não contam). */
export const smallTouchTargets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a, button, input, [role="radio"]')]
      .filter((element) => !element.closest('p') && element.getClientRects().length > 0)
      .map((element) => ({ text: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '', height: element.getBoundingClientRect().height }))
      .filter(({ height }) => height > 1 && height < 44),
  )

/** Avança com Tab até o elemento (o Firefox às vezes começa fora da página, por isso o limite generoso). */
export async function tabTo(page: Page, target: Locator) {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('O elemento não foi alcançado com Tab')
}

/** Pedidos que saem para fora do site ou que não são GET: devem ser nenhum (o vídeo não sai do aparelho). */
export function trackOutgoingRequests(page: Page, baseURL: string | undefined): string[] {
  const requests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (url.startsWith('blob:') || url.startsWith('data:')) return
    if (!url.startsWith(baseURL ?? '') || request.method() !== 'GET') requests.push(`${request.method()} ${url}`)
  })
  return requests
}

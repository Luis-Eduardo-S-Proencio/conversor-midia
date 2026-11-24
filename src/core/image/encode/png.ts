/**
 * PNG próprio, sem perdas e bem mais leve que o dos navegadores, que gravam sempre RGBA (com canal de
 * transparência mesmo numa imagem opaca) e comprimem pouco. Aqui o tipo de cor vem do conteúdo: paleta
 * quando há até 256 cores (logotipos, prints, ícones), RGB quando a imagem é opaca e RGBA nos demais casos;
 * e cada linha recebe o filtro que mais ajuda a compressão. Medido: um print de tela caiu de 183 KB para
 * 7 KB, e uma foto em PNG, de 3,6 MB para 2,6 MB.
 *
 * A compressão (deflate no formato zlib) fica com quem chama: no Worker, o `CompressionStream` do navegador.
 * Aqui saem o cabeçalho, as linhas filtradas (em faixas, sem a imagem inteira na memória) e os blocos.
 */
import { bands, type EncodeOptions, type PixelSource } from './pixels'

export type PngColorType = 'palette' | 'rgb' | 'rgba'

export interface PngPlan {
  colorType: PngColorType
  /** Algum pixel não é totalmente opaco. */
  transparent: boolean
  /** Cores da paleta (RGBA em um número), na ordem dos índices; vazia fora do tipo paleta. */
  palette: number[]
  /** Índice de cada cor na paleta. */
  indexOf: Map<number, number>
}

export interface PngOptions extends EncodeOptions {
  /** Sempre RGBA, como pede o Windows para o PNG dentro de um ICO. */
  forceRgba?: boolean
}

const MAX_PALETTE = 256

const COLOR_TYPE_CODE: Record<PngColorType, number> = { palette: 3, rgb: 2, rgba: 6 }
const CHANNELS: Record<PngColorType, number> = { palette: 1, rgb: 3, rgba: 4 }

const rgbaKey = (rgba: ArrayLike<number>, at: number) =>
  (((rgba[at] ?? 0) << 24) | ((rgba[at + 1] ?? 0) << 16) | ((rgba[at + 2] ?? 0) << 8) | (rgba[at + 3] ?? 0)) >>> 0

/** Primeira passada: quantas cores há (até 257) e se há transparência. */
export function planPng(source: PixelSource, { bandPixels, forceRgba = false }: PngOptions = {}): PngPlan {
  const indexOf = new Map<number, number>()
  let fitsPalette = !forceRgba
  let transparent = false
  for (const { rgba } of bands(source, bandPixels)) {
    for (let at = 0; at < rgba.length; at += 4) {
      if (rgba[at + 3] !== 255) transparent = true
      if (!fitsPalette) continue
      const key = rgbaKey(rgba, at)
      if (indexOf.has(key)) continue
      if (indexOf.size === MAX_PALETTE) {
        fitsPalette = false
        indexOf.clear()
      } else {
        indexOf.set(key, indexOf.size)
      }
    }
    if (!fitsPalette && transparent) break // já se sabe que será RGBA
  }
  if (fitsPalette) return { colorType: 'palette', transparent, palette: [...indexOf.keys()], indexOf }
  return { colorType: transparent || forceRgba ? 'rgba' : 'rgb', transparent, palette: [], indexOf }
}

/* Blocos do PNG: tamanho, tipo, dados e CRC-32 do tipo com os dados. */

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let crc = n
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})

export function crc32(bytes: Uint8Array, crc = 0xffffffff): number {
  let value = crc
  for (const byte of bytes) value = (CRC_TABLE[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8)
  return value
}

export function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  for (let index = 0; index < 4; index += 1) chunk[4 + index] = type.charCodeAt(index)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, (crc32(chunk.subarray(4, 8 + data.length)) ^ 0xffffffff) >>> 0)
  return chunk
}

export const PNG_END = pngChunk('IEND', new Uint8Array(0))

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Assinatura, IHDR e, no tipo paleta, PLTE e tRNS (transparência de cada cor, até a última não opaca). */
export function pngHeader(width: number, height: number, plan: PngPlan): Uint8Array<ArrayBuffer> {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = COLOR_TYPE_CODE[plan.colorType]
  const parts = [new Uint8Array(SIGNATURE), pngChunk('IHDR', ihdr)]
  if (plan.colorType === 'palette') {
    const colors = new Uint8Array(plan.palette.length * 3)
    const alphas = new Uint8Array(plan.palette.length)
    plan.palette.forEach((key, index) => {
      colors.set([key >>> 24, (key >>> 16) & 0xff, (key >>> 8) & 0xff], index * 3)
      alphas[index] = key & 0xff
    })
    parts.push(pngChunk('PLTE', colors))
    let lastTransparent = -1
    alphas.forEach((alpha, index) => {
      if (alpha !== 255) lastTransparent = index
    })
    if (lastTransparent >= 0) parts.push(pngChunk('tRNS', alphas.subarray(0, lastTransparent + 1)))
  }
  const header = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    header.set(part, offset)
    offset += part.length
  }
  return header
}

const paeth = (left: number, up: number, upLeft: number) => {
  const estimate = left + up - upLeft
  const toLeft = Math.abs(estimate - left)
  const toUp = Math.abs(estimate - up)
  const toUpLeft = Math.abs(estimate - upLeft)
  return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft
}

/**
 * Filtra a linha com os cinco filtros do PNG e escreve em `out` (a partir de `at`) o tipo e a linha do que
 * deixa os valores mais perto de zero, a heurística que costuma comprimir melhor.
 */
function writeFiltered(row: Uint8Array, previous: Uint8Array, channels: number, trials: Uint8Array[], out: Uint8Array, at: number) {
  let best = 0
  let bestScore = Infinity
  for (let type = 0; type < 5; type += 1) {
    const trial = trials[type] as Uint8Array
    let score = 0
    for (let index = 0; index < row.length; index += 1) {
      const left = index >= channels ? (row[index - channels] ?? 0) : 0
      const up = previous[index] ?? 0
      const upLeft = index >= channels ? (previous[index - channels] ?? 0) : 0
      const predicted = type === 0 ? 0 : type === 1 ? left : type === 2 ? up : type === 3 ? (left + up) >> 1 : paeth(left, up, upLeft)
      const value = ((row[index] ?? 0) - predicted) & 0xff
      trial[index] = value
      score += value < 128 ? value : 256 - value
      if (score >= bestScore) break // já perdeu para um filtro anterior
    }
    if (score < bestScore) {
      bestScore = score
      best = type
    }
  }
  out[at] = best
  out.set(trials[best] as Uint8Array, at + 1)
}

/**
 * Segunda passada: as linhas já filtradas, faixa por faixa, prontas para o deflate. Na paleta, sem filtro
 * (o recomendado para índices); em RGB e RGBA, o melhor filtro de cada linha.
 */
export function* pngScanlines(source: PixelSource, plan: PngPlan, { bandPixels }: EncodeOptions = {}): Generator<Uint8Array<ArrayBuffer>> {
  const { width } = source
  const channels = CHANNELS[plan.colorType]
  const stride = width * channels
  const trials = Array.from({ length: 5 }, () => new Uint8Array(stride))
  let row = new Uint8Array(stride)
  let previous = new Uint8Array(stride)
  for (const band of bands(source, bandPixels)) {
    const out = new Uint8Array(band.rows * (stride + 1))
    for (let line = 0; line < band.rows; line += 1) {
      const from = line * width * 4
      const at = line * (stride + 1)
      if (plan.colorType === 'palette') {
        for (let x = 0; x < width; x += 1) out[at + 1 + x] = plan.indexOf.get(rgbaKey(band.rgba, from + x * 4)) ?? 0
        continue
      }
      for (let x = 0; x < width; x += 1) {
        for (let channel = 0; channel < channels; channel += 1) row[x * channels + channel] = band.rgba[from + x * 4 + channel] ?? 0
      }
      writeFiltered(row, previous, channels, trials, out, at)
      ;[row, previous] = [previous, row]
    }
    yield out
  }
}

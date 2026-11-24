import { unzlibSync, zlibSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { PixelSource } from './pixels'
import { PNG_END, planPng, pngChunk, pngHeader, pngScanlines, type PngOptions } from './png'

/** Imagem de teste: RGBA gerado por uma função de (x, y). */
function image(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]): PixelSource & { rgba: Uint8ClampedArray<ArrayBuffer> } {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) rgba.set(pixel(x, y), (y * width + x) * 4)
  return { width, height, rgba, readRows: (y, rows) => rgba.slice(y * width * 4, (y + rows) * width * 4) }
}

/** Monta o PNG como o Worker, com o zlib do fflate no lugar do CompressionStream. */
function encode(source: PixelSource, options: PngOptions = {}) {
  const plan = planPng(source, options)
  const scanlines = [...pngScanlines(source, plan, options)]
  const raw = new Uint8Array(scanlines.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of scanlines) {
    raw.set(part, offset)
    offset += part.length
  }
  const parts = [pngHeader(source.width, source.height, plan), pngChunk('IDAT', zlibSync(raw)), PNG_END]
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return { plan, bytes }
}

/** Leitor independente: blocos, desfiltragem e pixels em RGBA. */
function decode(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks: Record<string, Uint8Array[]> = {}
  for (let at = 8; at < bytes.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    ;(chunks[type] ??= []).push(bytes.subarray(at + 8, at + 8 + length))
    at += 12 + length
  }
  const ihdr = chunks.IHDR?.[0] as Uint8Array
  const header = new DataView(ihdr.buffer, ihdr.byteOffset)
  const width = header.getUint32(0)
  const height = header.getUint32(4)
  const colorType = ihdr[9] as number
  const channels = colorType === 3 ? 1 : colorType === 2 ? 3 : 4
  const raw = unzlibSync(Uint8Array.from((chunks.IDAT ?? []).flatMap((chunk) => [...chunk])))
  const stride = width * channels
  const lines: Uint8Array[] = []
  for (let y = 0; y < height; y += 1) {
    const type = raw[y * (stride + 1)]
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const previous = lines[y - 1] ?? new Uint8Array(stride)
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? (line[index - channels] ?? 0) : 0
      const up = previous[index] ?? 0
      const upLeft = index >= channels ? (previous[index - channels] ?? 0) : 0
      const p = left + up - upLeft
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft) ? left : Math.abs(p - up) <= Math.abs(p - upLeft) ? up : upLeft
      const predicted = [0, left, up, (left + up) >> 1, paeth][type ?? 0] ?? 0
      line[index] = ((line[index] ?? 0) + predicted) & 0xff
    }
    lines.push(line)
  }
  const palette = chunks.PLTE?.[0]
  const alphas = chunks.tRNS?.[0]
  const rgba = new Uint8ClampedArray(width * height * 4)
  lines.forEach((line, y) => {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4
      if (colorType === 3) {
        const index = line[x] ?? 0
        rgba.set([palette?.[index * 3] ?? 0, palette?.[index * 3 + 1] ?? 0, palette?.[index * 3 + 2] ?? 0, alphas?.[index] ?? 255], at)
      } else {
        rgba.set([line[x * channels] ?? 0, line[x * channels + 1] ?? 0, line[x * channels + 2] ?? 0, channels === 4 ? (line[x * 4 + 3] ?? 0) : 255], at)
      }
    }
  })
  return { width, height, colorType, chunks, rgba }
}

const noise = (x: number, y: number) => (x * 7919 + y * 104729 + x * y * 31) % 256

describe('PNG próprio', () => {
  it('até 256 cores (logotipo, print): paleta, com as cores exatas', () => {
    // Vermelho, azul e um degradê de 27 tons: 29 cores.
    const logo = image(37, 23, (x, y) => (x < 10 ? [255, 0, 0, 255] : y < 12 ? [0, 120, 255, 255] : [x * 6, 255, 40, 255]))
    const { plan, bytes } = encode(logo, { bandPixels: 100 })
    expect(plan.colorType).toBe('palette')
    const decoded = decode(bytes)
    expect(decoded).toMatchObject({ width: 37, height: 23, colorType: 3 })
    expect(decoded.chunks.tRNS).toBeUndefined() // tudo opaco: sem transparência na paleta
    expect(decoded.rgba).toEqual(logo.rgba)
  })

  it('paleta com transparência: tRNS até a última cor não opaca', () => {
    const icon = image(16, 16, (x, y) => (x + y < 10 ? [0, 0, 0, 0] : x > 12 ? [10, 20, 30, 128] : [255, 255, 255, 255]))
    const { bytes } = encode(icon)
    const decoded = decode(bytes)
    expect(decoded.colorType).toBe(3)
    expect(decoded.chunks.tRNS?.[0]?.length).toBeGreaterThan(0)
    expect(decoded.rgba).toEqual(icon.rgba)
  })

  it('foto opaca, com muitas cores: RGB, sem o canal de transparência que o navegador grava à toa', () => {
    const photo = image(41, 29, (x, y) => [noise(x, y), noise(y, x), (x * y) % 256, 255])
    const { plan, bytes } = encode(photo, { bandPixels: 41 * 3 }) // faixas de 3 linhas
    expect(plan.colorType).toBe('rgb')
    expect(decode(bytes).rgba).toEqual(photo.rgba)
  })

  it('muitas cores com transparência: RGBA', () => {
    const faded = image(30, 30, (x, y) => [noise(x, y), noise(y, x), 90, (x * 9) % 256])
    const { plan, bytes } = encode(faded, { bandPixels: 64 })
    expect(plan.colorType).toBe('rgba')
    expect(decode(bytes).rgba).toEqual(faded.rgba)
  })

  it('RGBA quando pedido (PNG dentro do ICO), mesmo com poucas cores', () => {
    const flat = image(8, 8, () => [1, 2, 3, 255])
    const { plan, bytes } = encode(flat, { forceRgba: true })
    expect(plan.colorType).toBe('rgba')
    expect(decode(bytes)).toMatchObject({ colorType: 6, rgba: flat.rgba })
  })

  it('exatamente 256 cores ainda cabem na paleta; 257, não', () => {
    expect(planPng(image(256, 1, (x) => [x, 0, 0, 255])).colorType).toBe('palette')
    expect(planPng(image(257, 1, (x) => [x % 256, x >= 256 ? 1 : 0, 0, 255])).colorType).toBe('rgb')
  })

  it('imagem de 1 pixel', () => {
    const dot = image(1, 1, () => [9, 8, 7, 255])
    expect(decode(encode(dot).bytes).rgba).toEqual(dot.rgba)
  })

  it('bloco com o CRC-32 certo (o do IEND é conhecido)', () => {
    expect([...PNG_END]).toEqual([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
  })
})

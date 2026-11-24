import { describe, expect, it } from 'vitest'
import {
  concat,
  exifSegment,
  jpegBytes,
  jpegSegment,
  pngBytes,
  pngChunk,
  webpExtended,
  webpLossless,
  webpLossy,
} from '../../test/image-bytes'
import { readImageHeader } from './header'

const ok = (width: number, height: number, hasAlpha = false, animated = false) => ({
  status: 'ok',
  header: { width, height, hasAlpha, animated },
})

describe('readImageHeader: PNG', () => {
  it('lê largura e altura do IHDR', () => {
    const bytes = pngBytes({ width: 3024, height: 4032, colorType: 2 })
    expect(readImageHeader(bytes, 'png', bytes.length)).toEqual(ok(3024, 4032))
  })

  it('detecta transparência pelo tipo de cor (RGBA e cinza com alfa)', () => {
    for (const colorType of [4, 6]) {
      const bytes = pngBytes({ width: 10, height: 10, colorType })
      expect(readImageHeader(bytes, 'png', bytes.length)).toEqual(ok(10, 10, true))
    }
  })

  it('detecta transparência por chunk tRNS antes dos dados', () => {
    const bytes = pngBytes({ width: 10, height: 10, colorType: 3, chunks: [pngChunk('PLTE', [0, 0, 0]), pngChunk('tRNS', [0])] })
    expect(readImageHeader(bytes, 'png', bytes.length)).toEqual(ok(10, 10, true))
  })

  it('detecta animação (APNG) pelo chunk acTL', () => {
    const bytes = pngBytes({ width: 10, height: 10, colorType: 2, chunks: [pngChunk('acTL', new Uint8Array(8))] })
    expect(readImageHeader(bytes, 'png', bytes.length)).toEqual(ok(10, 10, false, true))
  })

  it('pede mais bytes quando os chunks antes dos dados não couberam', () => {
    const bytes = pngBytes({ width: 10, height: 10, colorType: 2, chunks: [pngChunk('iTXt', new Uint8Array(500))] })
    const result = readImageHeader(bytes.subarray(0, 40), 'png', bytes.length)
    expect(result).toEqual({ status: 'need-more', bytes: expect.any(Number) })
    if (result.status === 'need-more') expect(result.bytes).toBeGreaterThan(40)
  })

  it('rejeita arquivo truncado, dimensão zero e tipo de cor inexistente', () => {
    const truncated = pngBytes({ width: 10, height: 10 }).subarray(0, 20)
    expect(readImageHeader(truncated, 'png', truncated.length)).toEqual({ status: 'invalid' })
    const zero = pngBytes({ width: 0, height: 10 })
    expect(readImageHeader(zero, 'png', zero.length)).toEqual({ status: 'invalid' })
    const badColor = pngBytes({ width: 10, height: 10, colorType: 5 })
    expect(readImageHeader(badColor, 'png', badColor.length)).toEqual({ status: 'invalid' })
  })
})

describe('readImageHeader: JPEG', () => {
  it('lê dimensões do SOF baseline e progressivo', () => {
    for (const sof of [0xc0, 0xc2]) {
      const bytes = jpegBytes({ width: 4000, height: 3000, sof })
      expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual(ok(4000, 3000))
    }
  })

  it('pula segmentos anteriores ao SOF', () => {
    const bytes = jpegBytes({
      width: 800,
      height: 600,
      segments: [jpegSegment(0xe0, concat('JFIF\0', new Uint8Array(9))), jpegSegment(0xfe, new Uint8Array(2000))],
    })
    expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual(ok(800, 600))
  })

  it('estima a qualidade pela tabela de quantização do brilho (DQT), quando ela vem antes do SOF', () => {
    // Tabela toda em 8: soma 512, cerca de 14% da padrão (qualidade 50), o que dá qualidade 93.
    const bytes = jpegBytes({ width: 800, height: 600, segments: [jpegSegment(0xdb, [0, ...new Array<number>(64).fill(8)])] })
    expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual({ status: 'ok', header: { ...ok(800, 600).header, jpegQuality: 93 } })
    // DQT maior que o trecho lido: pede o resto.
    const result = readImageHeader(bytes.subarray(0, 10), 'jpeg', bytes.length)
    expect(result).toEqual({ status: 'need-more', bytes: expect.any(Number) })
  })

  it('aplica a orientação EXIF: de 5 a 8 trocam largura e altura', () => {
    for (const [orientation, expected] of [
      [1, ok(4000, 3000)],
      [3, ok(4000, 3000)],
      [6, ok(3000, 4000)],
      [8, ok(3000, 4000)],
    ] as const) {
      for (const byteOrder of ['MM', 'II'] as const) {
        const bytes = jpegBytes({ width: 4000, height: 3000, segments: [exifSegment(orientation, byteOrder)] })
        expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual(expected)
      }
    }
  })

  it('ignora EXIF malformado em vez de recusar a imagem', () => {
    const brokenExif = jpegSegment(0xe1, concat('Exif\0\0', 'MM', [0, 42, 0xff, 0xff, 0xff, 0xff]))
    const bytes = jpegBytes({ width: 640, height: 480, segments: [brokenExif] })
    expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual(ok(640, 480))
  })

  it('pede mais bytes quando o SOF está além do que foi lido', () => {
    const bytes = jpegBytes({ width: 640, height: 480, segments: [jpegSegment(0xfe, new Uint8Array(60_000))] })
    const result = readImageHeader(bytes.subarray(0, 1024), 'jpeg', bytes.length)
    expect(result.status).toBe('need-more')
    if (result.status === 'need-more') expect(result.bytes).toBeGreaterThan(60_000)
  })

  it('rejeita dados de imagem antes do SOF e bytes que não são marcador', () => {
    const scanFirst = concat([0xff, 0xd8], jpegSegment(0xda, [1, 1, 0, 0, 0x3f, 0]))
    expect(readImageHeader(scanFirst, 'jpeg', scanFirst.length)).toEqual({ status: 'invalid' })
    const garbage = concat([0xff, 0xd8], [0x12, 0x34, 0x56, 0x78])
    expect(readImageHeader(garbage, 'jpeg', garbage.length)).toEqual({ status: 'invalid' })
  })

  it('rejeita arquivo que termina antes do SOF', () => {
    const bytes = jpegBytes({ width: 640, height: 480, segments: [jpegSegment(0xfe, new Uint8Array(100))] }).subarray(0, 60)
    expect(readImageHeader(bytes, 'jpeg', bytes.length)).toEqual({ status: 'invalid' })
  })
})

describe('readImageHeader: WEBP', () => {
  it('VP8 (com perdas): dimensões, sem transparência', () => {
    const bytes = webpLossy(1920, 1080)
    expect(readImageHeader(bytes, 'webp', bytes.length)).toEqual(ok(1920, 1080))
  })

  it('VP8L (sem perdas): dimensões e bit de transparência', () => {
    const opaque = webpLossless(1000, 700)
    expect(readImageHeader(opaque, 'webp', opaque.length)).toEqual(ok(1000, 700))
    const transparent = webpLossless(16383, 1, true)
    expect(readImageHeader(transparent, 'webp', transparent.length)).toEqual(ok(16383, 1, true))
  })

  it('VP8X: dimensões do canvas, transparência e animação', () => {
    const bytes = webpExtended(5000, 4000, { alpha: true, animation: true })
    expect(readImageHeader(bytes, 'webp', bytes.length)).toEqual(ok(5000, 4000, true, true))
  })

  it('rejeita chunk desconhecido e código de início VP8 inválido', () => {
    const unknown = concat(webpLossy(10, 10).subarray(0, 12), 'ABCD', new Uint8Array(20))
    expect(readImageHeader(unknown, 'webp', unknown.length)).toEqual({ status: 'invalid' })
    const badStart = webpLossy(10, 10)
    badStart[23] = 0
    expect(readImageHeader(badStart, 'webp', badStart.length)).toEqual({ status: 'invalid' })
  })

  it('pede mais bytes com cabeçalho incompleto e recusa se o arquivo acabou', () => {
    const bytes = webpLossy(10, 10)
    expect(readImageHeader(bytes.subarray(0, 16), 'webp', bytes.length)).toEqual({ status: 'need-more', bytes: 30 })
    expect(readImageHeader(bytes.subarray(0, 16), 'webp', 16)).toEqual({ status: 'invalid' })
  })
})

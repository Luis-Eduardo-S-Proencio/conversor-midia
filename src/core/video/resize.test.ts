import { describe, expect, it } from 'vitest'
import { defaultResolution, resizedSize, resizedVideoBitrate, resolutionChoices, resolutionSuffix } from './resize'

describe('resolutionChoices', () => {
  it('só as resoluções menores que a do vídeo ficam disponíveis (pelo lado menor)', () => {
    expect(resolutionChoices({ width: 1920, height: 1080 })).toEqual([
      { resolution: 1080, available: false },
      { resolution: 720, available: true },
      { resolution: 480, available: true },
      { resolution: 360, available: true },
    ])
    // Em pé: o lado menor é a largura.
    expect(resolutionChoices({ width: 1080, height: 1920 }).filter((choice) => choice.available).map((choice) => choice.resolution)).toEqual([
      720, 480, 360,
    ])
    expect(resolutionChoices({ width: 3840, height: 2160 }).every((choice) => choice.available)).toBe(true)
  })

  it('vídeo de 360p ou menor: nenhuma disponível', () => {
    expect(resolutionChoices({ width: 640, height: 360 }).some((choice) => choice.available)).toBe(false)
    expect(resolutionChoices({ width: 320, height: 240 }).some((choice) => choice.available)).toBe(false)
  })
})

describe('defaultResolution', () => {
  it('a maior disponível', () => {
    expect(defaultResolution(resolutionChoices({ width: 3840, height: 2160 }))).toBe(1080)
    expect(defaultResolution(resolutionChoices({ width: 1920, height: 1080 }))).toBe(720)
    expect(defaultResolution(resolutionChoices({ width: 640, height: 480 }))).toBe(360)
    expect(defaultResolution(resolutionChoices({ width: 320, height: 240 }))).toBeUndefined()
  })
})

describe('resizedSize', () => {
  it('o lado menor vira a resolução, com a proporção mantida, deitado ou em pé', () => {
    expect(resizedSize({ width: 1920, height: 1080 }, 720)).toEqual({ width: 1280, height: 720 })
    expect(resizedSize({ width: 1080, height: 1920 }, 720)).toEqual({ width: 720, height: 1280 })
    expect(resizedSize({ width: 3840, height: 2160 }, 1080)).toEqual({ width: 1920, height: 1080 })
    expect(resizedSize({ width: 1080, height: 1080 }, 480)).toEqual({ width: 480, height: 480 })
  })

  it('lados pares (H.264), mesmo quando a conta dá ímpar', () => {
    expect(resizedSize({ width: 976, height: 736 }, 720)).toEqual({ width: 954, height: 720 })
    expect(resizedSize({ width: 976, height: 736 }, 480)).toEqual({ width: 636, height: 480 })
    expect(resizedSize({ width: 640, height: 480 }, 360)).toEqual({ width: 480, height: 360 })
  })
})

describe('resizedVideoBitrate', () => {
  const tenSeconds = { duration: 10, audioBitrate: 128_000 }

  it('qualidade alta para a resolução nova quando o original tem taxa de sobra', () => {
    // 1080p a 20 Mbit/s (câmera) para 720p: fica a taxa de qualidade alta do 720p, bem abaixo do limite.
    const bitrate = resizedVideoBitrate({ ...tenSeconds, original: { width: 1920, height: 1080 }, originalBytes: 25_160_000 }, { width: 1280, height: 720 }, 'mp4')
    expect(bitrate).toBeCloseTo(2_780_000, -4)
  })

  it('nunca acima da taxa do original, proporcional à área: vídeo já comprimido não cresce', () => {
    // 720p a 1 Mbit/s de vídeo (WhatsApp) para 480p: no máximo 1 Mbit/s × (área 480p / área 720p).
    const originalBytes = ((1_000_000 + 128_000) * 10) / 8
    const bitrate = resizedVideoBitrate({ ...tenSeconds, original: { width: 1280, height: 720 }, originalBytes }, { width: 854, height: 480 }, 'mp4')
    expect(bitrate).toBe(445_000)
  })

  it('WEBM (VP9) usa menos taxa para a mesma qualidade, e há um mínimo', () => {
    const big = { ...tenSeconds, original: { width: 1920, height: 1080 }, originalBytes: 50_000_000 }
    expect(resizedVideoBitrate(big, { width: 1280, height: 720 }, 'webm')).toBeCloseTo(1_670_000, -4)
    const tiny = { duration: 10, audioBitrate: null, original: { width: 640, height: 480 }, originalBytes: 10_000 }
    expect(resizedVideoBitrate(tiny, { width: 480, height: 360 }, 'mp4')).toBe(100_000)
  })
})

describe('resolutionSuffix', () => {
  it('nome do arquivo: "praia.mp4" → "praia-720p.mp4"', () => {
    expect(resolutionSuffix(720)).toBe('-720p')
  })
})

import { describe, expect, it } from 'vitest'
import { compressedSize, compressedVideoBitrate, estimateCompressedBytes, keepsOriginal } from './compress'

describe('compressedSize', () => {
  it('Leve mantém a resolução; Média limita a 1080p; Forte a 720p, deitado ou em pé', () => {
    expect(compressedSize({ width: 3840, height: 2160 }, 'light')).toEqual({ width: 3840, height: 2160 })
    expect(compressedSize({ width: 3840, height: 2160 }, 'balanced')).toEqual({ width: 1920, height: 1080 })
    expect(compressedSize({ width: 1920, height: 1080 }, 'strong')).toEqual({ width: 1280, height: 720 })
    expect(compressedSize({ width: 1080, height: 1920 }, 'strong')).toEqual({ width: 720, height: 1280 })
  })

  it('nunca aumenta e sempre dá lados pares', () => {
    expect(compressedSize({ width: 576, height: 1024 }, 'strong')).toEqual({ width: 576, height: 1024 })
    expect(compressedSize({ width: 1081, height: 607 }, 'light')).toEqual({ width: 1082, height: 608 })
    expect(compressedSize({ width: 1366, height: 1366 }, 'strong')).toEqual({ width: 720, height: 720 })
  })
})

describe('compressedVideoBitrate', () => {
  it('1080p em H.264: cerca de 3,3, 1,8 e 0,5 Mbit/s nos três níveis (Forte já em 720p)', () => {
    expect(compressedVideoBitrate({ width: 1920, height: 1080 }, 'light', 'mp4')).toBe(3_300_000)
    expect(compressedVideoBitrate({ width: 1920, height: 1080 }, 'balanced', 'mp4')).toBe(1_800_000)
    expect(compressedVideoBitrate({ width: 1280, height: 720 }, 'strong', 'mp4')).toBeCloseTo(555_000, -4)
  })

  it('WEBM (VP9) usa menos taxa para a mesma qualidade, e há um mínimo', () => {
    expect(compressedVideoBitrate({ width: 1920, height: 1080 }, 'balanced', 'webm')).toBe(1_080_000)
    expect(compressedVideoBitrate({ width: 160, height: 120 }, 'strong', 'mp4')).toBe(100_000)
  })
})

describe('estimateCompressedBytes', () => {
  it('soma vídeo e som (copiado) pela duração, com a folga do arquivo', () => {
    // 10 s a 1,8 Mbit/s de vídeo e 128 kbit/s de som ≈ 2,46 MB.
    expect(estimateCompressedBytes({ duration: 10, originalBytes: 20_000_000, audioBitrate: 128_000 }, 1_800_000)).toEqual({
      bytes: 2_458_200,
      worthIt: true,
    })
  })

  it('sem ganho real (90% do original ou mais), avisa que não vale a pena', () => {
    expect(estimateCompressedBytes({ duration: 10, originalBytes: 2_500_000, audioBitrate: 128_000 }, 1_800_000).worthIt).toBe(false)
    expect(estimateCompressedBytes({ duration: 10, originalBytes: 2_500_000, audioBitrate: null }, 1_800_000).bytes).toBe(2_295_000)
  })

  it('resultado do mesmo tamanho ou maior: mantém o original', () => {
    expect(keepsOriginal(100, 100)).toBe(true)
    expect(keepsOriginal(99, 100)).toBe(false)
  })
})

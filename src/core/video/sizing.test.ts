import { describe, expect, it } from 'vitest'
import { cappedVideoBitrate } from './sizing'

/** 720p de 10 s com som de 128 kbit/s; `videoBitrate` é a taxa só do vídeo. */
const whatsapp = (videoBitrate: number, codec = 'avc') => ({
  original: { width: 1280, height: 720 },
  originalBytes: ((videoBitrate + 128_000) * 10) / 8,
  duration: 10,
  audioBitrate: 128_000,
  codec,
})

describe('cappedVideoBitrate', () => {
  it('vídeo já comprimido: nunca acima da taxa do original, mesmo sendo refeito inteiro (corte exato)', () => {
    // A qualidade alta do 720p seria cerca de 2,8 Mbit/s; o original só tem 1 Mbit/s.
    expect(cappedVideoBitrate(whatsapp(1_000_000), { width: 1280, height: 720 }, 'mp4')).toBe(1_000_000)
  })

  it('recorte: proporcional à área que fica', () => {
    expect(cappedVideoBitrate(whatsapp(1_000_000), { width: 640, height: 720 }, 'mp4')).toBe(500_000)
  })

  it('vídeo com taxa de sobra (câmera): fica a qualidade alta', () => {
    expect(cappedVideoBitrate(whatsapp(20_000_000), { width: 1280, height: 720 }, 'mp4')).toBeCloseTo(2_780_000, -4)
  })

  it('HEVC refeito em H.264 precisa de mais taxa para a mesma imagem; H.264 refeito em VP9, de menos', () => {
    expect(cappedVideoBitrate(whatsapp(1_000_000, 'hevc'), { width: 1280, height: 720 }, 'mp4')).toBe(1_667_000)
    expect(cappedVideoBitrate(whatsapp(1_000_000), { width: 1280, height: 720 }, 'webm')).toBe(600_000)
    expect(cappedVideoBitrate(whatsapp(1_000_000, 'vp9'), { width: 1280, height: 720 }, 'webm')).toBe(1_000_000)
  })

  it('sem duração conhecida: a qualidade alta, nunca uma taxa inválida', () => {
    const unknown = { ...whatsapp(1_000_000), originalBytes: 0, duration: 0 }
    expect(Number.isInteger(cappedVideoBitrate(unknown, { width: 1280, height: 720 }, 'mp4'))).toBe(true)
  })
})

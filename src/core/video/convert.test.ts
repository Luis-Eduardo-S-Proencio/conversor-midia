import { describe, expect, it } from 'vitest'
import {
  convertOutputName,
  convertPlan,
  convertTargets,
  convertedVideoBitrate,
  defaultTarget,
  defaultVideoMode,
  hasVideoModes,
  targetChoices,
  type ConvertSource,
} from './convert'

const everything = { video: true, audio: true }
const capable = { mp4: everything, mov: everything, webm: everything }

/** Vídeo comum de celular: H.264 com som AAC, num navegador que refaz tudo. */
const source = (overrides: Partial<ConvertSource> = {}): ConvertSource => ({
  format: 'mp4',
  codec: 'avc',
  audioCodec: 'aac',
  rotated: false,
  reencodable: capable,
  ...overrides,
})

/** Firefox: refaz o vídeo, mas não gera som em AAC. */
const noAac = { mp4: { video: true, audio: false }, mov: { video: true, audio: false }, webm: everything }

describe('convertTargets', () => {
  it('os dois formatos diferentes do original, na ordem MP4, MOV, WEBM', () => {
    expect(convertTargets('mp4')).toEqual(['mov', 'webm'])
    expect(convertTargets('mov')).toEqual(['mp4', 'webm'])
    expect(convertTargets('webm')).toEqual(['mp4', 'mov'])
  })
})

describe('convertPlan', () => {
  it('MP4 e MOV entre si, com H.264 e AAC: tudo copiado, sem refazer', () => {
    expect(convertPlan(source(), 'mov', 'compatible')).toEqual({ target: 'mov', video: 'copy', audio: 'copy', blocked: null })
    expect(convertPlan(source({ format: 'mov' }), 'mp4', 'compatible')).toEqual({ target: 'mp4', video: 'copy', audio: 'copy', blocked: null })
  })

  it('cópia não depende do navegador: funciona mesmo sem conseguir refazer nada', () => {
    const none = { video: false, audio: false }
    const plan = convertPlan(source({ reencodable: { mp4: none, mov: none, webm: none } }), 'mov', 'compatible')
    expect(plan.blocked).toBeNull()
  })

  it('para WEBM: H.264 vira VP9 e AAC vira Opus', () => {
    expect(convertPlan(source(), 'webm', 'compatible')).toEqual({ target: 'webm', video: 'encode', audio: 'encode', blocked: null })
  })

  it('de WEBM para MP4 ou MOV: VP9 vira H.264 e Opus vira AAC, para tocar em todo lugar', () => {
    const webm = source({ format: 'webm', codec: 'vp9', audioCodec: 'opus' })
    expect(convertPlan(webm, 'mp4', 'compatible')).toEqual({ target: 'mp4', video: 'encode', audio: 'encode', blocked: null })
    expect(convertPlan(webm, 'mov', 'compatible')).toMatchObject({ video: 'encode', audio: 'encode' })
  })

  it('o que o WEBM comporta é copiado: VP9, VP8 e AV1; Opus e Vorbis', () => {
    for (const codec of ['vp9', 'vp8', 'av1']) {
      expect(convertPlan(source({ codec, audioCodec: 'opus' }), 'webm', 'compatible')).toMatchObject({ video: 'copy', audio: 'copy' })
    }
    expect(convertPlan(source({ codec: 'vp9', audioCodec: 'vorbis' }), 'webm', 'compatible')).toMatchObject({ video: 'copy', audio: 'copy' })
  })

  it('vídeo gravado em pé para WEBM: é refeito, porque o WEBM não guarda a rotação', () => {
    expect(convertPlan(source({ codec: 'vp9', rotated: true }), 'webm', 'compatible').video).toBe('encode')
    // MP4 e MOV guardam: continua cópia.
    expect(convertPlan(source({ rotated: true }), 'mov', 'compatible').video).toBe('copy')
  })

  it('som que não é AAC (PCM de câmera, MP3, Opus) é refeito em AAC no MP4 e no MOV; a imagem continua copiada', () => {
    for (const audioCodec of ['pcm-s16', 'mp3', 'opus']) {
      expect(convertPlan(source({ format: 'mov', audioCodec }), 'mp4', 'compatible')).toMatchObject({ video: 'copy', audio: 'encode' })
    }
  })

  it('vídeo sem som: nada a fazer com o som', () => {
    expect(convertPlan(source({ audioCodec: null }), 'webm', 'compatible')).toEqual({ target: 'webm', video: 'encode', audio: null, blocked: null })
  })

  it('HEVC (iPhone) para MP4 ou MOV: "compatível" refaz em H.264; "rápido" copia o HEVC', () => {
    const iphone = source({ format: 'mov', codec: 'hevc' })
    expect(convertPlan(iphone, 'mp4', 'compatible')).toMatchObject({ video: 'encode', audio: 'copy', blocked: null })
    expect(convertPlan(iphone, 'mp4', 'fast')).toMatchObject({ video: 'copy', audio: 'copy', blocked: null })
    // Para WEBM não há escolha: o WEBM não comporta HEVC.
    expect(convertPlan(iphone, 'webm', 'fast')).toMatchObject({ video: 'encode', audio: 'encode' })
  })

  it('o modo não muda nada quando o vídeo não é HEVC', () => {
    expect(convertPlan(source({ format: 'webm', codec: 'vp9', audioCodec: 'opus' }), 'mp4', 'fast').video).toBe('encode')
    expect(convertPlan(source(), 'mov', 'fast').video).toBe('copy')
  })

  it('bloqueado quando é preciso refazer algo que o navegador não consegue: primeiro o vídeo, depois o som', () => {
    const firefox = source({ format: 'webm', codec: 'vp9', audioCodec: 'opus', reencodable: noAac })
    expect(convertPlan(firefox, 'mp4', 'compatible').blocked).toBe('audio')
    const noHevc = { ...capable, mp4: { video: false, audio: false } }
    expect(convertPlan(source({ format: 'mov', codec: 'hevc', audioCodec: 'pcm-s16', reencodable: noHevc }), 'mp4', 'compatible').blocked).toBe('video')
    // Sem som para refazer, o AAC que falta não importa.
    expect(convertPlan(source({ format: 'webm', codec: 'vp9', audioCodec: null, reencodable: noAac }), 'mp4', 'compatible').blocked).toBeNull()
  })
})

describe('hasVideoModes', () => {
  it('só HEVC para MP4 ou MOV oferece "compatível" ou "rápido"', () => {
    expect(hasVideoModes(source({ codec: 'hevc' }), 'mp4')).toBe(true)
    expect(hasVideoModes(source({ codec: 'hevc' }), 'mov')).toBe(true)
    expect(hasVideoModes(source({ codec: 'hevc' }), 'webm')).toBe(false)
    expect(hasVideoModes(source(), 'mov')).toBe(false)
    expect(hasVideoModes(source({ codec: 'vp9' }), 'mp4')).toBe(false)
  })
})

describe('defaultVideoMode', () => {
  it('"compatível" quando o navegador consegue refazer o HEVC; senão, "rápido"', () => {
    const iphone = source({ format: 'mov', codec: 'hevc' })
    expect(defaultVideoMode(iphone, 'mp4')).toBe('compatible')
    const noHevc = { ...capable, mp4: { video: false, audio: true } }
    expect(defaultVideoMode({ ...iphone, reencodable: noHevc }, 'mp4')).toBe('fast')
  })
})

describe('targetChoices e defaultTarget', () => {
  it('formato disponível quando algum modo funciona neste navegador', () => {
    expect(targetChoices(source())).toEqual([
      { target: 'mov', available: true },
      { target: 'webm', available: true },
    ])
    // Firefox com WEBM com som: MP4 e MOV pedem AAC.
    const firefox = source({ format: 'webm', codec: 'vp9', audioCodec: 'opus', reencodable: noAac })
    expect(targetChoices(firefox)).toEqual([
      { target: 'mp4', available: false },
      { target: 'mov', available: false },
    ])
    expect(defaultTarget(targetChoices(firefox))).toBeUndefined()
    // HEVC sem decodificador: o "rápido" (cópia) ainda leva para MP4.
    const none = { video: false, audio: false }
    const iphone = source({ format: 'mov', codec: 'hevc', reencodable: { mp4: none, mov: none, webm: none } })
    expect(targetChoices(iphone)).toEqual([
      { target: 'mp4', available: true },
      { target: 'webm', available: false },
    ])
  })

  it('o primeiro disponível, na ordem MP4, MOV, WEBM', () => {
    expect(defaultTarget(targetChoices(source({ format: 'mov' })))).toBe('mp4')
    expect(defaultTarget(targetChoices(source()))).toBe('mov')
    expect(defaultTarget([{ target: 'mp4', available: false }, { target: 'mov', available: true }])).toBe('mov')
  })
})

describe('convertedVideoBitrate', () => {
  const tenSeconds = { original: { width: 1920, height: 1080 }, duration: 10, audioBitrate: 128_000 }
  const bytesFor = (videoBitrate: number) => ((videoBitrate + 128_000) * 10) / 8

  it('qualidade alta quando o original tem taxa de sobra', () => {
    // 1080p a 20 Mbit/s (câmera) para H.264: a taxa de qualidade alta do 1080p (6 Mbit/s).
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'avc', originalBytes: bytesFor(20_000_000) }, 'mp4')).toBe(6_000_000)
    // Para VP9, que precisa de cerca de 60% da taxa.
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'avc', originalBytes: bytesFor(20_000_000) }, 'webm')).toBe(3_600_000)
  })

  it('nunca acima do que o original tem, contando a eficiência de cada codec: o arquivo não cresce à toa', () => {
    // H.264 a 2 Mbit/s para VP9: no máximo 2 × 0,6 = 1,2 Mbit/s.
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'avc', originalBytes: bytesFor(2_000_000) }, 'webm')).toBe(1_200_000)
    // VP9 a 1 Mbit/s para H.264: H.264 precisa de mais, até 1 ÷ 0,6 ≈ 1,67 Mbit/s.
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'vp9', originalBytes: bytesFor(1_000_000) }, 'mp4')).toBe(1_667_000)
    // HEVC do iPhone a 3 Mbit/s para H.264: até 5 Mbit/s.
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'hevc', originalBytes: bytesFor(3_000_000) }, 'mp4')).toBe(5_000_000)
  })

  it('codec desconhecido conta como H.264; nunca abaixo do mínimo', () => {
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'prores', originalBytes: bytesFor(2_000_000) }, 'mp4')).toBe(2_000_000)
    expect(convertedVideoBitrate({ ...tenSeconds, codec: 'avc', originalBytes: bytesFor(0) }, 'mp4')).toBe(100_000)
  })
})

describe('convertOutputName', () => {
  it('o mesmo nome, com a extensão nova', () => {
    expect(convertOutputName('praia.MOV', 'mp4')).toBe('praia.mp4')
    expect(convertOutputName('clipe.webm', 'mov')).toBe('clipe.mov')
    expect(convertOutputName('.mp4', 'webm')).toBe('video.webm')
  })
})

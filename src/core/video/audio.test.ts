import { describe, expect, it } from 'vitest'
import { AUDIO_FORMATS, audioChoices, audioOutputName, copyableAudioFormat, defaultAudioFormat, type AudioCapabilities } from './audio'

const capable = { canDecodeAudio: true, canEncodeAac: true, canEncodeMp3: true }
const caps = (audioCodec: string | null, overrides: Partial<AudioCapabilities> = {}): AudioCapabilities => ({ audioCodec, ...capable, ...overrides })

describe('copyableAudioFormat', () => {
  it('AAC é copiado para M4A; Opus e Vorbis, para WEBM', () => {
    expect(copyableAudioFormat('aac')).toBe('m4a')
    expect(copyableAudioFormat('opus')).toBe('webm')
    expect(copyableAudioFormat('vorbis')).toBe('webm')
  })

  it('outros sons (PCM, MP3 dentro do vídeo, AC-3) e vídeo sem som não têm cópia', () => {
    expect(copyableAudioFormat('pcm-s16')).toBeNull()
    expect(copyableAudioFormat('mp3')).toBeNull()
    expect(copyableAudioFormat('ac3')).toBeNull()
    expect(copyableAudioFormat(null)).toBeNull()
  })
})

describe('audioChoices', () => {
  it('som AAC: M4A copiado primeiro, depois MP3 refeito', () => {
    expect(audioChoices(caps('aac'))).toEqual([
      { format: 'm4a', copy: true, available: true },
      { format: 'mp3', copy: false, available: true },
    ])
  })

  it('som Opus (WEBM): WEBM copiado, M4A e MP3 refeitos', () => {
    expect(audioChoices(caps('opus'))).toEqual([
      { format: 'webm', copy: true, available: true },
      { format: 'm4a', copy: false, available: true },
      { format: 'mp3', copy: false, available: true },
    ])
  })

  it('a cópia não depende do navegador decodificar nem codificar o som', () => {
    const choices = audioChoices(caps('aac', { canDecodeAudio: false, canEncodeAac: false, canEncodeMp3: false }))
    expect(choices).toEqual([
      { format: 'm4a', copy: true, available: true },
      { format: 'mp3', copy: false, available: false },
    ])
  })

  it('sem gerar AAC (Firefox): M4A refeito fica indisponível, MP3 continua', () => {
    expect(audioChoices(caps('opus', { canEncodeAac: false }))).toEqual([
      { format: 'webm', copy: true, available: true },
      { format: 'm4a', copy: false, available: false },
      { format: 'mp3', copy: false, available: true },
    ])
  })

  it('som sem cópia (PCM): só os refeitos; sem decodificar, nenhum', () => {
    expect(audioChoices(caps('pcm-s16'))).toEqual([
      { format: 'm4a', copy: false, available: true },
      { format: 'mp3', copy: false, available: true },
    ])
    expect(audioChoices(caps('pcm-s16', { canDecodeAudio: false })).every((choice) => !choice.available)).toBe(true)
  })

  it('vídeo sem som: nenhuma opção', () => {
    expect(audioChoices(caps(null))).toEqual([])
  })
})

describe('defaultAudioFormat', () => {
  it('a primeira disponível: a cópia, quando existe', () => {
    expect(defaultAudioFormat(audioChoices(caps('opus')))).toBe('webm')
    expect(defaultAudioFormat(audioChoices(caps('pcm-s16', { canEncodeAac: false })))).toBe('mp3')
  })

  it('nenhuma disponível: indefinido', () => {
    expect(defaultAudioFormat(audioChoices(caps(null)))).toBeUndefined()
    expect(defaultAudioFormat(audioChoices(caps('pcm-s16', { canDecodeAudio: false })))).toBeUndefined()
  })
})

describe('audioOutputName', () => {
  it('acrescenta "-audio" e a extensão do formato do som', () => {
    expect(audioOutputName('praia.MOV', 'm4a')).toBe('praia-audio.m4a')
    expect(audioOutputName('tela.webm', 'webm')).toBe('tela-audio.webm')
    expect(audioOutputName('aula 3.mp4', 'mp3')).toBe('aula 3-audio.mp3')
  })

  it('limpa o nome como nos vídeos e usa "audio" quando não sobra nome', () => {
    expect(audioOutputName('C:\\videos\\a<b>.mp4', 'mp3')).toBe('a_b_-audio.mp3')
    expect(audioOutputName('.mp4', 'm4a')).toBe('audio-audio.m4a')
  })
})

describe('AUDIO_FORMATS', () => {
  it('tipos de arquivo de som, para o download e o player', () => {
    expect(AUDIO_FORMATS.m4a).toMatchObject({ label: 'M4A', mimeType: 'audio/mp4', extension: 'm4a' })
    expect(AUDIO_FORMATS.webm).toMatchObject({ label: 'WEBM', mimeType: 'audio/webm', extension: 'webm' })
    expect(AUDIO_FORMATS.mp3).toMatchObject({ label: 'MP3', mimeType: 'audio/mpeg', extension: 'mp3' })
  })
})

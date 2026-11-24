import { describe, expect, it } from 'vitest'
import {
  MAX_GIF_SECONDS,
  defaultGifFields,
  defaultGifSize,
  gifDelays,
  gifDimensions,
  gifFrameCount,
  gifFrameTimes,
  gifOutputName,
  gifPaletteTimes,
  gifSizeChoices,
  validateGifRange,
} from './gif'

describe('tamanho do GIF', () => {
  it('só tamanhos até o lado maior do vídeo: aumentar só deixaria o GIF mais pesado', () => {
    expect(gifSizeChoices({ width: 1920, height: 1080 }).every((choice) => choice.available)).toBe(true)
    expect(gifSizeChoices({ width: 640, height: 480 }).map((choice) => choice.available)).toEqual([true, true, true])
    expect(gifSizeChoices({ width: 400, height: 300 }).map((choice) => choice.available)).toEqual([true, false, false])
  })

  it('480 já vem escolhido quando dá; senão, o maior disponível; vídeo menor que todos, nenhum', () => {
    expect(defaultGifSize(gifSizeChoices({ width: 1920, height: 1080 }))).toBe(480)
    expect(defaultGifSize(gifSizeChoices({ width: 400, height: 300 }))).toBe(320)
    expect(defaultGifSize(gifSizeChoices({ width: 160, height: 120 }))).toBeUndefined()
  })

  it('medidas pelo lado maior, deitado ou em pé, sem aumentar', () => {
    expect(gifDimensions({ width: 1920, height: 1080 }, 480)).toEqual({ width: 480, height: 270 })
    expect(gifDimensions({ width: 1080, height: 1920 }, 480)).toEqual({ width: 270, height: 480 })
    expect(gifDimensions({ width: 976, height: 736 }, 320)).toEqual({ width: 320, height: 241 })
    expect(gifDimensions({ width: 160, height: 120 }, undefined)).toEqual({ width: 160, height: 120 })
    expect(gifDimensions({ width: 400, height: 300 }, 640)).toEqual({ width: 400, height: 300 })
  })
})

describe('trecho do GIF', () => {
  it('ao abrir: o vídeo inteiro se couber em 15 s; senão, os primeiros 5 s', () => {
    expect(defaultGifFields(4)).toEqual({ start: '0:00,00', end: '0:04,00' })
    expect(defaultGifFields(15)).toEqual({ start: '0:00,00', end: '0:15,00' })
    expect(defaultGifFields(120)).toEqual({ start: '0:00,00', end: '0:05,00' })
  })

  it(`no máximo ${MAX_GIF_SECONDS} segundos, com a explicação`, () => {
    expect(validateGifRange({ start: '0:10', end: '0:25' }, 60)).toEqual({ ok: true, range: { start: 10, end: 25 } })
    const tooLong = validateGifRange({ start: '0:10', end: '0:30' }, 60)
    expect(tooLong.ok).toBe(false)
    if (!tooLong.ok) {
      expect(tooLong.error.message).toBe('O GIF pode ter no máximo 15 segundos, para não ficar pesado demais. O trecho marcado tem 0:20.')
      expect(tooLong.error.fields).toEqual(['end'])
    }
  })

  it('as regras dos campos de tempo continuam: início antes do fim, campo vazio, fora do vídeo', () => {
    const backwards = validateGifRange({ start: '0:05', end: '0:02' }, 60)
    expect(backwards.ok || backwards.error.message).toBe('O início precisa vir antes do fim.')
    const empty = validateGifRange({ start: '', end: '0:02' }, 60)
    expect(empty.ok || empty.error.missing).toBe(true)
    const outside = validateGifRange({ start: '0:00', end: '2:00' }, 60)
    expect(outside.ok || outside.error.fields).toEqual(['end'])
  })
})

describe('quadros do GIF', () => {
  it('um quadro a cada 1/fps segundos, a partir do início', () => {
    expect(gifFrameTimes(2, 3, 10)).toEqual([2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9].map((value) => expect.closeTo(value, 9)))
    expect(gifFrameCount(15, 15)).toBe(225)
    expect(gifFrameCount(0.01, 10)).toBe(1)
  })

  it('tempo de cada quadro em centésimos: 10 a 10 qps; 7, 7, 6 a 15 qps, sem adiantar nem atrasar', () => {
    expect(gifDelays(3, 10)).toEqual([10, 10, 10])
    expect(gifDelays(6, 15)).toEqual([7, 6, 7, 7, 6, 7])
    expect(gifDelays(15, 15).reduce((total, delay) => total + delay, 0)).toBe(100)
  })

  it('paleta: até 16 quadros espalhados pelo trecho, do primeiro ao último', () => {
    const times = gifFrameTimes(0, 15, 15) // 225 quadros
    const samples = gifPaletteTimes(times)
    expect(samples).toHaveLength(16)
    expect(samples[0]).toBe(0)
    expect(samples.at(-1)).toBe(times.at(-1))
    expect(samples.every((time, index) => index === 0 || time > (samples[index - 1] ?? 0))).toBe(true)
    expect(gifPaletteTimes([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('nome do arquivo: o mesmo, com .gif', () => {
    expect(gifOutputName('praia.MOV')).toBe('praia.gif')
    expect(gifOutputName('.mp4')).toBe('video.gif')
  })
})

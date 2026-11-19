import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, validateResize, type ResizeSettings } from './settings'

const pixels = (changes: Partial<ResizeSettings>): ResizeSettings => ({ ...DEFAULT_SETTINGS, mode: 'pixels', ...changes })

describe('validateResize', () => {
  it('começa em Porcentagem, 50%, sem nada para preencher', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ mode: 'percent', percent: 50, keepRatio: true })
    expect(validateResize(DEFAULT_SETTINGS)).toEqual({ ok: true, request: { mode: 'percent', percent: 50 } })
  })

  it('Pixels com a proporção mantida: basta uma medida; a outra não limita', () => {
    expect(validateResize(pixels({ width: '1920' }))).toEqual({ ok: true, request: { mode: 'fit', width: 1920, height: undefined } })
    expect(validateResize(pixels({ height: '1080' }))).toEqual({ ok: true, request: { mode: 'fit', width: undefined, height: 1080 } })
    expect(validateResize(pixels({ width: '1920', height: '1920' }))).toEqual({ ok: true, request: { mode: 'fit', width: 1920, height: 1920 } })
  })

  it('Pixels com a proporção mantida e nenhuma medida: aponta os dois campos como faltando', () => {
    expect(validateResize(pixels({}))).toEqual({
      ok: false,
      error: { message: 'Preencha a largura, a altura ou as duas.', fields: ['width', 'height'], missing: true },
    })
  })

  it('sem manter a proporção: as duas medidas, exatas', () => {
    expect(validateResize(pixels({ keepRatio: false, width: '100', height: '20' }))).toEqual({
      ok: true,
      request: { mode: 'exact', width: 100, height: 20 },
    })
  })

  it('sem manter a proporção: aponta só a medida que falta', () => {
    const missing = { message: 'Sem manter a proporção, preencha a largura e a altura.', missing: true }
    expect(validateResize(pixels({ keepRatio: false, width: '100' }))).toEqual({ ok: false, error: { ...missing, fields: ['height'] } })
    expect(validateResize(pixels({ keepRatio: false }))).toEqual({ ok: false, error: { ...missing, fields: ['width', 'height'] } })
  })

  it('cada medida vai de 1 a 16384 px; o erro aponta o campo e aparece já ao digitar', () => {
    const range = { message: 'Use um valor de 1 a 16384 px.', missing: false }
    expect(validateResize(pixels({ width: '0' }))).toEqual({ ok: false, error: { ...range, fields: ['width'] } })
    expect(validateResize(pixels({ width: '1920', height: '16385' }))).toEqual({ ok: false, error: { ...range, fields: ['height'] } })
    expect(validateResize(pixels({ width: '16384', height: '1' })).ok).toBe(true)
  })

  it('medida errada vem antes de medida faltando', () => {
    expect(validateResize(pixels({ keepRatio: false, width: '0' }))).toMatchObject({ ok: false, error: { fields: ['width'], missing: false } })
  })

  it('medidas exatas também respeitam o limite de 50 megapixels do resultado', () => {
    expect(validateResize(pixels({ keepRatio: false, width: '16000', height: '16000' }))).toEqual({
      ok: false,
      error: {
        message: 'O resultado teria 256 megapixels; o limite é 50. Diminua a largura ou a altura.',
        fields: ['width', 'height'],
        missing: false,
      },
    })
    expect(validateResize(pixels({ keepRatio: false, width: '10000', height: '5000' })).ok).toBe(true)
  })

  it('texto que não é número inteiro conta como valor fora da faixa', () => {
    expect(validateResize(pixels({ width: '12.5' }))).toMatchObject({ ok: false, error: { fields: ['width'], missing: false } })
  })

  it('a porcentagem não depende dos campos de pixels', () => {
    expect(validateResize({ ...DEFAULT_SETTINGS, percent: 25, width: '0' })).toEqual({ ok: true, request: { mode: 'percent', percent: 25 } })
  })
})

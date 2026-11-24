import { describe, expect, it } from 'vitest'
import { availableTrimModes, canRemoveParts, checkRange, checkTimeValues, fieldsOfRange, type TrimFields } from './trim'

/** As duas etapas da validação dos campos, como o Criar GIF e o ajuste fino do Editar vídeo usam. */
function validateTrim(fields: TrimFields, duration: number) {
  const checked = checkTimeValues(fields, duration)
  return checked.ok ? checkRange(fields, checked.values, duration, 'O trecho') : checked
}

describe('modos de corte', () => {
  const capable = { canTranscodeVideo: true, canTranscodeAudio: true }

  it('MP4 e MOV: exato e rápido; WEBM: só exato', () => {
    expect(availableTrimModes({ format: 'mp4', ...capable })).toEqual({ exact: true, fast: true })
    expect(availableTrimModes({ format: 'mov', ...capable })).toEqual({ exact: true, fast: true })
    expect(availableTrimModes({ format: 'webm', ...capable })).toEqual({ exact: true, fast: false })
  })

  it('sem recodificar o vídeo (ex.: HEVC num navegador sem o decodificador), só o rápido', () => {
    expect(availableTrimModes({ format: 'mov', canTranscodeVideo: false, canTranscodeAudio: true })).toEqual({ exact: false, fast: true })
    expect(availableTrimModes({ format: 'webm', canTranscodeVideo: false, canTranscodeAudio: true })).toEqual({ exact: false, fast: false })
  })

  it('WEBM com som que não dá para recodificar não tem corte exato', () => {
    expect(availableTrimModes({ format: 'webm', canTranscodeVideo: true, canTranscodeAudio: false })).toEqual({ exact: false, fast: false })
    expect(availableTrimModes({ format: 'mp4', canTranscodeVideo: true, canTranscodeAudio: false })).toEqual({ exact: true, fast: true })
  })

  it('remover partes exige recodificar o vídeo e o som', () => {
    expect(canRemoveParts({ format: 'mp4', ...capable })).toBe(true)
    expect(canRemoveParts({ format: 'mp4', canTranscodeVideo: true, canTranscodeAudio: false })).toBe(false)
    expect(canRemoveParts({ format: 'webm', canTranscodeVideo: false, canTranscodeAudio: true })).toBe(false)
  })
})

const fields = (start: string, end: string) => ({ start, end })

describe('campos de início e fim', () => {
  it('início e fim dentro do vídeo viram o trecho', () => {
    expect(validateTrim(fields('0:01,50', '0:03,00'), 4.6)).toEqual({ ok: true, range: { start: 1.5, end: 3 } })
    expect(validateTrim(fields('0', '4,6'), 4.6)).toEqual({ ok: true, range: { start: 0, end: 4.6 } })
  })

  it('o fim igual ao mostrado para a duração vale, mesmo arredondado para cima, e fica na duração', () => {
    expect(validateTrim(fields('0:01,00', '0:04,60'), 4.596)).toEqual({ ok: true, range: { start: 1, end: 4.596 } })
  })

  it('texto que não é tempo: erro já ao digitar, no campo certo', () => {
    expect(validateTrim(fields('abc', '0:03,00'), 4.6)).toEqual({
      ok: false,
      error: { message: 'Use minutos e segundos, como 1:05,30.', fields: ['start'], missing: false },
    })
    expect(validateTrim(fields('0:01,00', '1:60'), 4.6)).toEqual({
      ok: false,
      error: { message: 'Use minutos e segundos, como 1:05,30.', fields: ['end'], missing: false },
    })
  })

  it('início no fim do vídeo ou depois, e fim depois do vídeo', () => {
    expect(validateTrim(fields('0:04,60', ''), 4.6)).toEqual({
      ok: false,
      error: { message: 'O vídeo tem 0:04,60: o início precisa vir antes disso.', fields: ['start'], missing: false },
    })
    expect(validateTrim(fields('0:01,00', '0:05,00'), 4.6)).toEqual({
      ok: false,
      error: { message: 'O vídeo tem 0:04,60: o fim não pode passar disso.', fields: ['end'], missing: false },
    })
  })

  it('campo vazio falta preencher; o aviso só aparece ao tentar cortar', () => {
    expect(validateTrim(fields('', ''), 4.6)).toEqual({
      ok: false,
      error: { message: 'Preencha o início e o fim.', fields: ['start', 'end'], missing: true },
    })
    expect(validateTrim(fields('0:01,00', ' '), 4.6)).toEqual({
      ok: false,
      error: { message: 'Preencha o fim.', fields: ['end'], missing: true },
    })
  })

  it('o início vem antes do fim, e o trecho tem pelo menos 0,1 s', () => {
    expect(validateTrim(fields('0:03,00', '0:01,00'), 4.6)).toEqual({
      ok: false,
      error: { message: 'O início precisa vir antes do fim.', fields: ['start', 'end'], missing: false },
    })
    expect(validateTrim(fields('0:01,00', '0:01,05'), 4.6)).toEqual({
      ok: false,
      error: { message: 'O trecho precisa ter pelo menos 0,1 segundo.', fields: ['end', 'start'], missing: false },
    })
    expect(validateTrim(fields('0:01,00', '0:01,10'), 4.6).ok).toBe(true)
  })
})

describe('trecho', () => {
  it('os campos mostram o trecho em minutos, segundos e centésimos', () => {
    expect(fieldsOfRange({ start: 0, end: 4.6 })).toEqual(fields('0:00,00', '0:04,60'))
  })
})

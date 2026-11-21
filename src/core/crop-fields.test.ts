import { describe, expect, it } from 'vitest'
import {
  ASPECT_CHOICES,
  aspectLabel,
  aspectRatio,
  editField,
  fieldsOf,
  nothingCroppedMessage,
  validateCropFields,
  type CropFields,
} from './crop-fields'

const landscape = { width: 400, height: 300 }
const portrait = { width: 300, height: 400 }
const fields = (x: string, y: string, width: string, height: string): CropFields => ({ x, y, width, height })

describe('proporções', () => {
  it('Livre, 1:1, 4:3 e 16:9 numa foto deitada', () => {
    expect(ASPECT_CHOICES.map((choice) => aspectLabel(choice, landscape))).toEqual(['Livre', '1:1', '4:3', '16:9'])
    expect(aspectRatio('free', landscape)).toBeUndefined()
    expect(aspectRatio('square', landscape)).toBe(1)
    expect(aspectRatio('standard', landscape)).toBeCloseTo(4 / 3)
    expect(aspectRatio('wide', landscape)).toBeCloseTo(16 / 9)
  })

  it('numa foto em pé a área acompanha a foto: 3:4 e 9:16', () => {
    expect(ASPECT_CHOICES.map((choice) => aspectLabel(choice, portrait))).toEqual(['Livre', '1:1', '3:4', '9:16'])
    expect(aspectRatio('standard', portrait)).toBeCloseTo(3 / 4)
    expect(aspectRatio('wide', portrait)).toBeCloseTo(9 / 16)
  })
})

describe('validateCropFields', () => {
  it('valores dentro da imagem viram a área de recorte', () => {
    expect(validateCropFields(fields('10', '20', '100', '50'), landscape)).toEqual({ ok: true, crop: { x: 10, y: 20, width: 100, height: 50 } })
    expect(validateCropFields(fields('0', '0', '400', '300'), landscape).ok).toBe(true)
  })

  it('campo vazio falta preencher; o aviso só aparece ao tentar recortar', () => {
    expect(validateCropFields(fields('10', '', '100', ''), landscape)).toEqual({
      ok: false,
      error: { message: 'Preencha margem esquerda, margem superior, largura e altura.', fields: ['y', 'height'], missing: true },
    })
  })

  it('cada medida tem a sua faixa, e o erro aparece já ao digitar', () => {
    const range = (message: string, field: keyof CropFields) => ({ ok: false, error: { message, fields: [field], missing: false } })
    expect(validateCropFields(fields('400', '0', '10', '10'), landscape)).toEqual(range('Use um valor de 0 a 399 px.', 'x'))
    expect(validateCropFields(fields('0', '300', '10', '10'), landscape)).toEqual(range('Use um valor de 0 a 299 px.', 'y'))
    expect(validateCropFields(fields('0', '0', '0', '10'), landscape)).toEqual(range('Use um valor de 1 a 400 px.', 'width'))
    expect(validateCropFields(fields('0', '0', '10', '301'), landscape)).toEqual(range('Use um valor de 1 a 300 px.', 'height'))
    expect(validateCropFields(fields('1.5', '0', '10', '10'), landscape)).toEqual(range('Use um valor de 0 a 399 px.', 'x'))
  })

  it('a área não passa da borda direita nem da de baixo', () => {
    expect(validateCropFields(fields('300', '0', '101', '10'), landscape)).toEqual({
      ok: false,
      error: {
        message: 'A área passa da borda direita da imagem, que tem 400 px de largura. Diminua a margem esquerda ou a largura.',
        fields: ['width', 'x'],
        missing: false,
      },
    })
    expect(validateCropFields(fields('0', '250', '10', '51'), landscape)).toEqual({
      ok: false,
      error: {
        message: 'A área passa da borda de baixo da imagem, que tem 300 px de altura. Diminua a margem superior ou a altura.',
        fields: ['height', 'y'],
        missing: false,
      },
    })
  })
})

describe('textos para imagem e para vídeo', () => {
  it('as mensagens falam do que está sendo recortado', () => {
    expect(validateCropFields(fields('300', '0', '101', '10'), landscape, 'video')).toMatchObject({
      ok: false,
      error: { message: 'A área passa da borda direita do vídeo, que tem 400 px de largura. Diminua a margem esquerda ou a largura.' },
    })
    expect(validateCropFields(fields('0', '250', '10', '51'), landscape, 'video')).toMatchObject({
      ok: false,
      error: { message: 'A área passa da borda de baixo do vídeo, que tem 300 px de altura. Diminua a margem superior ou a altura.' },
    })
  })

  it('com lado mínimo (vídeo), a área e as margens respeitam o mínimo', () => {
    const range = (message: string, field: keyof CropFields) => ({ ok: false, error: { message, fields: [field], missing: false } })
    expect(validateCropFields(fields('0', '0', '15', '100'), landscape, 'video', 16)).toEqual(range('Use um valor de 16 a 400 px.', 'width'))
    expect(validateCropFields(fields('0', '0', '100', '15'), landscape, 'video', 16)).toEqual(range('Use um valor de 16 a 300 px.', 'height'))
    expect(validateCropFields(fields('385', '0', '16', '16'), landscape, 'video', 16)).toEqual(range('Use um valor de 0 a 384 px.', 'x'))
    expect(validateCropFields(fields('384', '284', '16', '16'), landscape, 'video', 16)).toEqual({ ok: true, crop: { x: 384, y: 284, width: 16, height: 16 } })
  })

  it('aviso de nada recortado', () => {
    expect(nothingCroppedMessage('image')).toBe('Ajuste a área de recorte antes: arraste os cantos sobre a imagem ou digite as medidas.')
    expect(nothingCroppedMessage('video')).toBe('Ajuste a área de recorte antes: arraste os cantos sobre o vídeo ou digite as medidas.')
  })
})

describe('editField', () => {
  const full = fieldsOf({ x: 0, y: 0, width: 400, height: 300 })

  it('mostra a área em texto e guarda só algarismos do que for digitado', () => {
    expect(full).toEqual(fields('0', '0', '400', '300'))
    expect(editField(full, 'x', '1.5 px')).toEqual(fields('15', '0', '400', '300'))
  })

  it('com proporção, a largura puxa a altura e a altura puxa a largura', () => {
    expect(editField(full, 'width', '200', 4 / 3)).toEqual(fields('0', '0', '200', '150'))
    expect(editField(full, 'height', '90', 16 / 9)).toEqual(fields('0', '0', '160', '90'))
  })

  it('sem proporção, ou mudando a posição, só o campo editado muda', () => {
    expect(editField(full, 'width', '200')).toEqual(fields('0', '0', '200', '300'))
    expect(editField(full, 'x', '20', 1)).toEqual(fields('20', '0', '400', '300'))
  })

  it('campo apagado não mexe no outro', () => {
    expect(editField(full, 'width', '', 4 / 3)).toEqual(fields('0', '0', '', '300'))
  })
})

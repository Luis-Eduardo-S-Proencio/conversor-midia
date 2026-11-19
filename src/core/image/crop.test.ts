import { describe, expect, it } from 'vitest'
import { centeredAspectCrop, cropFromPercent, cropToPercent, fullCrop, isCropWithin, isFullCrop } from './crop'

const photo = { width: 4000, height: 3000 }

describe('área de recorte', () => {
  it('começa com a imagem inteira, que não recorta nada', () => {
    expect(fullCrop(photo)).toEqual({ x: 0, y: 0, width: 4000, height: 3000 })
    expect(isFullCrop(fullCrop(photo), photo)).toBe(true)
    expect(isFullCrop({ x: 0, y: 0, width: 3999, height: 3000 }, photo)).toBe(false)
  })

  it('só vale dentro da imagem, com medidas inteiras de pelo menos 1 px', () => {
    expect(isCropWithin({ x: 0, y: 0, width: 4000, height: 3000 }, photo)).toBe(true)
    expect(isCropWithin({ x: 3999, y: 2999, width: 1, height: 1 }, photo)).toBe(true)
    expect(isCropWithin({ x: 1, y: 0, width: 4000, height: 3000 }, photo)).toBe(false) // passa da borda direita
    expect(isCropWithin({ x: 0, y: 0, width: 0, height: 10 }, photo)).toBe(false)
    expect(isCropWithin({ x: -1, y: 0, width: 10, height: 10 }, photo)).toBe(false)
    expect(isCropWithin({ x: 0.5, y: 0, width: 10, height: 10 }, photo)).toBe(false)
  })

  describe('proporção centralizada', () => {
    it('foto deitada em 1:1: quadrado da altura inteira, no meio', () => {
      expect(centeredAspectCrop(photo, 1)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 })
    })

    it('foto deitada em 16:9: largura inteira, faixa no meio', () => {
      expect(centeredAspectCrop(photo, 16 / 9)).toEqual({ x: 0, y: 375, width: 4000, height: 2250 })
    })

    it('foto em pé em 9:16: altura inteira', () => {
      expect(centeredAspectCrop({ width: 3000, height: 4000 }, 9 / 16)).toEqual({ x: 375, y: 0, width: 2250, height: 4000 })
    })

    it('a proporção da própria imagem cobre tudo', () => {
      expect(centeredAspectCrop(photo, 4 / 3)).toEqual(fullCrop(photo))
    })

    it('arredonda para pixels inteiros sem sair da imagem', () => {
      // 37 × 16/9 = 65,8 → 66 px; sobram 35, divididos 18 e 17.
      const crop = centeredAspectCrop({ width: 101, height: 37 }, 16 / 9)
      expect(isCropWithin(crop, { width: 101, height: 37 })).toBe(true)
      expect(crop).toEqual({ x: 18, y: 0, width: 66, height: 37 })
    })
  })

  describe('porcentagem (tela) ⇄ pixels (imagem)', () => {
    it('converte a área desenhada na prévia para pixels da imagem original', () => {
      expect(cropFromPercent({ x: 25, y: 10, width: 50, height: 80 }, photo)).toEqual({ x: 1000, y: 300, width: 2000, height: 2400 })
    })

    it('arredonda cada borda, para não acumular erro', () => {
      // Bordas em 33,33% e 66,67% de 100 px: 33 e 67, logo 34 px de largura.
      expect(cropFromPercent({ x: 33.333, y: 0, width: 33.334, height: 100 }, { width: 100, height: 10 })).toEqual({
        x: 33,
        y: 0,
        width: 34,
        height: 10,
      })
    })

    it('mantém a área dentro da imagem e com pelo menos 1 px', () => {
      expect(cropFromPercent({ x: -2, y: 98, width: 110, height: 0.01 }, { width: 100, height: 100 })).toEqual({ x: 0, y: 98, width: 100, height: 1 })
      expect(cropFromPercent({ x: 100, y: 100, width: 0, height: 0 }, { width: 100, height: 100 })).toEqual({ x: 99, y: 99, width: 1, height: 1 })
    })

    it('ida e volta preserva a área em pixels', () => {
      const crop = { x: 123, y: 45, width: 1777, height: 999 }
      expect(cropFromPercent(cropToPercent(crop, photo), photo)).toEqual(crop)
    })
  })
})

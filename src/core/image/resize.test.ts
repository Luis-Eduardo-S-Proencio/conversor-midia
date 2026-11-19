import { describe, expect, it } from 'vitest'
import { resizedDimensions } from './resize'

const photo = { width: 5120, height: 2880 }

describe('resizedDimensions', () => {
  describe('porcentagem', () => {
    it('reduz largura e altura na mesma proporção', () => {
      expect(resizedDimensions(photo, { mode: 'percent', percent: 50 })).toEqual({ width: 2560, height: 1440 })
      expect(resizedDimensions(photo, { mode: 'percent', percent: 25 })).toEqual({ width: 1280, height: 720 })
    })

    it('arredonda para o pixel mais próximo', () => {
      expect(resizedDimensions({ width: 101, height: 33 }, { mode: 'percent', percent: 50 })).toEqual({ width: 51, height: 17 })
    })

    it('nunca chega a zero: o menor lado fica com pelo menos 1 px', () => {
      expect(resizedDimensions({ width: 1000, height: 3 }, { mode: 'percent', percent: 10 })).toEqual({ width: 100, height: 1 })
    })
  })

  describe('caber nas medidas (proporção mantida)', () => {
    it('só a largura: a altura acompanha', () => {
      expect(resizedDimensions(photo, { mode: 'fit', width: 1920 })).toEqual({ width: 1920, height: 1080 })
    })

    it('só a altura: a largura acompanha', () => {
      expect(resizedDimensions({ width: 3000, height: 4000 }, { mode: 'fit', height: 1000 })).toEqual({ width: 750, height: 1000 })
    })

    it('as duas: a imagem cabe na caixa, limitada pela medida mais apertada', () => {
      expect(resizedDimensions(photo, { mode: 'fit', width: 1920, height: 1920 })).toEqual({ width: 1920, height: 1080 })
      // Em pé, a mesma caixa limita pela altura.
      expect(resizedDimensions({ width: 2880, height: 5120 }, { mode: 'fit', width: 1920, height: 1920 })).toEqual({ width: 1080, height: 1920 })
    })

    it('nunca amplia: imagem que já cabe fica com as medidas originais', () => {
      expect(resizedDimensions({ width: 800, height: 600 }, { mode: 'fit', width: 1920 })).toEqual({ width: 800, height: 600 })
      expect(resizedDimensions({ width: 800, height: 600 }, { mode: 'fit', width: 800, height: 600 })).toEqual({ width: 800, height: 600 })
    })

    it('a medida pedida sai exata, sem erro de arredondamento', () => {
      expect(resizedDimensions({ width: 1001, height: 333 }, { mode: 'fit', width: 500 })).toEqual({ width: 500, height: 166 })
      expect(resizedDimensions({ width: 3, height: 7 }, { mode: 'fit', height: 5 })).toEqual({ width: 2, height: 5 })
    })
  })

  describe('medidas exatas (sem manter a proporção)', () => {
    it('usa as medidas pedidas, mesmo deformando ou ampliando', () => {
      expect(resizedDimensions(photo, { mode: 'exact', width: 1080, height: 1080 })).toEqual({ width: 1080, height: 1080 })
      expect(resizedDimensions({ width: 64, height: 48 }, { mode: 'exact', width: 100, height: 20 })).toEqual({ width: 100, height: 20 })
    })
  })
})

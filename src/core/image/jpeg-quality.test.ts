import { describe, expect, it } from 'vitest'
import { qualityFromDqt, qualityFromLuminanceSum, reencodeQuality } from './jpeg-quality'

/** Tabela padrão do brilho, na ordem natural (a ordem não muda a soma). */
const STANDARD = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68,
  109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]

/** Tabela que o libjpeg (e os navegadores) gravam para a qualidade pedida. */
function libjpegTable(quality: number): number[] {
  const scale = quality < 50 ? 5000 / quality : 200 - quality * 2
  return STANDARD.map((value) => Math.min(255, Math.max(1, Math.floor((value * scale + 50) / 100))))
}

/** Segmento DQT (sem marcador e tamanho) com tabelas de 8 bits: [id, 64 valores]... */
const dqt = (...tables: Array<[number, number[]]>) => new Uint8Array(tables.flatMap(([id, values]) => [id, ...values]))

describe('qualityFromDqt', () => {
  it('reconhece a qualidade com que o libjpeg gravou a foto', () => {
    // Abaixo de cerca de 25, o libjpeg corta valores em 255 e a estimativa sai um pouco acima: sem efeito prático.
    for (const quality of [30, 50, 75, 85, 92, 95]) {
      expect(qualityFromDqt(dqt([0, libjpegTable(quality)]))).toBeCloseTo(quality, -0.5)
    }
  })

  it('usa a tabela 0 (brilho), mesmo depois da tabela da cor', () => {
    expect(qualityFromDqt(dqt([1, libjpegTable(40)], [0, libjpegTable(80)]))).toBe(80)
  })

  it('tabela de 16 bits', () => {
    const values = libjpegTable(60)
    const segment = new Uint8Array([0x10, ...values.flatMap((value) => [value >> 8, value & 0xff])])
    expect(qualityFromDqt(segment)).toBe(60)
  })

  it('segmento sem a tabela do brilho ou cortado: sem estimativa', () => {
    expect(qualityFromDqt(dqt([1, libjpegTable(80)]))).toBeUndefined()
    expect(qualityFromDqt(new Uint8Array([0, 1, 2, 3]))).toBeUndefined()
    expect(qualityFromDqt(new Uint8Array([0x20, ...libjpegTable(80)]))).toBeUndefined()
  })

  it('fica entre 1 e 100', () => {
    expect(qualityFromLuminanceSum(64)).toBeGreaterThanOrEqual(99) // tudo 1: qualidade máxima
    expect(qualityFromLuminanceSum(64 * 255)).toBeGreaterThanOrEqual(1)
  })
})

describe('reencodeQuality', () => {
  it('JPG regravado em JPG: nunca acima da qualidade da original', () => {
    expect(reencodeQuality(0.92, { format: 'jpeg', jpegQuality: 75 }, 'jpeg')).toBe(0.75)
    expect(reencodeQuality(0.92, { format: 'jpeg', jpegQuality: 96 }, 'jpeg')).toBe(0.92)
  })

  it('foto JPG para WEBP ou PDF (que leva um JPG dentro): também não passa da original', () => {
    expect(reencodeQuality(0.85, { format: 'jpeg', jpegQuality: 75 }, 'webp')).toBe(0.75)
    expect(reencodeQuality(0.85, { format: 'jpeg', jpegQuality: 75 }, 'pdf')).toBe(0.75)
  })

  it('sem estimativa, original que não é JPG ou formato sem perdas: a qualidade pedida', () => {
    expect(reencodeQuality(0.92, { format: 'jpeg' }, 'jpeg')).toBe(0.92)
    expect(reencodeQuality(0.92, { format: 'png' }, 'jpeg')).toBe(0.92)
    expect(reencodeQuality(0.92, { format: 'jpeg', jpegQuality: 75 }, 'png')).toBe(0.92)
  })
})

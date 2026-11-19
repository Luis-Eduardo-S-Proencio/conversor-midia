import { describe, expect, it } from 'vitest'
import { readPdf } from '../../../test/format-readers'
import { concat } from '../../../test/image-bytes'
import { pdfParts } from './pdf'

// Conteúdo qualquer no lugar do JPEG: o PDF só precisa do tamanho para montar a estrutura.
const fakeJpeg = Uint8Array.from({ length: 1234 }, (_, index) => (index * 7) % 256)

function buildPdf(width: number, height: number) {
  const { head, tail } = pdfParts({ width, height, imageLength: fakeJpeg.length })
  return readPdf(concat(head, fakeJpeg, tail))
}

describe('pdfParts', () => {
  it('PDF de uma página com a imagem em JPEG, xref correta e nada além da imagem', () => {
    const pdf = buildPdf(640, 480)
    expect(pdf.version).toBe('1.4')
    expect(pdf.objectCount).toBe(5)
    expect(pdf.image).toMatchObject({ width: 640, height: 480, filter: 'DCTDecode', colorSpace: 'DeviceRGB' })
    expect(pdf.image.bytes).toEqual(fakeJpeg)
  })

  it('a página tem o tamanho da imagem a 96 dpi, ocupada inteira pela imagem', () => {
    const pdf = buildPdf(640, 480)
    expect(pdf.mediaBox).toEqual([0, 0, 480, 360])
    expect(pdf.content).toBe('q 480 0 0 360 0 0 cm /Im0 Do Q')
  })

  it('imagens enormes cabem no limite de página dos leitores de PDF (200 polegadas)', () => {
    const pdf = buildPdf(30_000, 1000)
    expect(pdf.mediaBox).toEqual([0, 0, 14_400, 480])
  })
})

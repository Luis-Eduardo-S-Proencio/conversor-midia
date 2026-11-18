import { describe, expect, it } from 'vitest'
import { concat, jpegBytes, pngBytes, webpLossy } from '../../test/image-bytes'
import { detectImageType } from './signature'

describe('detectImageType', () => {
  it.each([
    ['JPEG', jpegBytes({ width: 1, height: 1 }), 'jpeg'],
    ['PNG', pngBytes({ width: 1, height: 1 }), 'png'],
    ['WEBP', webpLossy(1, 1), 'webp'],
  ] as const)('reconhece %s pela assinatura', (_, bytes, format) => {
    expect(detectImageType(bytes)).toEqual({ kind: 'supported', format })
  })

  it.each([
    ['GIF', concat('GIF89a', [1, 0, 1, 0])],
    ['GIF', concat('GIF87a', [1, 0, 1, 0])],
    ['PDF', concat('%PDF-1.7\n')],
    ['BMP', concat('BM', [0x36, 0, 0, 0])],
    ['TIFF', concat('II', [42, 0, 8, 0, 0, 0])],
    ['TIFF', concat('MM', [0, 42, 0, 0, 0, 8])],
    ['HEIC', concat([0, 0, 0, 24], 'ftypheic', [0, 0, 0, 0])],
    ['HEIC', concat([0, 0, 0, 24], 'ftypmif1', [0, 0, 0, 0])],
    ['AVIF', concat([0, 0, 0, 24], 'ftypavif', [0, 0, 0, 0])],
    ['SVG', concat('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['SVG', concat([0xef, 0xbb, 0xbf], '  <SVG viewBox="0 0 1 1"></SVG>')],
  ])('reconhece %s como formato não aceito', (name, bytes) => {
    expect(detectImageType(bytes)).toEqual({ kind: 'unsupported', name })
  })

  it('não reconhece texto comum nem arquivo vazio', () => {
    expect(detectImageType(concat('apenas um texto qualquer'))).toEqual({ kind: 'unknown' })
    expect(detectImageType(new Uint8Array())).toEqual({ kind: 'unknown' })
  })

  it('exige a assinatura completa', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8]))).toEqual({ kind: 'unknown' })
    expect(detectImageType(concat('RIFF', [0, 0, 0, 0], 'WAVE'))).toEqual({ kind: 'unknown' })
  })
})

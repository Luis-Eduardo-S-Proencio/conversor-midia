import { describe, expect, it } from 'vitest'
import { concat, jpegBytes, pngBytes } from '../../test/image-bytes'
import { ebmlBytes, ftypBytes } from '../../test/video-bytes'
import { detectVideoType } from './signature'

describe('detectVideoType', () => {
  it.each([
    ['MP4 (isom)', ftypBytes('isom'), 'mp4'],
    ['MP4 (mp42)', ftypBytes('mp42'), 'mp4'],
    ['MP4 do Android (mp41)', ftypBytes('mp41'), 'mp4'],
    ['M4V', ftypBytes('M4V '), 'mp4'],
    ['MOV do iPhone', ftypBytes('qt  '), 'mov'],
    ['WebM', ebmlBytes('webm'), 'webm'],
  ] as const)('reconhece %s pela assinatura', (_, bytes, format) => {
    expect(detectVideoType(bytes)).toEqual({ kind: 'supported', format })
  })

  it.each([
    ['MKV', ebmlBytes('matroska')],
    ['3GP', ftypBytes('3gp4')],
    ['3GP', ftypBytes('3g2a')],
    ['AVI', concat('RIFF', [0, 0, 0, 0], 'AVI LIST')],
    ['WMV', concat([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa])],
    ['FLV', concat('FLV', [1, 5, 0, 0, 0, 9])],
    ['MPEG', concat([0x00, 0x00, 0x01, 0xba, 0x44])],
    ['OGG', concat('OggS', [0, 2])],
    ['PDF', concat('%PDF-1.7\n')],
  ])('reconhece %s como formato não aceito', (name, bytes) => {
    expect(detectVideoType(bytes)).toEqual({ kind: 'unsupported', name })
  })

  it('reconhece TS e MTS pelos pacotes de 188 e 192 bytes', () => {
    const ts = new Uint8Array(400)
    ts[0] = 0x47
    ts[188] = 0x47
    const mts = new Uint8Array(400)
    mts[4] = 0x47
    mts[196] = 0x47
    expect(detectVideoType(ts)).toEqual({ kind: 'unsupported', name: 'TS' })
    expect(detectVideoType(mts)).toEqual({ kind: 'unsupported', name: 'TS' })
  })

  it.each([
    ['M4A', ftypBytes('M4A ')],
    ['MP3', concat('ID3', [4, 0, 0, 0, 0, 0, 0])],
    ['WAV', concat('RIFF', [0, 0, 0, 0], 'WAVEfmt ')],
    ['FLAC', concat('fLaC', [0, 0, 0, 34])],
  ])('reconhece %s como arquivo só de áudio', (name, bytes) => {
    expect(detectVideoType(bytes)).toEqual({ kind: 'unsupported', name, category: 'audio' })
  })

  it.each([
    ['JPG', jpegBytes({ width: 1, height: 1 })],
    ['PNG', pngBytes({ width: 1, height: 1 })],
    ['GIF', concat('GIF89a', [1, 0, 1, 0])],
    ['HEIC', ftypBytes('heic')],
    ['AVIF', ftypBytes('avif')],
  ])('reconhece imagem (%s) escolhida por engano', (name, bytes) => {
    expect(detectVideoType(bytes)).toEqual({ kind: 'unsupported', name, category: 'image' })
  })

  it('não reconhece texto, arquivo vazio, MOV antigo sem "ftyp" nem EBML incompleto', () => {
    expect(detectVideoType(concat('Isto é um texto com extensão de vídeo.\n'))).toEqual({ kind: 'unknown' })
    expect(detectVideoType(new Uint8Array())).toEqual({ kind: 'unknown' })
    expect(detectVideoType(concat([0, 0, 0, 8], 'wide', [0, 0, 0, 8], 'mdat'))).toEqual({ kind: 'unknown' })
    expect(detectVideoType(ebmlBytes('webm').slice(0, 12))).toEqual({ kind: 'unknown' })
    expect(detectVideoType(concat([0x1a, 0x45, 0xdf, 0xa3, 0x00]))).toEqual({ kind: 'unknown' })
  })
})

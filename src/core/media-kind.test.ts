import { describe, expect, it } from 'vitest'
import { concat, jpegBytes, pngBytes, webpLossy } from '../test/image-bytes'
import { ebmlBytes, ftypBytes } from '../test/video-bytes'
import { detectMedia, detectMediaKind, planOpening } from './media-kind'

describe('detectMediaKind', () => {
  it.each([
    ['JPG', jpegBytes({ width: 4, height: 3 })],
    ['PNG', pngBytes({ width: 4, height: 3 })],
    ['WEBP', webpLossy(4, 3)],
  ])('reconhece %s como imagem', (_, bytes) => {
    expect(detectMediaKind(bytes)).toBe('image')
  })

  it.each([
    ['MP4', ftypBytes('isom')],
    ['MOV', ftypBytes('qt  ')],
    ['WEBM', ebmlBytes('webm')],
  ])('reconhece %s como vídeo', (_, bytes) => {
    expect(detectMediaKind(bytes)).toBe('video')
  })

  it.each([
    ['GIF', concat('GIF89a', [1, 0, 1, 0])],
    ['HEIC', ftypBytes('heic')],
    ['MKV', ebmlBytes('matroska')],
    ['PDF', concat('%PDF-1.7\n')],
    ['texto', concat('olá, isto não é mídia')],
    ['vazio', new Uint8Array()],
  ])('recusa %s', (_, bytes) => {
    expect(detectMediaKind(bytes)).toBeNull()
  })
})

describe('detectMedia', () => {
  it.each([
    ['JPG', jpegBytes({ width: 4, height: 3 }), 'image'],
    ['PNG', pngBytes({ width: 4, height: 3 }), 'image'],
    ['WEBP', webpLossy(4, 3), 'image'],
    ['MP4', ftypBytes('isom'), 'video'],
    ['MOV', ftypBytes('qt  '), 'video'],
    ['WEBM', ebmlBytes('webm'), 'video'],
  ])('dá o tipo e o nome do formato de %s, pelo conteúdo', (label, bytes, kind) => {
    expect(detectMedia(bytes)).toEqual({ kind, formatLabel: label })
  })

  it('o que não abre fica de fora', () => {
    expect(detectMedia(ftypBytes('heic'))).toBeNull()
  })
})

describe('planOpening', () => {
  it('leva várias imagens juntas para as ferramentas de imagem', () => {
    expect(
      planOpening([
        { name: 'a.jpg', kind: 'image' },
        { name: 'b.png', kind: 'image' },
      ]),
    ).toEqual({ ok: true, kind: 'image', count: 2 })
  })

  it('leva um vídeo para as ferramentas de vídeo', () => {
    expect(planOpening([{ name: 'viagem.mp4', kind: 'video' }])).toEqual({ ok: true, kind: 'video' })
  })

  it('diz qual arquivo não é aceito', () => {
    const plan = planOpening([
      { name: 'a.jpg', kind: 'image' },
      { name: 'documento.pdf', kind: null },
    ])
    expect(plan).toEqual({ ok: false, message: expect.stringContaining('"documento.pdf"') })
  })

  it('não mistura imagens e vídeo', () => {
    const plan = planOpening([
      { name: 'a.jpg', kind: 'image' },
      { name: 'b.mp4', kind: 'video' },
    ])
    expect(plan).toEqual({ ok: false, message: expect.stringContaining('só imagens ou só um vídeo') })
  })

  it('abre um vídeo de cada vez', () => {
    const plan = planOpening([
      { name: 'a.mp4', kind: 'video' },
      { name: 'b.webm', kind: 'video' },
    ])
    expect(plan).toEqual({ ok: false, message: expect.stringContaining('um de cada vez') })
  })

  it('explica quando nada foi escolhido', () => {
    expect(planOpening([])).toEqual({ ok: false, message: 'Nenhum arquivo foi escolhido.' })
  })
})

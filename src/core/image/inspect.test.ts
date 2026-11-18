import { describe, expect, it } from 'vitest'
import { concat, jpegBytes, jpegSegment, pngBytes } from '../../test/image-bytes'
import { IMAGE_LIMITS, inspectImageFile } from './inspect'

const asFile = (bytes: Uint8Array<ArrayBuffer>, name = 'arquivo.png', type = 'image/png') => new File([bytes], name, { type })

describe('inspectImageFile', () => {
  it('usa o conteúdo real: nome e tipo informados não importam', async () => {
    const file = asFile(pngBytes({ width: 640, height: 480, colorType: 6 }), 'foto.jpg', 'image/jpeg')
    expect(await inspectImageFile(file)).toEqual({
      ok: true,
      image: { format: 'png', width: 640, height: 480, hasAlpha: true, animated: false },
    })
  })

  it('recusa arquivo vazio', async () => {
    expect(await inspectImageFile(asFile(new Uint8Array()))).toEqual({ ok: false, reason: { code: 'empty' } })
  })

  it('recusa arquivo acima do limite de bytes e aceita exatamente o limite', async () => {
    const bytes = pngBytes({ width: 10, height: 10 })
    const limits = { ...IMAGE_LIMITS, maxFileBytes: bytes.length }
    expect((await inspectImageFile(asFile(bytes), limits)).ok).toBe(true)
    expect(await inspectImageFile(asFile(concat(bytes, [0])), limits)).toEqual({
      ok: false,
      reason: { code: 'too-large', maxBytes: bytes.length },
    })
  })

  it('recusa formato não aceito, com o nome quando reconhecido', async () => {
    expect(await inspectImageFile(asFile(concat('GIF89a', new Uint8Array(20))))).toEqual({
      ok: false,
      reason: { code: 'unsupported-format', formatName: 'GIF' },
    })
    expect(await inspectImageFile(asFile(concat('isto é um texto, não uma imagem')))).toEqual({
      ok: false,
      reason: { code: 'unsupported-format' },
    })
  })

  it('recusa cabeçalho corrompido', async () => {
    const truncated = pngBytes({ width: 10, height: 10 }).subarray(0, 20)
    expect(await inspectImageFile(asFile(truncated))).toEqual({ ok: false, reason: { code: 'corrupt' } })
  })

  it('recusa bomba de pixels antes de decodificar: arquivo pequeno declarando imagem enorme', async () => {
    const bomb = pngBytes({ width: 20_000, height: 20_000 })
    expect(bomb.length).toBeLessThan(100)
    expect(await inspectImageFile(asFile(bomb))).toEqual({
      ok: false,
      reason: { code: 'too-many-pixels', megapixels: 400, maxMegapixels: 50 },
    })
  })

  it('aceita exatamente o limite de pixels', async () => {
    const limits = { ...IMAGE_LIMITS, maxPixels: 640 * 480 }
    expect((await inspectImageFile(asFile(pngBytes({ width: 640, height: 480 })), limits)).ok).toBe(true)
    expect((await inspectImageFile(asFile(pngBytes({ width: 641, height: 480 })), limits)).ok).toBe(false)
  })

  it('lê mais do arquivo quando o cabeçalho está além do início', async () => {
    const bigSegments = [jpegSegment(0xfe, new Uint8Array(60_000)), jpegSegment(0xfe, new Uint8Array(60_000))]
    const file = asFile(jpegBytes({ width: 1200, height: 900, segments: bigSegments }), 'grande.jpg')
    expect(await inspectImageFile(file)).toEqual({
      ok: true,
      image: { format: 'jpeg', width: 1200, height: 900, hasAlpha: false, animated: false },
    })
  })

  it('desiste além do teto de leitura do cabeçalho', async () => {
    const bigSegment = jpegSegment(0xfe, new Uint8Array(60_000))
    const file = asFile(jpegBytes({ width: 1200, height: 900, segments: [bigSegment] }))
    expect(await inspectImageFile(file, { ...IMAGE_LIMITS, maxHeaderBytes: 30_000 })).toEqual({
      ok: false,
      reason: { code: 'corrupt' },
    })
  })

  it('limites padrão: 50 MB por arquivo, 50 megapixels por imagem e 20 arquivos por vez', () => {
    expect(IMAGE_LIMITS).toMatchObject({ maxFileBytes: 50 * 1024 * 1024, maxPixels: 50_000_000, maxFiles: 20 })
  })
})

import { describe, expect, it } from 'vitest'
import { concat, jpegBytes } from '../../test/image-bytes'
import { ebmlBytes, ftypBytes } from '../../test/video-bytes'
import { checkVideoFile } from './inspect'

const blob = (bytes: Uint8Array<ArrayBuffer>) => new Blob([bytes])

describe('checkVideoFile', () => {
  it('aceita MP4, MOV e WebM pelo conteúdo', async () => {
    expect(await checkVideoFile(blob(ftypBytes('isom')))).toEqual({ ok: true, format: 'mp4' })
    expect(await checkVideoFile(blob(ftypBytes('qt  ')))).toEqual({ ok: true, format: 'mov' })
    expect(await checkVideoFile(blob(ebmlBytes('webm')))).toEqual({ ok: true, format: 'webm' })
  })

  it('recusa arquivo vazio e o que passa do limite, antes de ler', async () => {
    expect(await checkVideoFile(new Blob([]))).toEqual({ ok: false, reason: { code: 'empty' } })
    expect(await checkVideoFile(blob(ftypBytes('isom')), { maxFileBytes: 10 })).toEqual({
      ok: false,
      reason: { code: 'too-large', maxBytes: 10 },
    })
  })

  it('recusa outros formatos dizendo qual é, e o que não reconhece', async () => {
    expect(await checkVideoFile(blob(ebmlBytes('matroska')))).toEqual({ ok: false, reason: { code: 'unsupported-format', formatName: 'MKV' } })
    expect(await checkVideoFile(blob(jpegBytes({ width: 1, height: 1 })))).toEqual({
      ok: false,
      reason: { code: 'unsupported-format', formatName: 'JPG', category: 'image' },
    })
    expect(await checkVideoFile(blob(concat('não é vídeo')))).toEqual({ ok: false, reason: { code: 'unsupported-format' } })
  })
})

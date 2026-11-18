import { describe, expect, it } from 'vitest'
import { IMAGE_FORMATS, compressionFormat, defaultTargetFormat } from './formats'

describe('IMAGE_FORMATS', () => {
  it('descreve tipo, extensão, qualidade e transparência de cada formato', () => {
    expect(IMAGE_FORMATS.jpeg).toMatchObject({ label: 'JPG', mimeType: 'image/jpeg', extension: 'jpg', lossy: true, supportsAlpha: false })
    expect(IMAGE_FORMATS.png).toMatchObject({ label: 'PNG', mimeType: 'image/png', extension: 'png', lossy: false, supportsAlpha: true })
    expect(IMAGE_FORMATS.webp).toMatchObject({ label: 'WEBP', mimeType: 'image/webp', extension: 'webp', lossy: true, supportsAlpha: true })
  })
})

describe('defaultTargetFormat', () => {
  it('é JPG quando há imagens em outros formatos', () => {
    expect(defaultTargetFormat(['png', 'webp'], true)).toBe('jpeg')
    expect(defaultTargetFormat(['jpeg', 'png'], true)).toBe('jpeg')
  })

  it('é WEBP quando todas já são JPG, ou PNG se o navegador não gera WEBP', () => {
    expect(defaultTargetFormat(['jpeg', 'jpeg'], true)).toBe('webp')
    expect(defaultTargetFormat(['jpeg'], false)).toBe('png')
  })

  it('é JPG sem imagens', () => {
    expect(defaultTargetFormat([], true)).toBe('jpeg')
  })
})

describe('compressionFormat', () => {
  it('JPG continua JPG', () => {
    expect(compressionFormat('jpeg', false, true)).toBe('jpeg')
    expect(compressionFormat('jpeg', false, false)).toBe('jpeg')
  })

  it('PNG e WEBP viram WEBP quando o navegador gera WEBP (mantém a transparência)', () => {
    expect(compressionFormat('png', true, true)).toBe('webp')
    expect(compressionFormat('webp', true, true)).toBe('webp')
  })

  it('sem WEBP: opacos viram JPG; com transparência não há como reduzir', () => {
    expect(compressionFormat('png', false, false)).toBe('jpeg')
    expect(compressionFormat('webp', false, false)).toBe('jpeg')
    expect(compressionFormat('png', true, false)).toBeNull()
    expect(compressionFormat('webp', true, false)).toBeNull()
  })
})

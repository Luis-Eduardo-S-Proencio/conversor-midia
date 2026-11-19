import { describe, expect, it } from 'vitest'
import { IMAGE_FORMATS, OUTPUT_FORMATS, OUTPUT_FORMAT_INFO, compressionFormat, defaultTargetFormat, preservedFormat } from './formats'

describe('IMAGE_FORMATS', () => {
  it('descreve tipo, extensão, qualidade e transparência de cada formato', () => {
    expect(IMAGE_FORMATS.jpeg).toMatchObject({ label: 'JPG', mimeType: 'image/jpeg', extension: 'jpg', lossy: true, supportsAlpha: false })
    expect(IMAGE_FORMATS.png).toMatchObject({ label: 'PNG', mimeType: 'image/png', extension: 'png', lossy: false, supportsAlpha: true })
    expect(IMAGE_FORMATS.webp).toMatchObject({ label: 'WEBP', mimeType: 'image/webp', extension: 'webp', lossy: true, supportsAlpha: true })
  })
})

describe('OUTPUT_FORMATS', () => {
  it('gera os formatos de imagem lidos pelo navegador e outros escritos pelo próprio app; GIF fica com os vídeos', () => {
    expect(OUTPUT_FORMATS).toEqual(['jpeg', 'png', 'webp', 'bmp', 'tiff', 'ico', 'pdf'])
    expect(Object.keys(OUTPUT_FORMAT_INFO)).toEqual(OUTPUT_FORMATS)
  })

  it('descreve cada formato de saída: qualidade só onde há compressão com perdas', () => {
    expect(OUTPUT_FORMAT_INFO.jpeg).toEqual(IMAGE_FORMATS.jpeg)
    expect(OUTPUT_FORMAT_INFO.bmp).toMatchObject({ label: 'BMP', mimeType: 'image/bmp', extension: 'bmp', lossy: false, supportsAlpha: false })
    expect(OUTPUT_FORMAT_INFO.tiff).toMatchObject({ label: 'TIFF', mimeType: 'image/tiff', extension: 'tiff', lossy: false, supportsAlpha: true })
    expect(OUTPUT_FORMAT_INFO.ico).toMatchObject({ label: 'ICO', mimeType: 'image/x-icon', extension: 'ico', lossy: false, supportsAlpha: true })
    // O PDF guarda a imagem em JPG: tem qualidade e não tem transparência.
    expect(OUTPUT_FORMAT_INFO.pdf).toMatchObject({ label: 'PDF', mimeType: 'application/pdf', extension: 'pdf', lossy: true, supportsAlpha: false })
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

describe('preservedFormat (redimensionar, girar e espelhar)', () => {
  it('mantém o formato original', () => {
    expect(preservedFormat('jpeg', false, true)).toBe('jpeg')
    expect(preservedFormat('png', true, true)).toBe('png')
    expect(preservedFormat('webp', true, true)).toBe('webp')
    expect(preservedFormat('png', true, false)).toBe('png')
  })

  it('sem WEBP no navegador: WEBP vira PNG se tiver transparência, senão JPG', () => {
    expect(preservedFormat('webp', true, false)).toBe('png')
    expect(preservedFormat('webp', false, false)).toBe('jpeg')
  })
})

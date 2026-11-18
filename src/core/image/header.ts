import { readAscii, readU16BE, readU16LE, readU24LE, readU32BE, readU32LE } from './bytes'
import type { ImageFormat } from './formats'

export interface ImageHeader {
  /** Dimensões como a imagem aparece, já considerando a orientação EXIF. */
  width: number
  height: number
  hasAlpha: boolean
  animated: boolean
}

export type HeaderResult =
  | { status: 'ok'; header: ImageHeader }
  /** O cabeçalho continua além dos bytes lidos: leia pelo menos `bytes` desde o início. */
  | { status: 'need-more'; bytes: number }
  | { status: 'invalid' }

const INVALID: HeaderResult = { status: 'invalid' }

/** Pede mais bytes, ou recusa se o arquivo nem tem esse tamanho (está truncado). */
function needMore(required: number, fileSize: number): HeaderResult {
  return required > fileSize ? INVALID : { status: 'need-more', bytes: required }
}

function ok(width: number, height: number, hasAlpha: boolean, animated: boolean): HeaderResult {
  if (width < 1 || height < 1) return INVALID
  return { status: 'ok', header: { width, height, hasAlpha, animated } }
}

/**
 * Lê dimensões, transparência e animação só do cabeçalho, sem decodificar a imagem.
 * Permite recusar "bombas de pixels" antes de reservar memória para elas.
 */
export function readImageHeader(bytes: Uint8Array, format: ImageFormat, fileSize: number): HeaderResult {
  switch (format) {
    case 'png':
      return readPng(bytes, fileSize)
    case 'jpeg':
      return readJpeg(bytes, fileSize)
    case 'webp':
      return readWebp(bytes, fileSize)
  }
}

/* PNG: IHDR fixo no início; tRNS (transparência) e acTL (animação) aparecem antes dos dados. */

const PNG_COLOR_TYPES = new Set([0, 2, 3, 4, 6])

function readPng(bytes: Uint8Array, fileSize: number): HeaderResult {
  if (bytes.length < 33) return needMore(33, fileSize)
  if (readU32BE(bytes, 8) !== 13 || readAscii(bytes, 12, 4) !== 'IHDR') return INVALID
  const width = readU32BE(bytes, 16)
  const height = readU32BE(bytes, 20)
  const colorType = bytes[25] ?? -1
  if (!PNG_COLOR_TYPES.has(colorType)) return INVALID

  let hasAlpha = colorType === 4 || colorType === 6
  let animated = false
  let offset = 33
  for (;;) {
    if (offset + 8 > bytes.length) return needMore(offset + 8, fileSize)
    const type = readAscii(bytes, offset + 4, 4)
    if (type === 'IDAT' || type === 'IEND') return ok(width, height, hasAlpha, animated)
    if (type === 'tRNS') hasAlpha = true
    if (type === 'acTL') animated = true
    offset += 12 + readU32BE(bytes, offset)
  }
}

/* JPEG: segmentos até o SOF (dimensões); o APP1/EXIF antes dele traz a orientação. */

function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)
}

function readJpeg(bytes: Uint8Array, fileSize: number): HeaderResult {
  let offset = 2
  let orientation = 1
  for (;;) {
    // Bytes 0xFF repetidos antes de um marcador são preenchimento permitido.
    while (bytes[offset] === 0xff && bytes[offset + 1] === 0xff) offset += 1
    if (offset + 4 > bytes.length) return needMore(offset + 4, fileSize)
    if (bytes[offset] !== 0xff) return INVALID

    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xda || marker === 0xd9) return INVALID // dados ou fim antes das dimensões
    if (isStandaloneMarker(marker)) {
      offset += 2
      continue
    }

    const segmentLength = readU16BE(bytes, offset + 2)
    if (segmentLength < 2) return INVALID
    const segmentEnd = offset + 2 + segmentLength

    if (isStartOfFrame(marker)) {
      if (offset + 9 > bytes.length) return needMore(offset + 9, fileSize)
      const height = readU16BE(bytes, offset + 5)
      const width = readU16BE(bytes, offset + 7)
      // Orientações 5 a 8 giram 90°: a imagem aparece com largura e altura trocadas.
      return orientation >= 5 ? ok(height, width, false, false) : ok(width, height, false, false)
    }
    if (marker === 0xe1) {
      if (segmentEnd > bytes.length) return needMore(segmentEnd, fileSize)
      orientation = readExifOrientation(bytes.subarray(offset + 4, segmentEnd)) ?? orientation
    }
    offset = segmentEnd
  }
}

/** Tag 0x0112 do primeiro IFD. EXIF malformado é ignorado: a imagem continua válida. */
function readExifOrientation(segment: Uint8Array): number | undefined {
  if (readAscii(segment, 0, 6) !== 'Exif\0\0') return undefined
  const tiff = segment.subarray(6)
  const byteOrder = readAscii(tiff, 0, 2)
  if (byteOrder !== 'II' && byteOrder !== 'MM') return undefined
  const littleEndian = byteOrder === 'II'
  const u16 = (offset: number) => (littleEndian ? readU16LE(tiff, offset) : readU16BE(tiff, offset))
  const u32 = (offset: number) => (littleEndian ? readU32LE(tiff, offset) : readU32BE(tiff, offset))

  if (tiff.length < 8 || u16(2) !== 42) return undefined
  const ifd = u32(4)
  if (ifd + 2 > tiff.length) return undefined
  const entries = u16(ifd)
  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12
    if (entry + 12 > tiff.length) return undefined
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8)
      return value >= 1 && value <= 8 ? value : undefined
    }
  }
  return undefined
}

/* WEBP: o primeiro chunk (VP8, VP8L ou VP8X) traz as dimensões. */

function readWebp(bytes: Uint8Array, fileSize: number): HeaderResult {
  if (bytes.length < 30) return needMore(30, fileSize)
  const chunk = readAscii(bytes, 12, 4)

  if (chunk === 'VP8 ') {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return INVALID
    return ok(readU16LE(bytes, 26) & 0x3fff, readU16LE(bytes, 28) & 0x3fff, false, false)
  }
  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return INVALID
    const [b0, b1, b2, b3] = [bytes[21] ?? 0, bytes[22] ?? 0, bytes[23] ?? 0, bytes[24] ?? 0]
    const width = 1 + (b0 | ((b1 & 0x3f) << 8))
    const height = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10))
    return ok(width, height, ((b3 >> 4) & 1) === 1, false)
  }
  if (chunk === 'VP8X') {
    const flags = bytes[20] ?? 0
    return ok(1 + readU24LE(bytes, 24), 1 + readU24LE(bytes, 27), (flags & 0x10) !== 0, (flags & 0x02) !== 0)
  }
  return INVALID
}

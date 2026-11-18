/**
 * Construtores de bytes de imagem para testes.
 * Geram cabeçalhos mínimos de JPEG, PNG e WEBP (sem pixels decodificáveis) e inserem
 * orientação EXIF em um JPEG real. Usados pelos testes unitários, pelo script de fixtures e pelo E2E.
 */

type Part = readonly number[] | Uint8Array | string

function latin1(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff)
}

export function concat(...parts: Part[]): Uint8Array<ArrayBuffer> {
  const arrays = parts.map((part) => (typeof part === 'string' ? latin1(part) : Uint8Array.from(part)))
  const out = new Uint8Array(arrays.reduce((total, array) => total + array.length, 0))
  let offset = 0
  for (const array of arrays) {
    out.set(array, offset)
    offset += array.length
  }
  return out
}

export const u16be = (n: number) => [(n >> 8) & 0xff, n & 0xff]
export const u32be = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
export const u16le = (n: number) => [n & 0xff, (n >> 8) & 0xff]
export const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]
export const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]

/* PNG */

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

export function pngChunk(type: string, data: Part = []): Uint8Array<ArrayBuffer> {
  const body = concat(data)
  return concat(u32be(body.length), type, body, [0, 0, 0, 0]) // o leitor não confere o CRC
}

export function pngBytes({
  width,
  height,
  colorType = 6,
  chunks = [],
}: {
  width: number
  height: number
  colorType?: number
  chunks?: Uint8Array[]
}): Uint8Array<ArrayBuffer> {
  const ihdr = pngChunk('IHDR', concat(u32be(width), u32be(height), [8, colorType, 0, 0, 0]))
  return concat(PNG_SIGNATURE, ihdr, ...chunks, pngChunk('IDAT', [0]), pngChunk('IEND'))
}

/* JPEG */

export function jpegSegment(marker: number, data: Part = []): Uint8Array<ArrayBuffer> {
  const body = concat(data)
  return concat([0xff, marker], u16be(body.length + 2), body)
}

/** Segmento APP1 com EXIF contendo só a tag de orientação. */
export function exifSegment(orientation: number, byteOrder: 'MM' | 'II' = 'MM'): Uint8Array<ArrayBuffer> {
  const u16 = byteOrder === 'MM' ? u16be : u16le
  const u32 = byteOrder === 'MM' ? u32be : u32le
  const tiff = concat(byteOrder, u16(42), u32(8), u16(1), u16(0x0112), u16(3), u32(1), u16(orientation), [0, 0], u32(0))
  return jpegSegment(0xe1, concat('Exif\0\0', tiff))
}

export function jpegBytes({
  width,
  height,
  sof = 0xc0,
  segments = [],
}: {
  width: number
  height: number
  sof?: number
  segments?: Uint8Array[]
}): Uint8Array<ArrayBuffer> {
  const frame = jpegSegment(sof, concat([8], u16be(height), u16be(width), [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]))
  return concat([0xff, 0xd8], ...segments, frame, jpegSegment(0xda, [1, 1, 0, 0, 0x3f, 0]), [0xff, 0xd9])
}

/** Insere orientação EXIF num JPEG real, logo após o SOI (e o APP0/JFIF, se houver). */
export function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array<ArrayBuffer> {
  let insertAt = 2
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) insertAt = 4 + ((jpeg[4]! << 8) | jpeg[5]!)
  return concat(jpeg.subarray(0, insertAt), exifSegment(orientation), jpeg.subarray(insertAt))
}

/* WEBP */

function webpChunk(fourCC: string, data: Part): Uint8Array<ArrayBuffer> {
  const body = concat(data)
  return concat(fourCC, u32le(body.length), body, body.length % 2 === 1 ? [0] : [])
}

function riff(chunk: Uint8Array): Uint8Array<ArrayBuffer> {
  return concat('RIFF', u32le(4 + chunk.length), 'WEBP', chunk)
}

export function webpLossy(width: number, height: number): Uint8Array<ArrayBuffer> {
  return riff(webpChunk('VP8 ', concat([0x30, 0x01, 0x00], [0x9d, 0x01, 0x2a], u16le(width), u16le(height), new Uint8Array(10))))
}

export function webpLossless(width: number, height: number, alpha = false): Uint8Array<ArrayBuffer> {
  const w = width - 1
  const h = height - 1
  const packed = [w & 0xff, ((w >> 8) & 0x3f) | ((h & 0x03) << 6), (h >> 2) & 0xff, ((h >> 10) & 0x0f) | ((alpha ? 1 : 0) << 4)]
  return riff(webpChunk('VP8L', concat([0x2f], packed, new Uint8Array(10))))
}

export function webpExtended(width: number, height: number, { alpha = false, animation = false } = {}): Uint8Array<ArrayBuffer> {
  const flags = (alpha ? 0x10 : 0) | (animation ? 0x02 : 0)
  return riff(webpChunk('VP8X', concat([flags, 0, 0, 0], u24le(width - 1), u24le(height - 1))))
}

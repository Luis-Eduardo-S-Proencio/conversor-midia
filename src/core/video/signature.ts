import { readAscii } from '../image/bytes'
import { IMAGE_FORMATS } from '../image/formats'
import { detectImageType } from '../image/signature'
import type { VideoFormat } from './formats'

/** Arquivo que não é vídeo: a mensagem diz o que ele é. */
export type NonVideoCategory = 'image' | 'audio'

export type DetectedVideoType =
  | { kind: 'supported'; format: VideoFormat }
  /** Formato reconhecido, mas não aceito: o nome entra na mensagem ao usuário. */
  | { kind: 'unsupported'; name: string; category?: NonVideoCategory }
  | { kind: 'unknown' }

const EBML_MAGIC = [0x1a, 0x45, 0xdf, 0xa3]
const ASF_MAGIC = [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]
const MPEG_PS_MAGIC = [0x00, 0x00, 0x01, 0xba]
const EBML_DOC_TYPE_ID = 0x4282
const AUDIO_BRANDS = new Set(['M4A ', 'M4B ', 'M4P '])
const TS_SYNC_BYTE = 0x47

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

const supported = (format: VideoFormat): DetectedVideoType => ({ kind: 'supported', format })
const unsupported = (name: string, category?: NonVideoCategory): DetectedVideoType =>
  category ? { kind: 'unsupported', name, category } : { kind: 'unsupported', name }

/** Número de tamanho variável do EBML: o primeiro byte diz quantos bytes ele ocupa (1 a 8). */
function readVint(bytes: Uint8Array, offset: number, keepMarker: boolean): { value: number; length: number } | null {
  const first = bytes[offset]
  if (first === undefined || first === 0) return null
  const length = Math.clz32(first) - 23 // zeros à esquerda no byte + 1
  if (offset + length > bytes.length) return null
  let value = keepMarker ? first : first & (0xff >> length)
  for (let index = 1; index < length; index += 1) value = value * 256 + (bytes[offset + index] ?? 0)
  return { value, length }
}

/** Tipo do documento no cabeçalho EBML: "webm" ou "matroska". */
function readEbmlDocType(bytes: Uint8Array): string | null {
  const headerSize = readVint(bytes, EBML_MAGIC.length, false)
  if (!headerSize) return null
  let offset = EBML_MAGIC.length + headerSize.length
  const end = Math.min(bytes.length, offset + headerSize.value)
  while (offset < end) {
    const id = readVint(bytes, offset, true)
    if (!id) return null
    const size = readVint(bytes, offset + id.length, false)
    if (!size) return null
    offset += id.length + size.length
    if (id.value === EBML_DOC_TYPE_ID) return readAscii(bytes, offset, Math.min(size.value, end - offset)).replace(/\0+$/, '')
    offset += size.value
  }
  return null
}

/** MP4 e MOV têm a mesma estrutura (ISO BMFF); a marca no "ftyp" separa os dois e as imagens HEIC e AVIF. */
function detectIsoBmff(bytes: Uint8Array): DetectedVideoType {
  const brand = readAscii(bytes, 8, 4)
  if (brand === 'qt  ') return supported('mov')
  const image = detectImageType(bytes)
  if (image.kind === 'unsupported') return unsupported(image.name, 'image')
  if (AUDIO_BRANDS.has(brand)) return unsupported('M4A', 'audio')
  if (brand.startsWith('3g')) return unsupported('3GP')
  return supported('mp4')
}

function isTransportStream(bytes: Uint8Array): boolean {
  // Pacotes de 188 bytes (TS) ou de 192, com 4 bytes de prefixo (MTS e M2TS de câmeras).
  return (bytes[0] === TS_SYNC_BYTE && bytes[188] === TS_SYNC_BYTE) || (bytes[4] === TS_SYNC_BYTE && bytes[196] === TS_SYNC_BYTE)
}

/** Imagem escolhida por engano na ferramenta de vídeo: a mensagem explica em vez de só recusar. */
function detectNonVideo(bytes: Uint8Array): DetectedVideoType {
  const image = detectImageType(bytes)
  if (image.kind === 'supported') return unsupported(IMAGE_FORMATS[image.format].label, 'image')
  if (image.kind === 'unsupported') return image.name === 'PDF' ? unsupported('PDF') : unsupported(image.name, 'image')
  return { kind: 'unknown' }
}

/**
 * Identifica o formato pelos primeiros bytes (4 KB bastam). Extensão e tipo informado pelo
 * navegador são controlados por quem envia o arquivo e nunca servem de prova.
 */
export function detectVideoType(bytes: Uint8Array): DetectedVideoType {
  if (readAscii(bytes, 4, 4) === 'ftyp') return detectIsoBmff(bytes)
  if (startsWith(bytes, EBML_MAGIC)) {
    const docType = readEbmlDocType(bytes)
    if (docType === 'webm') return supported('webm')
    return docType === 'matroska' ? unsupported('MKV') : { kind: 'unknown' }
  }
  if (readAscii(bytes, 0, 4) === 'RIFF') {
    const kind = readAscii(bytes, 8, 4)
    if (kind === 'AVI ') return unsupported('AVI')
    if (kind === 'WAVE') return unsupported('WAV', 'audio')
  }
  if (startsWith(bytes, ASF_MAGIC)) return unsupported('WMV')
  if (readAscii(bytes, 0, 3) === 'FLV') return unsupported('FLV')
  if (isTransportStream(bytes)) return unsupported('TS')
  if (startsWith(bytes, MPEG_PS_MAGIC)) return unsupported('MPEG')
  if (readAscii(bytes, 0, 4) === 'OggS') return unsupported('OGG')
  if (readAscii(bytes, 0, 3) === 'ID3') return unsupported('MP3', 'audio')
  if (readAscii(bytes, 0, 4) === 'fLaC') return unsupported('FLAC', 'audio')
  return detectNonVideo(bytes)
}

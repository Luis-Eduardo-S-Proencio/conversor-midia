import { readAscii } from './bytes'
import type { ImageFormat } from './formats'

export type DetectedImageType =
  | { kind: 'supported'; format: ImageFormat }
  /** Formato reconhecido, mas não aceito: o nome entra na mensagem ao usuário. */
  | { kind: 'unsupported'; name: string }
  | { kind: 'unknown' }

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'])
const AVIF_BRANDS = new Set(['avif', 'avis'])

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

const supported = (format: ImageFormat): DetectedImageType => ({ kind: 'supported', format })
const unsupported = (name: string): DetectedImageType => ({ kind: 'unsupported', name })

/**
 * Identifica o formato pelos primeiros bytes. Extensão e tipo informado pelo navegador
 * são controlados por quem envia o arquivo e nunca servem de prova.
 */
export function detectImageType(bytes: Uint8Array): DetectedImageType {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return supported('jpeg')
  if (startsWith(bytes, PNG_SIGNATURE)) return supported('png')
  if (readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WEBP') return supported('webp')

  const head = readAscii(bytes, 0, 6)
  if (head === 'GIF87a' || head === 'GIF89a') return unsupported('GIF')
  if (readAscii(bytes, 0, 5) === '%PDF-') return unsupported('PDF')
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return unsupported('TIFF')
  if (readAscii(bytes, 4, 4) === 'ftyp') {
    const brand = readAscii(bytes, 8, 4)
    if (AVIF_BRANDS.has(brand)) return unsupported('AVIF')
    if (HEIF_BRANDS.has(brand)) return unsupported('HEIC')
  }
  if (bytes.length >= 6 && readAscii(bytes, 0, 2) === 'BM') return unsupported('BMP')
  if (readAscii(bytes, 0, Math.min(bytes.length, 1024)).toLowerCase().includes('<svg')) return unsupported('SVG')
  return { kind: 'unknown' }
}

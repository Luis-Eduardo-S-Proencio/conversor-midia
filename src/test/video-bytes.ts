/**
 * Construtores de inícios de arquivo de vídeo para testes de assinatura (sem quadros decodificáveis).
 * Vídeos de verdade ficam em tests/fixtures/videos/, gerados por `npm run fixtures`.
 */
import { concat } from './image-bytes'

/** Caixa "ftyp" de um MP4 ou MOV, com a marca principal pedida ("isom", "qt  "...). */
export function ftypBytes(brand: string): Uint8Array<ArrayBuffer> {
  return concat([0, 0, 0, 0x18], 'ftyp', brand, [0, 0, 0, 0], 'isom', 'mp42', [0, 0, 0, 8], 'free')
}

const element = (id: readonly number[], payload: readonly number[]) => [...id, 0x80 | payload.length, ...payload]
const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0))

/** Cabeçalho EBML de um WebM ("webm") ou MKV ("matroska"), seguido do início do segmento. */
export function ebmlBytes(docType: string): Uint8Array<ArrayBuffer> {
  const children = [
    ...element([0x42, 0x86], [1]), // EBMLVersion
    ...element([0x42, 0xf7], [1]), // EBMLReadVersion
    ...element([0x42, 0xf2], [4]), // EBMLMaxIDLength
    ...element([0x42, 0xf3], [8]), // EBMLMaxSizeLength
    ...element([0x42, 0x82], ascii(docType)), // DocType
    ...element([0x42, 0x87], [4]), // DocTypeVersion
    ...element([0x42, 0x85], [2]), // DocTypeReadVersion
  ]
  return concat([0x1a, 0x45, 0xdf, 0xa3, 0x80 | children.length], children, [0x18, 0x53, 0x80, 0x67])
}

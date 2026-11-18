/** Leitura de inteiros e texto em posições de um arquivo. Fora dos limites, conta como zero. */

export function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) return ''
  let text = ''
  for (let index = offset; index < offset + length; index += 1) text += String.fromCharCode(bytes[index] ?? 0)
  return text
}

const at = (bytes: Uint8Array, offset: number) => bytes[offset] ?? 0

export const readU16BE = (bytes: Uint8Array, offset: number) => (at(bytes, offset) << 8) | at(bytes, offset + 1)

export const readU16LE = (bytes: Uint8Array, offset: number) => at(bytes, offset) | (at(bytes, offset + 1) << 8)

export const readU24LE = (bytes: Uint8Array, offset: number) =>
  at(bytes, offset) | (at(bytes, offset + 1) << 8) | (at(bytes, offset + 2) << 16)

// `>>> 0` mantém o valor sem sinal quando o byte mais alto passa de 127.
export const readU32BE = (bytes: Uint8Array, offset: number) =>
  ((at(bytes, offset) << 24) >>> 0) + ((at(bytes, offset + 1) << 16) | (at(bytes, offset + 2) << 8) | at(bytes, offset + 3))

export const readU32LE = (bytes: Uint8Array, offset: number) =>
  ((at(bytes, offset + 3) << 24) >>> 0) + ((at(bytes, offset + 2) << 16) | (at(bytes, offset + 1) << 8) | at(bytes, offset))

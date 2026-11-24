/**
 * Qualidade aproximada de um JPG (de 1 a 100), pela tabela de quantização do brilho (DQT), como na
 * escala do libjpeg, a mesma que os navegadores usam ao gerar JPG. Serve para não regravar uma foto
 * com qualidade maior que a dela: isso só deixa o arquivo mais pesado, sem trazer detalhe de volta.
 * Câmeras usam tabelas próprias; para elas, o valor é uma boa aproximação.
 */

import type { ImageFormat, OutputFormat } from './formats'

/** Tabela padrão do brilho (ITU-T T.81, anexo K), a da qualidade 50. A soma não depende da ordem. */
const STANDARD_LUMINANCE_SUM = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68,
  109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
].reduce((total, value) => total + value, 0)

/** Qualidade a partir da soma da tabela do brilho, invertendo a escala do libjpeg. */
export function qualityFromLuminanceSum(sum: number): number {
  const scale = (sum * 100) / STANDARD_LUMINANCE_SUM
  const quality = scale <= 100 ? (200 - scale) / 2 : 5000 / scale
  return Math.min(100, Math.max(1, Math.round(quality)))
}

/**
 * Lê as tabelas de um segmento DQT (sem o marcador e o tamanho) e devolve a qualidade da tabela 0, a do
 * brilho; `undefined` se o segmento não a tiver ou estiver malformado.
 */
export function qualityFromDqt(segment: Uint8Array): number | undefined {
  let offset = 0
  while (offset < segment.length) {
    const info = segment[offset] ?? 0
    const precision = info >> 4 // 0: valores de 8 bits; 1: de 16 bits
    const id = info & 0x0f
    const size = precision === 0 ? 64 : 128
    if (precision > 1 || offset + 1 + size > segment.length) return undefined
    if (id === 0) {
      let sum = 0
      for (let index = 0; index < 64; index += 1) {
        const at = offset + 1 + index * (precision + 1)
        sum += precision === 0 ? (segment[at] ?? 0) : ((segment[at] ?? 0) << 8) | (segment[at + 1] ?? 0)
      }
      return qualityFromLuminanceSum(sum)
    }
    offset += 1 + size
  }
  return undefined
}

/** Formatos gravados com perdas, em que a qualidade muda o tamanho (o PDF leva um JPG dentro). */
const LOSSY_TARGETS: ReadonlySet<OutputFormat> = new Set(['jpeg', 'webp', 'pdf'])

/**
 * Qualidade para gravar uma foto JPG em formato com perdas: a pedida (ou a padrão da ferramenta), mas nunca
 * acima da qualidade da original. Uma foto do WhatsApp (cerca de 75) regravada a 92 ficaria mais pesada sem
 * ganhar nada: o detalhe perdido não volta.
 */
export function reencodeQuality(quality: number, source: { format: ImageFormat; jpegQuality?: number }, target: OutputFormat): number {
  if (source.format !== 'jpeg' || source.jpegQuality === undefined || !LOSSY_TARGETS.has(target)) return quality
  return Math.min(quality, source.jpegQuality / 100)
}

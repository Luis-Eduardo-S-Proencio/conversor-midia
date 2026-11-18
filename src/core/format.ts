/**
 * Formatação de dados técnicos de arquivos para a interface, no padrão pt-BR.
 * Funções puras: sem DOM e sem React.
 */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
const BYTE_STEP = 1024
const MINUS_SIGN = '−'

const numberFormats = new Map<number, Intl.NumberFormat>()

function formatNumber(value: number, maximumFractionDigits: number): string {
  let format = numberFormats.get(maximumFractionDigits)
  if (!format) {
    format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits })
    numberFormats.set(maximumFractionDigits, format)
  }
  return format.format(value)
}

function assertByteSize(bytes: number): void {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError(`Tamanho de arquivo inválido: ${bytes}`)
  }
}

// B e KB sem casas decimais; MB em diante com uma.
function fractionDigitsFor(unitIndex: number): number {
  return unitIndex < 2 ? 0 : 1
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * Tamanho legível, em base 1024 como o Explorador do Windows: "840 KB", "8,6 MB".
 * A unidade é escolhida depois do arredondamento, para nunca exibir "1.024 KB".
 */
export function formatBytes(bytes: number): string {
  assertByteSize(bytes)
  let value = bytes
  let unitIndex = 0
  while (unitIndex < BYTE_UNITS.length - 1 && roundTo(value, fractionDigitsFor(unitIndex)) >= BYTE_STEP) {
    value /= BYTE_STEP
    unitIndex += 1
  }
  return `${formatNumber(value, fractionDigitsFor(unitIndex))} ${BYTE_UNITS[unitIndex]}`
}

/** "3024 × 4032". Sem separador de milhar: pixels são lidos como medida, não como quantia. */
export function formatDimensions(width: number, height: number): string {
  for (const side of [width, height]) {
    if (!Number.isInteger(side) || side <= 0) {
      throw new RangeError(`Dimensão inválida: ${side}`)
    }
  }
  return `${width} × ${height}`
}

export interface FileMeta {
  format: string
  sizeBytes: number
  width?: number
  height?: number
}

/** Linha técnica de um arquivo: "PNG · 3024 × 4032 · 8,6 MB". */
export function formatFileMeta({ format, sizeBytes, width, height }: FileMeta): string {
  const parts = [format.toUpperCase()]
  if (width !== undefined && height !== undefined) {
    parts.push(formatDimensions(width, height))
  }
  parts.push(formatBytes(sizeBytes))
  return parts.join(' · ')
}

export type SizeChangeKind = 'smaller' | 'larger' | 'same'

export interface SizeChange {
  kind: SizeChangeKind
  label: string
  value: string
}

/** Variação de tamanho entre original e resultado, arredondada para porcentagem inteira. */
export function describeSizeChange(beforeBytes: number, afterBytes: number): SizeChange {
  if (!Number.isFinite(beforeBytes) || beforeBytes <= 0) {
    throw new RangeError(`Tamanho original inválido: ${beforeBytes}`)
  }
  assertByteSize(afterBytes)

  const percent = Math.round((Math.abs(afterBytes - beforeBytes) / beforeBytes) * 100)
  if (percent === 0) return { kind: 'same', label: 'Sem alteração', value: '0%' }
  if (afterBytes < beforeBytes) return { kind: 'smaller', label: 'Redução', value: `${MINUS_SIGN}${percent}%` }
  return { kind: 'larger', label: 'Aumento', value: `+${percent}%` }
}

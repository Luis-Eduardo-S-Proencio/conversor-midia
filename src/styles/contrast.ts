/**
 * Contraste WCAG 2.x entre cores hexadecimais e leitura dos tokens de cor.
 * Usado pelos testes que impedem tokens com contraste insuficiente.
 */

const HEX_COLOR = /^#([0-9a-f]{6})$/i

function channels(hex: string): [number, number, number] {
  const digits = HEX_COLOR.exec(hex)?.[1]
  if (!digits) throw new TypeError(`Cor inválida (esperado #rrggbb): ${hex}`)
  const value = Number.parseInt(digits, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toLinear(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

/** Luminância relativa conforme a definição da WCAG. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste entre duas cores, de 1 a 21, independente da ordem. */
export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Extrai `--color-nome: #rrggbb` de um CSS, em minúsculas e sem o prefixo. */
export function readColorTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const [, name, value] of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\b/gi)) {
    if (name && value) tokens[name] = value.toLowerCase()
  }
  return tokens
}

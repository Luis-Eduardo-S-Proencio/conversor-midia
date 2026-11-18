import { bands, type PixelSource } from './pixels'

/** Pixels com alfa abaixo disto viram transparentes: o GIF só tem "tudo ou nada". */
export const ALPHA_THRESHOLD = 128

// Cores agrupadas em 32 níveis por canal (32.768 grupos): histograma pequeno e rápido. A cor final
// de cada grupo é a média exata dos pixels dele, então imagens com poucas cores saem idênticas.
const LEVEL_BITS = 5
const LEVELS = 1 << LEVEL_BITS
const BIN_COUNT = 1 << (LEVEL_BITS * 3)
const CHANNEL_SHIFTS = [LEVEL_BITS * 2, LEVEL_BITS, 0] as const

const binOf = (r: number, g: number, b: number) => ((r >> 3) << (LEVEL_BITS * 2)) | ((g >> 3) << LEVEL_BITS) | (b >> 3)
const levelOf = (bin: number, shift: number) => (bin >> shift) & (LEVELS - 1)

export type Rgb = [number, number, number]

export interface Palette {
  colors: Rgb[]
  hasTransparency: boolean
  /** Posição na paleta da cor de um pixel opaco. */
  indexOf(r: number, g: number, b: number): number
}

interface Box {
  bins: number[]
  count: number
  /** Canal com a maior variação: é por ele que a caixa se divide. */
  shift: number
  /** Prioridade de divisão: muitos pixels e cores espalhadas primeiro. */
  score: number
}

function makeBox(bins: number[], counts: Uint32Array): Box {
  let count = 0
  const low = [LEVELS, LEVELS, LEVELS]
  const high = [0, 0, 0]
  for (const bin of bins) {
    count += counts[bin] ?? 0
    CHANNEL_SHIFTS.forEach((shift, channel) => {
      const level = levelOf(bin, shift)
      if (level < (low[channel] ?? 0)) low[channel] = level
      if (level > (high[channel] ?? 0)) high[channel] = level
    })
  }
  let channel = 0
  for (let candidate = 1; candidate < 3; candidate += 1) {
    if ((high[candidate] ?? 0) - (low[candidate] ?? 0) > (high[channel] ?? 0) - (low[channel] ?? 0)) channel = candidate
  }
  const spread = (high[channel] ?? 0) - (low[channel] ?? 0)
  return { bins, count, shift: CHANNEL_SHIFTS[channel] ?? 0, score: count * spread }
}

/** Divide no ponto em que metade dos pixels fica de cada lado (mediana), pelo canal mais variado. */
function splitBox(box: Box, counts: Uint32Array): [Box, Box] {
  const sorted = [...box.bins].sort((a, b) => levelOf(a, box.shift) - levelOf(b, box.shift))
  let accumulated = 0
  let cut = sorted.length - 1
  for (let index = 0; index < sorted.length - 1; index += 1) {
    accumulated += counts[sorted[index] ?? 0] ?? 0
    if (accumulated * 2 >= box.count) {
      cut = index + 1
      break
    }
  }
  return [makeBox(sorted.slice(0, cut), counts), makeBox(sorted.slice(cut), counts)]
}

/**
 * Paleta por corte mediano (median cut). `maxColors` conta a posição reservada para a
 * transparência, quando a imagem tem.
 */
export function buildPalette(source: PixelSource, maxColors: number, bandPixels?: number): Palette {
  const counts = new Uint32Array(BIN_COUNT)
  const sums = new Float64Array(BIN_COUNT * 3)
  let hasTransparency = false
  for (const { rgba } of bands(source, bandPixels)) {
    for (let index = 0; index < rgba.length; index += 4) {
      if ((rgba[index + 3] ?? 0) < ALPHA_THRESHOLD) {
        hasTransparency = true
        continue
      }
      const r = rgba[index] ?? 0
      const g = rgba[index + 1] ?? 0
      const b = rgba[index + 2] ?? 0
      const bin = binOf(r, g, b)
      counts[bin] = (counts[bin] ?? 0) + 1
      sums[bin * 3] = (sums[bin * 3] ?? 0) + r
      sums[bin * 3 + 1] = (sums[bin * 3 + 1] ?? 0) + g
      sums[bin * 3 + 2] = (sums[bin * 3 + 2] ?? 0) + b
    }
  }

  const used: number[] = []
  for (let bin = 0; bin < BIN_COUNT; bin += 1) if ((counts[bin] ?? 0) > 0) used.push(bin)
  // Imagem toda transparente: a paleta ainda precisa de uma cor.
  if (used.length === 0) return { colors: [[0, 0, 0]], hasTransparency, indexOf: () => 0 }

  const limit = hasTransparency ? maxColors - 1 : maxColors
  const boxes = [makeBox(used, counts)]
  while (boxes.length < limit) {
    let best = -1
    boxes.forEach((box, index) => {
      if (box.bins.length > 1 && (best < 0 || box.score > (boxes[best]?.score ?? 0))) best = index
    })
    const box = boxes[best]
    if (!box) break // todas as caixas têm uma cor só
    boxes.splice(best, 1, ...splitBox(box, counts))
  }

  const lookup = new Uint8Array(BIN_COUNT)
  const colors = boxes.map((box, index): Rgb => {
    const total = [0, 0, 0]
    for (const bin of box.bins) {
      lookup[bin] = index
      for (let channel = 0; channel < 3; channel += 1) total[channel] = (total[channel] ?? 0) + (sums[bin * 3 + channel] ?? 0)
    }
    const [r = 0, g = 0, b = 0] = total.map((sum) => Math.round(sum / box.count))
    return [r, g, b]
  })
  return { colors, hasTransparency, indexOf: (r, g, b) => lookup[binOf(r, g, b)] ?? 0 }
}

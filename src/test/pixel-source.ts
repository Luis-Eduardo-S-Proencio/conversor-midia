import type { PixelSource } from '../core/image/encode/pixels'

type Rgba = [number, number, number, number]

/** RGBA linha a linha a partir de uma função por pixel. */
export function rgbaOf(width: number, height: number, color: (x: number, y: number) => Rgba): number[] {
  const out: number[] = []
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) out.push(...color(x, y))
  return out
}

/** Imagem em memória para testar os codificadores; registra as faixas de linhas lidas. */
export function pixelSource(width: number, height: number, rgba: ArrayLike<number>) {
  const data = Uint8ClampedArray.from(rgba)
  if (data.length !== width * height * 4) throw new Error('O RGBA não tem o tamanho da imagem')
  const reads: Array<[y: number, rows: number]> = []
  const source: PixelSource = {
    width,
    height,
    readRows: (y, rows) => {
      reads.push([y, rows])
      return data.slice(y * width * 4, (y + rows) * width * 4)
    },
  }
  return { source, reads }
}

/** Ruído determinístico (xorshift32) para imagens com muitas cores. */
export function noise(seed = 2_463_534_242) {
  let state = seed
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4_294_967_296
  }
}

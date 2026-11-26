import { describe, expect, it } from 'vitest'
import {
  COLLAGE_MAX_SIDE,
  COLLAGE_MIN_SIDE,
  DEFAULT_COLLAGE_STYLE,
  DEFAULT_FRAMING,
  cellRects,
  clampPlacement,
  collageLongSide,
  coverCrop,
  frameSize,
  gapPixels,
  layoutsFor,
  normalizeColor,
  panFraming,
  planCollage,
  resolveLayout,
  scatterPlacements,
  zoomFraming,
  type CollagePhoto,
  type CollageSpec,
  type PixelRect,
} from './collage'

const area = (rect: { width: number; height: number }) => rect.width * rect.height

function overlaps(a: PixelRect, b: PixelRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

const photo = (width: number, height: number, overrides: Partial<CollagePhoto> = {}): CollagePhoto => ({
  width,
  height,
  framing: DEFAULT_FRAMING,
  placement: { x: 0.5, y: 0.5, width: 0.5, rotation: 0 },
  ...overrides,
})

const spec = (photos: CollagePhoto[], overrides: Partial<CollageSpec> = {}): CollageSpec => ({
  mode: 'grid',
  ratio: '1:1',
  photos,
  style: { ...DEFAULT_COLLAGE_STYLE, spacing: 0, radius: 0 },
  ...overrides,
})

describe('layouts da grade', () => {
  it('de 2 a 9 fotos há pelo menos 3 modelos, cada um com um espaço por foto e nomes distintos', () => {
    for (let count = 2; count <= 9; count += 1) {
      const layouts = layoutsFor(count)
      expect(layouts.length, `${count} fotos`).toBeGreaterThanOrEqual(3)
      for (const layout of layouts) expect(layout.cells, layout.id).toHaveLength(count)
      expect(new Set(layouts.map((layout) => layout.name)).size).toBe(layouts.length)
    }
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((count) => layoutsFor(count).map((layout) => layout.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('os espaços de cada modelo cobrem o quadro inteiro, sem sobrepor (sem borda)', () => {
    const frame = { width: 1200, height: 1200 }
    for (let count = 1; count <= 9; count += 1) {
      for (const layout of layoutsFor(count)) {
        const rects = cellRects(layout, frame, 0)
        expect(rects.reduce((sum, rect) => sum + area(rect), 0), layout.id).toBe(area(frame))
        rects.forEach((rect, index) => rects.slice(index + 1).forEach((other) => expect(overlaps(rect, other), layout.id).toBe(false)))
      }
    }
  })

  it('fora de 1 a 9 fotos não há modelo; um modelo que não serve dá lugar ao primeiro que serve', () => {
    expect(layoutsFor(0)).toEqual([])
    expect(layoutsFor(10)).toEqual([])
    expect(resolveLayout(3, '3-direita')?.id).toBe('3-direita')
    expect(resolveLayout(3, '2-lado')?.id).toBe(layoutsFor(3)[0]?.id)
    expect(resolveLayout(3, undefined)?.id).toBe(layoutsFor(3)[0]?.id)
  })
})

describe('borda da grade', () => {
  it('tem a mesma espessura em volta e entre as fotos', () => {
    const [layout] = layoutsFor(4) // 2 × 2
    if (!layout) throw new Error('sem layout')
    const rects = cellRects(layout, { width: 1000, height: 1000 }, 40)
    expect(rects).toEqual([
      { x: 40, y: 40, width: 440, height: 440 },
      { x: 520, y: 40, width: 440, height: 440 },
      { x: 40, y: 520, width: 440, height: 440 },
      { x: 520, y: 520, width: 440, height: 440 },
    ])
  })

  it('vem do controle (0 a 100) em proporção ao lado menor do quadro', () => {
    expect(gapPixels({ width: 2048, height: 1152 }, 0)).toBe(0)
    expect(gapPixels({ width: 2048, height: 1152 }, 100)).toBe(Math.round(1152 * 0.06))
    expect(gapPixels({ width: 2048, height: 1152 }, 150)).toBe(gapPixels({ width: 2048, height: 1152 }, 100))
  })
})

describe('quadro', () => {
  it('tem a proporção escolhida, com o maior lado pedido e lados pares', () => {
    expect(frameSize('1:1', 2048)).toEqual({ width: 2048, height: 2048 })
    expect(frameSize('4:5', 2048)).toEqual({ width: 1638, height: 2048 })
    expect(frameSize('9:16', 2048)).toEqual({ width: 1152, height: 2048 })
    expect(frameSize('16:9', 2048)).toEqual({ width: 2048, height: 1152 })
    expect(frameSize('3:4', 1080)).toEqual({ width: 810, height: 1080 })
  })

  it('cresce até a foto mais detalhada aparecer sem ampliar, entre 1080 e 2048 px', () => {
    // Duas fotos em pé de 600 × 1200 lado a lado, cada uma em meio quadro: 1200 px bastam, sem ampliar.
    expect(collageLongSide(spec([photo(600, 1200), photo(600, 1200)], { layoutId: '2-lado' }))).toBe(1200)
    // Fotos pequenas: não desce abaixo de 1080 px.
    expect(collageLongSide(spec([photo(200, 200), photo(200, 200)]))).toBe(COLLAGE_MIN_SIDE)
    // Fotos de 12 MP: para em 2048 px.
    expect(collageLongSide(spec([photo(4000, 3000), photo(4000, 3000)]))).toBe(COLLAGE_MAX_SIDE)
    // Estilo livre: a foto de 900 px ocupando metade da largura pede 1800 px.
    expect(collageLongSide(spec([photo(900, 600), photo(300, 300)], { mode: 'free' }))).toBe(1800)
  })
})

describe('enquadramento na grade', () => {
  it('a parte que aparece tem a proporção do espaço e fica centralizada', () => {
    expect(coverCrop({ width: 400, height: 200 }, { width: 100, height: 100 }, DEFAULT_FRAMING)).toEqual({ x: 100, y: 0, width: 200, height: 200 })
    expect(coverCrop({ width: 200, height: 400 }, { width: 100, height: 50 }, DEFAULT_FRAMING)).toEqual({ x: 0, y: 150, width: 200, height: 100 })
  })

  it('o zoom aproxima e o centro pedido nunca leva a parte para fora da foto', () => {
    expect(coverCrop({ width: 400, height: 400 }, { width: 100, height: 100 }, { focusX: 0.5, focusY: 0.5, zoom: 2 })).toEqual({ x: 100, y: 100, width: 200, height: 200 })
    expect(coverCrop({ width: 400, height: 400 }, { width: 100, height: 100 }, { focusX: 0, focusY: 1, zoom: 2 })).toEqual({ x: 0, y: 200, width: 200, height: 200 })
    expect(coverCrop({ width: 400, height: 400 }, { width: 100, height: 100 }, { focusX: 0.5, focusY: 0.5, zoom: 9 }).width).toBe(100)
  })

  it('arrastar move a foto junto com o dedo e para na borda dela', () => {
    const image = { width: 400, height: 200 }
    const cell = { width: 100, height: 100 } // aparece 200 × 200 da foto, escala 0,5
    const moved = panFraming(image, cell, DEFAULT_FRAMING, 25, 0) // 25 px no quadro = 50 px na foto
    expect(coverCrop(image, cell, moved).x).toBe(50)
    const far = panFraming(image, cell, DEFAULT_FRAMING, -500, 0)
    expect(coverCrop(image, cell, far).x).toBe(200)
    expect(far.focusX).toBe(0.75) // o centro guardado é o que de fato aparece
  })

  it('aproximar mantém o centro que aparece', () => {
    const image = { width: 400, height: 400 }
    const cell = { width: 100, height: 100 }
    const zoomed = zoomFraming(image, cell, { focusX: 0.3, focusY: 0.5, zoom: 1 }, 2)
    expect(zoomed).toEqual({ focusX: 0.5, focusY: 0.5, zoom: 2 }) // em zoom 1 a foto toda aparecia: o centro era o meio
    expect(zoomFraming(image, cell, zoomed, 0.2).zoom).toBe(1)
  })
})

describe('estilo livre', () => {
  it('espalha as fotos dentro do quadro, sem repetir lugar, com giros pequenos', () => {
    const photos = [1, 2, 3, 4, 5].map((index) => ({ width: 1000 + index * 100, height: 800 }))
    const placements = scatterPlacements(photos, '1:1')
    expect(placements).toHaveLength(5)
    for (const placement of placements) {
      expect(placement.x).toBeGreaterThan(0)
      expect(placement.x).toBeLessThan(1)
      expect(placement.y).toBeGreaterThan(0)
      expect(placement.y).toBeLessThan(1)
      expect(Math.abs(placement.rotation)).toBeLessThanOrEqual(7)
      expect(placement.width).toBeLessThan(0.6)
    }
    expect(new Set(placements.map((placement) => `${placement.x}:${placement.y}`)).size).toBe(5)
    expect(scatterPlacements(photos, '1:1')).toEqual(placements) // sempre igual: nada de sorteio
  })

  it('quadro em pé tem mais linhas; deitado, mais colunas', () => {
    const photos = [1, 2].map(() => ({ width: 1000, height: 1000 }))
    const [first, second] = scatterPlacements(photos, '9:16')
    expect(first?.x).toBe(second?.x)
    const [left, right] = scatterPlacements(photos, '16:9')
    expect(left?.y).toBe(right?.y)
  })

  it('o centro fica dentro do quadro, a largura nos limites e o giro entre −180° e 180°', () => {
    expect(clampPlacement({ x: -0.2, y: 1.4, width: 3, rotation: 200 })).toEqual({ x: 0, y: 1, width: 1.4, rotation: -160 })
    expect(clampPlacement({ x: 0.5, y: 0.5, width: 0.01, rotation: -190 })).toEqual({ x: 0.5, y: 0.5, width: 0.08, rotation: 170 })
  })
})

describe('plano da colagem', () => {
  it('grade: cada foto no seu espaço, com cantos limitados à metade do espaço', () => {
    const plan = planCollage(spec([photo(1000, 1000), photo(1000, 500)], { layoutId: '2-lado', style: { ...DEFAULT_COLLAGE_STYLE, spacing: 0, radius: 100 } }), 1000)
    expect(plan).toMatchObject({ width: 1000, height: 1000, background: '#ffffff' })
    expect(plan.pieces).toHaveLength(2)
    expect(plan.pieces[0]?.box).toEqual({ cx: 250, cy: 500, width: 500, height: 1000, rotation: 0 })
    expect(plan.pieces[1]?.source).toEqual({ x: 375, y: 0, width: 250, height: 500 })
    expect(plan.pieces[0]?.radius).toBe(80) // 8% de 1000
    expect(plan.shadow).toBeUndefined()
  })

  it('livre: medidas pela largura e proporção da foto, moldura e sombra conforme o estilo', () => {
    const plan = planCollage(
      spec([photo(800, 400, { placement: { x: 0.25, y: 0.5, width: 0.4, rotation: 10 } })], {
        mode: 'free',
        style: { spacing: 100, radius: 0, color: '#000000', shadow: true },
      }),
      1000,
    )
    expect(plan.pieces[0]?.box).toEqual({ cx: 250, cy: 500, width: 400, height: 200, rotation: 10 })
    expect(plan.pieces[0]?.border).toBe(35)
    expect(plan.pieces[0]?.source).toEqual({ x: 0, y: 0, width: 800, height: 400 })
    expect(plan.shadow).toMatchObject({ blur: 24, offsetY: 8 })
    expect(plan.background).toBe('#000000')
  })

  it('cor fora do formato #rrggbb vira branco', () => {
    expect(normalizeColor('#FF6699')).toBe('#ff6699')
    expect(normalizeColor('red')).toBe('#ffffff')
    expect(normalizeColor('#fff')).toBe('#ffffff')
  })
})

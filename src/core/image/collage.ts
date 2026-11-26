/**
 * Colagem: os layouts da grade, o tamanho do quadro, as bordas, o enquadramento de cada foto e a
 * disposição do estilo livre. A tela (prévia) e o Worker (arquivo) usam o mesmo plano, em pixels do
 * arquivo final: o que a pessoa vê é o que sai.
 */

export const COLLAGE_LIMITS = { minPhotos: 2, maxPhotos: 9 } as const

/** Maior lado do arquivo: nunca acima de 2048 px, nem abaixo de 1080 px (o que as redes sociais mostram). */
export const COLLAGE_MAX_SIDE = 2048
export const COLLAGE_MIN_SIDE = 1080

export type CollageMode = 'grid' | 'free'

export type CollageRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export const COLLAGE_RATIOS: readonly { value: CollageRatio; width: number; height: number }[] = [
  { value: '1:1', width: 1, height: 1 },
  { value: '4:5', width: 4, height: 5 },
  { value: '3:4', width: 3, height: 4 },
  { value: '9:16', width: 9, height: 16 },
  { value: '16:9', width: 16, height: 9 },
]

export interface Size {
  width: number
  height: number
}

/** Retângulo em frações do quadro (0 a 1). */
export interface UnitRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface GridLayout {
  id: string
  /** Nome para o leitor de tela e a dica ("Grande à esquerda"). */
  name: string
  cells: readonly UnitRect[]
}

/* Montagem dos layouts: linhas com pesos, cada uma com colunas de pesos (ou o contrário, transposto). */

type RowSpec = readonly [weight: number, columns: readonly number[]]

function rows(spec: readonly RowSpec[]): UnitRect[] {
  const total = spec.reduce((sum, [weight]) => sum + weight, 0)
  const cells: UnitRect[] = []
  let y = 0
  for (const [weight, columns] of spec) {
    const height = weight / total
    const columnTotal = columns.reduce((sum, value) => sum + value, 0)
    let x = 0
    for (const column of columns) {
      const width = column / columnTotal
      cells.push({ x, y, width, height })
      x += width
    }
    y += height
  }
  return cells
}

/** As mesmas faixas, em colunas: troca x por y. */
function columns(spec: readonly RowSpec[]): UnitRect[] {
  return rows(spec).map(({ x, y, width, height }) => ({ x: y, y: x, width: height, height: width }))
}

const third = 1 / 3

const LAYOUTS: Record<number, readonly GridLayout[]> = {
  1: [{ id: '1', name: 'Uma foto', cells: rows([[1, [1]]]) }],
  2: [
    { id: '2-lado', name: 'Lado a lado', cells: rows([[1, [1, 1]]]) },
    { id: '2-pilha', name: 'Uma sobre a outra', cells: rows([[1, [1]], [1, [1]]]) },
    { id: '2-esquerda', name: 'Grande à esquerda', cells: rows([[1, [2, 1]]]) },
    { id: '2-cima', name: 'Grande em cima', cells: rows([[2, [1]], [1, [1]]]) },
  ],
  3: [
    { id: '3-colunas', name: 'Três colunas', cells: rows([[1, [1, 1, 1]]]) },
    { id: '3-faixas', name: 'Três faixas', cells: rows([[1, [1]], [1, [1]], [1, [1]]]) },
    { id: '3-esquerda', name: 'Grande à esquerda', cells: columns([[1, [1]], [1, [1, 1]]]) },
    { id: '3-direita', name: 'Grande à direita', cells: columns([[1, [1, 1]], [1, [1]]]) },
    { id: '3-cima', name: 'Grande em cima', cells: rows([[1, [1]], [1, [1, 1]]]) },
    { id: '3-baixo', name: 'Grande embaixo', cells: rows([[1, [1, 1]], [1, [1]]]) },
  ],
  4: [
    { id: '4-quadrado', name: 'Quatro iguais', cells: rows([[1, [1, 1]], [1, [1, 1]]]) },
    { id: '4-cima', name: 'Grande em cima', cells: rows([[2, [1]], [1, [1, 1, 1]]]) },
    { id: '4-esquerda', name: 'Grande à esquerda', cells: columns([[2, [1]], [1, [1, 1, 1]]]) },
    { id: '4-baixo', name: 'Grande embaixo', cells: rows([[1, [1, 1, 1]], [2, [1]]]) },
    { id: '4-colunas', name: 'Quatro colunas', cells: rows([[1, [1, 1, 1, 1]]]) },
    { id: '4-faixas', name: 'Quatro faixas', cells: columns([[1, [1, 1, 1, 1]]]) },
  ],
  5: [
    { id: '5-duas-tres', name: 'Duas em cima e três embaixo', cells: rows([[1, [1, 1]], [1, [1, 1, 1]]]) },
    { id: '5-tres-duas', name: 'Três em cima e duas embaixo', cells: rows([[1, [1, 1, 1]], [1, [1, 1]]]) },
    { id: '5-esquerda', name: 'Grande à esquerda', cells: columns([[2, [1]], [1, [1, 1]], [1, [1, 1]]]) },
    { id: '5-cima', name: 'Grande em cima', cells: rows([[2, [1]], [1, [1, 1, 1, 1]]]) },
    { id: '5-colunas', name: 'Duas à esquerda e três à direita', cells: columns([[1, [1, 1]], [1, [1, 1, 1]]]) },
  ],
  6: [
    { id: '6-tres-duas', name: 'Três colunas e duas linhas', cells: rows([[1, [1, 1, 1]], [1, [1, 1, 1]]]) },
    { id: '6-duas-tres', name: 'Duas colunas e três linhas', cells: rows([[1, [1, 1]], [1, [1, 1]], [1, [1, 1]]]) },
    {
      id: '6-destaque',
      name: 'Destaque no canto',
      cells: [
        { x: 0, y: 0, width: 2 * third, height: 2 * third },
        { x: 2 * third, y: 0, width: third, height: third },
        { x: 2 * third, y: third, width: third, height: third },
        { x: 0, y: 2 * third, width: third, height: third },
        { x: third, y: 2 * third, width: third, height: third },
        { x: 2 * third, y: 2 * third, width: third, height: third },
      ],
    },
    { id: '6-mosaico', name: 'Mosaico', cells: rows([[1, [2, 1]], [1, [1, 1]], [1, [1, 2]]]) },
  ],
  7: [
    { id: '7-tres-quatro', name: 'Três em cima e quatro embaixo', cells: rows([[1, [1, 1, 1]], [1, [1, 1, 1, 1]]]) },
    { id: '7-mosaico', name: 'Duas, três e duas', cells: rows([[1, [1, 1]], [1, [1, 1, 1]], [1, [1, 1]]]) },
    { id: '7-esquerda', name: 'Grande à esquerda', cells: columns([[2, [1]], [1, [1, 1, 1]], [1, [1, 1, 1]]]) },
    { id: '7-cima', name: 'Grande em cima', cells: rows([[2, [1]], [1, [1, 1, 1]], [1, [1, 1, 1]]]) },
  ],
  8: [
    { id: '8-quatro-duas', name: 'Quatro colunas e duas linhas', cells: rows([[1, [1, 1, 1, 1]], [1, [1, 1, 1, 1]]]) },
    { id: '8-duas-quatro', name: 'Duas colunas e quatro linhas', cells: rows([[1, [1, 1]], [1, [1, 1]], [1, [1, 1]], [1, [1, 1]]]) },
    { id: '8-mosaico', name: 'Três, duas e três', cells: rows([[1, [1, 1, 1]], [1, [1, 1]], [1, [1, 1, 1]]]) },
    { id: '8-cima', name: 'Duas grandes em cima', cells: rows([[2, [1, 1]], [1, [1, 1, 1]], [1, [1, 1, 1]]]) },
  ],
  9: [
    { id: '9-tres-tres', name: 'Três por três', cells: rows([[1, [1, 1, 1]], [1, [1, 1, 1]], [1, [1, 1, 1]]]) },
    { id: '9-meio', name: 'Destaque no meio', cells: rows([[1, [1, 1, 1, 1]], [2, [1]], [1, [1, 1, 1, 1]]]) },
    { id: '9-escada', name: 'Escada', cells: rows([[2, [1, 1]], [1, [1, 1, 1]], [1, [1, 1, 1, 1]]]) },
  ],
}

/** Layouts da grade para este número de fotos (vazio fora de 1 a 9). */
export function layoutsFor(count: number): readonly GridLayout[] {
  return LAYOUTS[count] ?? []
}

/** O layout pedido, se servir para este número de fotos; senão, o primeiro que serve. */
export function resolveLayout(count: number, id: string | undefined): GridLayout | undefined {
  const options = layoutsFor(count)
  return options.find((layout) => layout.id === id) ?? options[0]
}

/** Medidas do quadro com o maior lado pedido, na proporção escolhida (lados inteiros e pares). */
export function frameSize(ratio: CollageRatio, longSide: number): Size {
  const { width, height } = COLLAGE_RATIOS.find((option) => option.value === ratio) ?? { width: 1, height: 1 }
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2)
  return width >= height
    ? { width: even(longSide), height: even((longSide * height) / width) }
    : { width: even((longSide * width) / height), height: even(longSide) }
}

/* Estilo: os controles vão de 0 a 100 e viram pixels proporcionais ao lado menor do quadro. */

export interface CollageStyle {
  /** Grade: espaço entre as fotos e em volta. Livre: moldura em volta de cada foto. */
  spacing: number
  /** Cantos arredondados. */
  radius: number
  /** Cor do fundo (na grade, a cor da borda), em #rrggbb. */
  color: string
  /** Estilo livre: sombra embaixo das fotos. */
  shadow: boolean
}

export const DEFAULT_COLLAGE_STYLE: CollageStyle = { spacing: 24, radius: 16, color: '#ffffff', shadow: true }

/** Proporções máximas, em relação ao lado menor do quadro. */
const MAX_GAP = 0.06
const MAX_FRAME = 0.035
const MAX_RADIUS = 0.08

const level = (value: number) => Math.min(100, Math.max(0, value)) / 100

export function gapPixels(frame: Size, spacing: number): number {
  return Math.round(level(spacing) * MAX_GAP * Math.min(frame.width, frame.height))
}

export function framePixels(frame: Size, spacing: number): number {
  return Math.round(level(spacing) * MAX_FRAME * Math.min(frame.width, frame.height))
}

export function radiusPixels(frame: Size, radius: number): number {
  return Math.round(level(radius) * MAX_RADIUS * Math.min(frame.width, frame.height))
}

const EDGE = 1e-6

/**
 * Onde cada espaço da grade fica no quadro, em pixels. A borda tem a mesma espessura em volta e entre
 * as fotos: a área útil perde `gap` em cada lado, e cada borda interna é dividida entre os vizinhos.
 * As pontas são arredondadas uma vez só, então vizinhos nunca se sobrepõem nem deixam fresta.
 */
export function cellRects(layout: GridLayout, frame: Size, gap: number): PixelRect[] {
  const area = { x: gap, y: gap, width: frame.width - 2 * gap, height: frame.height - 2 * gap }
  return layout.cells.map((cell) => {
    const inner = (start: boolean, atEdge: boolean) => (atEdge ? 0 : (start ? 1 : -1) * (gap / 2))
    const left = Math.round(area.x + cell.x * area.width + inner(true, cell.x < EDGE))
    const right = Math.round(area.x + (cell.x + cell.width) * area.width + inner(false, cell.x + cell.width > 1 - EDGE))
    const top = Math.round(area.y + cell.y * area.height + inner(true, cell.y < EDGE))
    const bottom = Math.round(area.y + (cell.y + cell.height) * area.height + inner(false, cell.y + cell.height > 1 - EDGE))
    return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }
  })
}

/* Enquadramento de uma foto num espaço da grade: preenche o espaço (como "cover"), com ponto central e zoom. */

export interface Framing {
  /** Ponto da foto que fica no centro do espaço, em frações da foto (0 a 1). */
  focusX: number
  focusY: number
  /** 1 = a foto só cobre o espaço; até 4 = aproximada. */
  zoom: number
}

export const DEFAULT_FRAMING: Framing = { focusX: 0.5, focusY: 0.5, zoom: 1 }
export const MAX_ZOOM = 4

/** Parte da foto (em pixels dela) que aparece no espaço. Sempre dentro da foto e na proporção do espaço. */
export function coverCrop(photo: Size, cell: Size, framing: Framing): PixelRect {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, framing.zoom))
  const scale = Math.max(cell.width / photo.width, cell.height / photo.height) * zoom
  const width = Math.min(photo.width, cell.width / scale)
  const height = Math.min(photo.height, cell.height / scale)
  const clamp = (center: number, size: number, total: number) => Math.min(total - size, Math.max(0, center - size / 2))
  return {
    x: clamp(framing.focusX * photo.width, width, photo.width),
    y: clamp(framing.focusY * photo.height, height, photo.height),
    width,
    height,
  }
}

/** O enquadramento com o centro que de fato aparece (o pedido pode passar da borda da foto). */
function framingOf(photo: Size, crop: PixelRect, zoom: number): Framing {
  return { focusX: (crop.x + crop.width / 2) / photo.width, focusY: (crop.y + crop.height / 2) / photo.height, zoom }
}

/** Arrastar a foto dentro do espaço: `dx` e `dy` em pixels do quadro. A foto acompanha o dedo. */
export function panFraming(photo: Size, cell: Size, framing: Framing, dx: number, dy: number): Framing {
  const crop = coverCrop(photo, cell, framing)
  const scale = cell.width / crop.width
  const moved = coverCrop(photo, cell, {
    ...framing,
    focusX: (crop.x + crop.width / 2 - dx / scale) / photo.width,
    focusY: (crop.y + crop.height / 2 - dy / scale) / photo.height,
  })
  return framingOf(photo, moved, framing.zoom)
}

/** Aproximar ou afastar mantendo o centro que aparece. */
export function zoomFraming(photo: Size, cell: Size, framing: Framing, zoom: number): Framing {
  const nextZoom = Math.min(MAX_ZOOM, Math.max(1, zoom))
  const current = coverCrop(photo, cell, framing)
  const centered = framingOf(photo, current, nextZoom)
  return framingOf(photo, coverCrop(photo, cell, centered), nextZoom)
}

/* Estilo livre: cada foto tem centro, largura e giro; a altura segue a proporção da foto. */

export interface FreePlacement {
  /** Centro da foto, em frações do quadro. */
  x: number
  y: number
  /** Largura da foto (sem a moldura), em fração da largura do quadro. */
  width: number
  /** Giro, em graus (sentido horário). */
  rotation: number
}

export const FREE_LIMITS = { minWidth: 0.08, maxWidth: 1.4 } as const

/** Giros leves e variados, sempre os mesmos: dão o ar de fotos espalhadas sobre a mesa. */
const SCATTER = [-6, 5, -3, 7, -5, 3, -7, 4, -2] as const

/**
 * Fotos espalhadas numa grade invisível, um pouco maiores que o espaço de cada uma (sobrepõem de leve),
 * com giros pequenos. A última linha fica centralizada quando tem menos fotos.
 */
export function scatterPlacements(photos: readonly Size[], ratio: CollageRatio): FreePlacement[] {
  const count = photos.length
  if (count === 0) return []
  const frame = frameSize(ratio, 1000)
  const aspect = frame.width / frame.height
  // Mais colunas em quadro deitado, mais linhas em quadro em pé.
  const cols = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * aspect))))
  const rowCount = Math.ceil(count / cols)
  const cellWidth = 1 / cols
  const cellHeight = 1 / rowCount
  return photos.map((photo, index) => {
    const row = Math.floor(index / cols)
    const inRow = row === rowCount - 1 ? count - row * cols : cols
    const column = index - row * cols
    const offset = (cols - inRow) / 2
    // Cabe no espaço (com folga), depois cresce 12% para as fotos se tocarem.
    const byWidth = cellWidth * 0.84
    const byHeight = ((cellHeight * 0.84) / aspect) * (photo.width / photo.height)
    return {
      x: (column + offset + 0.5) * cellWidth,
      y: (row + 0.5) * cellHeight,
      width: Math.min(byWidth, byHeight) * 1.12,
      rotation: SCATTER[index % SCATTER.length] ?? 0,
    }
  })
}

/** Mantém o centro da foto dentro do quadro e a largura nos limites. */
export function clampPlacement(placement: FreePlacement): FreePlacement {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const rotation = ((((placement.rotation + 180) % 360) + 360) % 360) - 180
  return {
    x: clamp(placement.x, 0, 1),
    y: clamp(placement.y, 0, 1),
    width: clamp(placement.width, FREE_LIMITS.minWidth, FREE_LIMITS.maxWidth),
    rotation,
  }
}

/* Plano final: o quadro e cada peça em pixels do arquivo. */

export interface CollagePhoto extends Size {
  framing: Framing
  placement: FreePlacement
}

export interface CollageSpec {
  mode: CollageMode
  ratio: CollageRatio
  /** Layout da grade (ignorado no estilo livre). */
  layoutId?: string
  /** Na grade, na ordem dos espaços; no estilo livre, de baixo para cima. */
  photos: readonly CollagePhoto[]
  style: CollageStyle
}

export interface PlannedPiece {
  /** Posição desta foto em `spec.photos`. */
  index: number
  /** Retângulo da foto no quadro (sem a moldura), girado em torno do centro. */
  box: { cx: number; cy: number; width: number; height: number; rotation: number }
  radius: number
  /** Moldura branca em volta da foto (estilo livre), em pixels. */
  border: number
  /** Parte da foto que aparece, em pixels da foto; a foto inteira no estilo livre. */
  source: PixelRect
}

export interface CollageShadow {
  blur: number
  offsetY: number
  color: string
}

export interface CollagePlan extends Size {
  background: string
  pieces: PlannedPiece[]
  shadow?: CollageShadow
}

export const FREE_FRAME_COLOR = '#ffffff'

/**
 * Maior lado em que a foto mais detalhada aparece no tamanho natural (sem ampliar), entre 1080 e 2048 px:
 * fotos pequenas não viram um arquivo grande à toa, e fotos grandes não passam do limite.
 */
export function collageLongSide(spec: CollageSpec): number {
  const unit = frameSize(spec.ratio, 1)
  const shape = { width: unit.width / Math.max(unit.width, unit.height), height: unit.height / Math.max(unit.width, unit.height) }
  let needed = 0
  if (spec.mode === 'grid') {
    const layout = resolveLayout(spec.photos.length, spec.layoutId)
    layout?.cells.forEach((cell, index) => {
      const photo = spec.photos[index]
      if (!photo) return
      const perSide = Math.max((cell.width * shape.width) / photo.width, (cell.height * shape.height) / photo.height) * photo.framing.zoom
      needed = Math.max(needed, 1 / perSide)
    })
  } else {
    for (const photo of spec.photos) needed = Math.max(needed, photo.width / (photo.placement.width * shape.width))
  }
  return Math.round(Math.min(COLLAGE_MAX_SIDE, Math.max(COLLAGE_MIN_SIDE, needed || COLLAGE_MIN_SIDE)))
}

/** O plano da colagem: medidas do arquivo e, para cada foto, onde ela entra e que parte dela aparece. */
export function planCollage(spec: CollageSpec, longSide = collageLongSide(spec)): CollagePlan {
  const frame = frameSize(spec.ratio, longSide)
  const radius = radiusPixels(frame, spec.style.radius)
  const base = { ...frame, background: spec.style.color }

  if (spec.mode === 'grid') {
    const layout = resolveLayout(spec.photos.length, spec.layoutId)
    if (!layout) return { ...base, pieces: [] }
    const rects = cellRects(layout, frame, gapPixels(frame, spec.style.spacing))
    const pieces = rects.flatMap((rect, index) => {
      const photo = spec.photos[index]
      if (!photo) return []
      return [
        {
          index,
          box: { cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, width: rect.width, height: rect.height, rotation: 0 },
          radius: Math.min(radius, rect.width / 2, rect.height / 2),
          border: 0,
          source: coverCrop(photo, rect, photo.framing),
        },
      ]
    })
    return { ...base, pieces }
  }

  const border = framePixels(frame, spec.style.spacing)
  const pieces = spec.photos.map((photo, index) => {
    const width = photo.placement.width * frame.width
    const height = (width * photo.height) / photo.width
    return {
      index,
      box: { cx: photo.placement.x * frame.width, cy: photo.placement.y * frame.height, width, height, rotation: photo.placement.rotation },
      radius: Math.min(radius, width / 2, height / 2),
      border,
      source: { x: 0, y: 0, width: photo.width, height: photo.height },
    }
  })
  const short = Math.min(frame.width, frame.height)
  const shadow = spec.style.shadow ? { blur: Math.round(short * 0.024), offsetY: Math.round(short * 0.008), color: 'rgba(0, 0, 0, 0.35)' } : undefined
  return { ...base, pieces, shadow }
}

/** Raio da moldura (estilo livre): acompanha o da foto, somado à espessura, para as curvas ficarem paralelas. */
export function outerRadius(piece: PlannedPiece): number {
  return piece.radius > 0 ? piece.radius + piece.border : 0
}

/** Cores prontas para o fundo e a borda (a pessoa também pode escolher outra). */
export const COLLAGE_COLORS: readonly { value: string; name: string }[] = [
  { value: '#ffffff', name: 'Branco' },
  { value: '#000000', name: 'Preto' },
  { value: '#f4ede4', name: 'Areia' },
  { value: '#2b2b30', name: 'Grafite' },
  { value: '#ff6699', name: 'Rosa' },
  { value: '#ffd166', name: 'Amarelo' },
  { value: '#8ecae6', name: 'Azul' },
  { value: '#b8e0a8', name: 'Verde' },
  { value: '#c9b6ff', name: 'Lilás' },
]

/** Cor válida para o arquivo (#rrggbb); qualquer outra coisa vira branco. */
export function normalizeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#ffffff'
}

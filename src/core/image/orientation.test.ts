import { describe, expect, it } from 'vitest'
import {
  ORIENTATION_STEPS,
  UPRIGHT,
  applyStep,
  describeOrientation,
  isUpright,
  orientationCss,
  orientationMatrix,
  orientedDimensions,
  type Orientation,
  type OrientationStep,
} from './orientation'

type Grid = string[][]

/* Referência independente: as operações feitas à mão numa grade de rótulos (linha y, coluna x). */
const rotateRight = (grid: Grid): Grid => (grid[0] ?? []).map((_, column) => grid.map((row) => row[column] ?? '?').reverse())
const rotateLeft = (grid: Grid): Grid => rotateRight(rotateRight(rotateRight(grid)))
const flipHorizontal = (grid: Grid): Grid => grid.map((row) => [...row].reverse())
const flipVertical = (grid: Grid): Grid => [...grid].reverse()

const BY_HAND: Record<OrientationStep, (grid: Grid) => Grid> = {
  'rotate-left': rotateLeft,
  'rotate-right': rotateRight,
  'flip-horizontal': flipHorizontal,
  'flip-vertical': flipVertical,
}

/** O que o Worker faz: leva o centro de cada pixel pela matriz do canvas, nas medidas calculadas. */
function byMatrix(grid: Grid, orientation: Orientation): Grid {
  const source = { width: grid[0]?.length ?? 0, height: grid.length }
  const { width, height } = orientedDimensions(source, orientation)
  const [a, b, c, d, e, f] = orientationMatrix(orientation, source)
  const out: Grid = Array.from({ length: height }, () => Array<string>(width).fill('?'))
  grid.forEach((row, y) =>
    row.forEach((label, x) => {
      const [cx, cy] = [x + 0.5, y + 0.5]
      const target = out[Math.floor(b * cx + d * cy + f)]
      if (target) target[Math.floor(a * cx + c * cy + e)] = label
    }),
  )
  return out
}

/** Todas as sequências de até três cliques: 1 + 4 + 16 + 64. */
function sequences(maxLength: number): OrientationStep[][] {
  let level: OrientationStep[][] = [[]]
  const all = [...level]
  for (let length = 1; length <= maxLength; length += 1) {
    level = level.flatMap((sequence) => ORIENTATION_STEPS.map((step) => [...sequence, step]))
    all.push(...level)
  }
  return all
}

// 3 × 2, com rótulos únicos: largura diferente da altura revela medidas trocadas por engano.
const GRID: Grid = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
]

describe('orientação', () => {
  it('qualquer sequência de cliques dá o mesmo resultado que fazer cada operação à mão', () => {
    const all = sequences(3)
    expect(all).toHaveLength(85)
    for (const steps of all) {
      const expected = steps.reduce((grid, step) => BY_HAND[step](grid), GRID)
      const orientation = steps.reduce(applyStep, UPRIGHT)
      expect(byMatrix(GRID, orientation), steps.join(' → ') || 'nenhum clique').toEqual(expected)
    }
  })

  it('as sequências chegam às 8 orientações possíveis (4 giros, espelhada ou não)', () => {
    const reached = new Set(sequences(3).map((steps) => JSON.stringify(steps.reduce(applyStep, UPRIGHT))))
    expect(reached.size).toBe(8)
  })

  it('desfazer pelo caminho inverso volta à posição original', () => {
    const after = (steps: OrientationStep[]) => steps.reduce(applyStep, UPRIGHT)
    expect(after(['rotate-right', 'rotate-left'])).toEqual(UPRIGHT)
    expect(isUpright(after(['flip-horizontal', 'flip-horizontal']))).toBe(true)
    expect(isUpright(after(['rotate-right']))).toBe(false)
  })

  it('giro de 90° troca largura e altura; 180° e espelhamento não', () => {
    const photo = { width: 4000, height: 3000 }
    expect(orientedDimensions(photo, { quarterTurns: 1, mirrored: false })).toEqual({ width: 3000, height: 4000 })
    expect(orientedDimensions(photo, { quarterTurns: 3, mirrored: true })).toEqual({ width: 3000, height: 4000 })
    expect(orientedDimensions(photo, { quarterTurns: 2, mirrored: true })).toEqual(photo)
  })

  it('a matriz só tem 0, 1 e −1 e deslocamentos inteiros: cada pixel vai para um pixel, sem reamostrar', () => {
    for (const steps of sequences(2)) {
      const matrix = orientationMatrix(steps.reduce(applyStep, UPRIGHT), { width: 64, height: 48 })
      for (const value of matrix) expect(Number.isInteger(value)).toBe(true)
      for (const value of matrix.slice(0, 4)) expect([-1, 0, 1]).toContain(value)
    }
  })

  it('a prévia gira com CSS na mesma ordem do arquivo: primeiro espelha, depois gira', () => {
    expect(orientationCss(UPRIGHT)).toBe('')
    expect(orientationCss({ quarterTurns: 1, mirrored: false })).toBe('rotate(90deg)')
    expect(orientationCss({ quarterTurns: 0, mirrored: true })).toBe('scaleX(-1)')
    expect(orientationCss({ quarterTurns: 3, mirrored: true })).toBe('rotate(270deg) scaleX(-1)')
  })

  it('descreve cada orientação em português', () => {
    const texts = {
      '0,false': 'Na posição original',
      '1,false': 'Girada 90° para a direita',
      '2,false': 'Girada 180°',
      '3,false': 'Girada 90° para a esquerda',
      '0,true': 'Espelhada na horizontal',
      '2,true': 'Espelhada na vertical',
      '1,true': 'Girada 90° para a esquerda e espelhada na horizontal',
      '3,true': 'Girada 90° para a direita e espelhada na horizontal',
    } as const
    for (const [key, text] of Object.entries(texts)) {
      const [turns, mirrored] = key.split(',')
      expect(describeOrientation({ quarterTurns: Number(turns) as Orientation['quarterTurns'], mirrored: mirrored === 'true' })).toBe(text)
    }
  })

  it('girar à direita e depois espelhar é descrito nessa ordem, como a pessoa fez', () => {
    const steps: OrientationStep[] = ['rotate-right', 'flip-horizontal']
    expect(describeOrientation(steps.reduce(applyStep, UPRIGHT))).toBe('Girada 90° para a direita e espelhada na horizontal')
  })

  it('espelhar na vertical é o mesmo que espelhar na horizontal e girar 180°', () => {
    expect(applyStep(UPRIGHT, 'flip-vertical')).toEqual({ quarterTurns: 2, mirrored: true })
    expect(describeOrientation(applyStep(UPRIGHT, 'flip-vertical'))).toBe('Espelhada na vertical')
  })
})

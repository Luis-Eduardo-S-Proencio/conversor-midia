import type { Dimensions } from './resize'

/**
 * Orientação da imagem em giros de 90°: as 8 combinações de 4 giros, espelhada ou não.
 * Forma canônica: primeiro espelha na horizontal (se `mirrored`), depois gira `quarterTurns`
 * quartos de volta no sentido horário. Qualquer sequência de cliques se reduz a ela.
 */
export interface Orientation {
  quarterTurns: 0 | 1 | 2 | 3
  mirrored: boolean
}

export const UPRIGHT: Orientation = { quarterTurns: 0, mirrored: false }

export type OrientationStep = 'rotate-left' | 'rotate-right' | 'flip-horizontal' | 'flip-vertical'

export const ORIENTATION_STEPS: readonly OrientationStep[] = ['rotate-left', 'rotate-right', 'flip-horizontal', 'flip-vertical']

const turns = (value: number) => (((value % 4) + 4) % 4) as Orientation['quarterTurns']

/**
 * Aplica um clique sobre a imagem como ela aparece agora. Espelhar inverte o sentido dos giros já
 * feitos; espelhar na vertical é espelhar na horizontal e girar 180°.
 */
export function applyStep(current: Orientation, step: OrientationStep): Orientation {
  const { quarterTurns, mirrored } = current
  switch (step) {
    case 'rotate-right':
      return { quarterTurns: turns(quarterTurns + 1), mirrored }
    case 'rotate-left':
      return { quarterTurns: turns(quarterTurns - 1), mirrored }
    case 'flip-horizontal':
      return { quarterTurns: turns(-quarterTurns), mirrored: !mirrored }
    case 'flip-vertical':
      return { quarterTurns: turns(2 - quarterTurns), mirrored: !mirrored }
  }
}

export const isUpright = (orientation: Orientation) => orientation.quarterTurns === 0 && !orientation.mirrored

/** Giro de 90° ou 270° troca largura e altura. */
export function orientedDimensions(source: Dimensions, orientation: Orientation): Dimensions {
  return orientation.quarterTurns % 2 === 1 ? { width: source.height, height: source.width } : source
}

/** Matriz do canvas (a, b, c, d, e, f): x' = a·x + c·y + e e y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number]

/**
 * Matriz que leva a imagem de origem (largura × altura) para o canvas já orientado. Só tem 0, 1 e −1 e
 * deslocamentos inteiros: cada pixel cai exatamente em outro, sem reamostragem.
 */
export function orientationMatrix(orientation: Orientation, source: Dimensions): Matrix {
  // Espelhar: x → −x. Cada quarto de volta no sentido horário (y para baixo): (x, y) → (−y, x).
  let [a, b, c, d]: [number, number, number, number] = orientation.mirrored ? [-1, 0, 0, 1] : [1, 0, 0, 1]
  for (let turn = 0; turn < orientation.quarterTurns; turn += 1) [a, b, c, d] = [-b, a, -d, c]
  // Desloca para que o canto mais à esquerda e mais acima da imagem girada caia em (0, 0).
  const e = -(Math.min(0, a * source.width) + Math.min(0, c * source.height))
  const f = -(Math.min(0, b * source.width) + Math.min(0, d * source.height))
  return [a + 0, b + 0, c + 0, d + 0, e + 0, f + 0] // "+ 0" troca −0 por 0
}

/** O mesmo giro em CSS, para a prévia: as funções valem da direita para a esquerda (espelha, depois gira). */
export function orientationCss({ quarterTurns, mirrored }: Orientation): string {
  return [quarterTurns > 0 ? `rotate(${quarterTurns * 90}deg)` : '', mirrored ? 'scaleX(-1)' : ''].filter(Boolean).join(' ')
}

const TURN_TEXT = ['', 'girada 90° para a direita', 'girada 180°', 'girada 90° para a esquerda'] as const

/**
 * Descrição para a interface: "Girada 90° para a direita". Com espelho e giro de 90°, descreve girar
 * primeiro e espelhar depois, a ordem mais comum: espelhar e girar t equivale a girar −t e espelhar.
 */
export function describeOrientation({ quarterTurns, mirrored }: Orientation): string {
  if (!mirrored) return quarterTurns === 0 ? 'Na posição original' : capitalize(TURN_TEXT[quarterTurns])
  if (quarterTurns === 0) return 'Espelhada na horizontal'
  if (quarterTurns === 2) return 'Espelhada na vertical'
  return `${capitalize(TURN_TEXT[turns(-quarterTurns)])} e espelhada na horizontal`
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Geometria do símbolo "Recorte" numa grade de 32 × 32.
 * Fonte única para o componente Logo e para o script que gera favicon e ícones do PWA.
 */
export const LOGO_VIEWBOX = '0 0 32 32'

/** Quadro de mídia com o canto superior direito cortado a 45°. */
export const LOGO_FRAME_PATH = 'M6 6H14L26 18V26A4 4 0 0 1 22 30H6A4 4 0 0 1 2 26V10A4 4 0 0 1 6 6Z'

/** A peça cortada, deslocada 4 unidades na diagonal: a transformação. */
export const LOGO_PIECE_PATH = 'M18 2H28A2 2 0 0 1 30 4V14Z'

/**
 * Cores literais para os ícones gerados fora do CSS.
 * logo-geometry.test.ts garante que continuam iguais aos tokens.
 */
export const BRAND_COLORS = {
  frame: '#3478c9',
  piece: '#82b7f5',
  background: '#11151c',
} as const

/**
 * Geometria do símbolo "Obturador" numa grade de 48 × 48.
 * Fonte única para o componente Logo e para o script que gera favicon e ícones do PWA.
 *
 * Três lâminas de uma câmera fotográfica (a foto) cujo vão central forma o "play" (o vídeo).
 * Cada lâmina é uma cunha com vértice num canto do triângulo, já afastada das vizinhas,
 * então o desenho não precisa de máscara (funciona igual no site, no SVG e no PNG).
 */
export const LOGO_VIEWBOX = '0 0 48 48'

/** Raio dos cantos do ladrilho do ícone (26% do lado, como os ícones de app). */
export const LOGO_TILE_RADIUS = 12.5

/** Lâminas do obturador (círculo de raio 16,5 no centro; o triângulo vazio do meio é o "play"). */
export const LOGO_BLADE_PATHS = [
  'M18.28 16.64L11.8 12.89A16.5 16.5 0 0 0 18.28 39.48Z',
  'M20.48 32.64L20.48 40.12A16.5 16.5 0 0 0 40.26 21.21Z',
  'M33.24 22.73L39.72 18.99A16.5 16.5 0 0 0 13.46 11.31Z',
] as const

/**
 * Cores literais para os ícones gerados fora do CSS.
 * logo-geometry.test.ts garante que continuam iguais aos tokens.
 */
export const BRAND_COLORS = {
  start: '#8b5cf6',
  end: '#ec4899',
  background: '#000000',
} as const

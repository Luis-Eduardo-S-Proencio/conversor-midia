import type { VideoToolLabels } from '../shared/useVideoTool'

export const EDIT_LABELS: VideoToolLabels = {
  action: 'Salvar vídeo',
  progress: 'Salvando',
  done: 'editado',
  cancelled: 'Salvamento cancelado. A edição continua como estava.',
  again: 'Editar outro vídeo',
  purpose: 'editar',
}

/** "praia.mp4" → "praia-editado.mp4". */
export const EDIT_SUFFIX = '-editado'

/** Altura da barra de miniaturas na tela, em pixels. */
export const STRIP_HEIGHT = 56

/** Miniaturas geradas com o dobro da altura exibida: nítidas em telas de alta densidade. */
export const THUMBNAIL_HEIGHT = STRIP_HEIGHT * 2

/** Uma miniatura por segundo, de 8 a 120: num vídeo longo, cada uma vale para um trecho maior. */
export const thumbnailCount = (duration: number) => Math.min(120, Math.max(8, Math.ceil(duration)))

/** Níveis de zoom da barra, em pixels por segundo do vídeo. */
export const ZOOM_LEVELS = [2, 4, 8, 16, 32, 64, 128, 256] as const

/** Zoom inicial: o maior em que o vídeo inteiro cabe na largura da barra (ou o menor, num vídeo muito longo). */
export function initialZoom(duration: number, width: number): number {
  const fitting = ZOOM_LEVELS.filter((level) => level * duration <= width)
  return fitting.at(-1) ?? ZOOM_LEVELS[0]
}

/** Intervalo entre as marcas de tempo da régua: o menor que deixa ao menos 64 px entre elas. */
export function rulerStep(pixelsPerSecond: number): number {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800]
  return steps.find((step) => step * pixelsPerSecond >= 64) ?? 3600
}

/** Passo das setas na barra e nas pontas: 0,1 s; com Shift, 1 s. */
export const keyStep = (shift: boolean) => (shift ? 1 : 0.1)

/** Base dos ids dos filtros de cor: o `useId` devolve caracteres que não valem num `url(#…)` do CSS. */
export const filterIdBase = (id: string) => `fx-${id.replace(/[^\w-]/g, '')}`

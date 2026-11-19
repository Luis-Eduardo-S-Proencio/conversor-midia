/** Largura e altura em pixels. */
export interface Dimensions {
  width: number
  height: number
}

/** Maior lado aceito no resultado: canvas maiores falham em parte dos navegadores e aparelhos. */
export const MAX_OUTPUT_SIDE = 16_384

/** O que a pessoa pediu, já validado: medidas inteiras a partir de 1 px. */
export type ResizeRequest =
  | { mode: 'percent'; percent: number }
  /** Cabe nas medidas informadas (a que faltar não limita), sem deformar e sem ampliar. */
  | { mode: 'fit'; width?: number; height?: number }
  /** Exatamente estas medidas: pode deformar e ampliar. */
  | { mode: 'exact'; width: number; height: number }

const side = (value: number) => Math.max(1, Math.round(value))

const scaled = (source: Dimensions, scale: number): Dimensions => ({
  width: side(source.width * scale),
  height: side(source.height * scale),
})

/**
 * Medidas do resultado. `source` deve ser a imagem como aparece (orientação já aplicada):
 * numa foto tirada em pé, a largura é o lado menor.
 */
export function resizedDimensions(source: Dimensions, request: ResizeRequest): Dimensions {
  switch (request.mode) {
    case 'percent':
      return scaled(source, request.percent / 100)
    case 'fit':
      return scaled(
        source,
        Math.min(1, (request.width ?? Infinity) / source.width, (request.height ?? Infinity) / source.height),
      )
    case 'exact':
      return { width: request.width, height: request.height }
  }
}

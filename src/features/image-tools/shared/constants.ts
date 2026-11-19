/** Maior lado da prévia (arquivo único) e da miniatura (lista), em pixels. */
export const PREVIEW_SIZE = 1024
export const THUMBNAIL_SIZE = 96

/** JPEG primeiro: o iPhone converte fotos HEIC da galeria para o primeiro tipo desta lista. */
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

/** Textos que mudam de uma ferramenta para outra ("Converter" / "Comprimir"). */
export interface BatchLabels {
  /** Verbo da ação principal: "Converter". */
  action: string
  /** Gerúndio para o progresso: "Convertendo". */
  progress: string
  /** Particípio no feminino singular: "convertida" (o plural ganha "s"). */
  done: string
  /** Substantivo feminino da operação: "Conversão" (o anúncio de cancelamento diz "Conversão cancelada."). */
  noun: string
}

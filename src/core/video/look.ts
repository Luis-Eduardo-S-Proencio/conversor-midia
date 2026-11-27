/**
 * A aparência do vídeo editado além dos cortes: os textos e a cor (filtro e ajustes). O Worker desenha tudo
 * isso em cada quadro, então qualquer item aqui faz o vídeo ser refeito ao salvar.
 */
import { colorMatrix, sanitizeColor, type ColorEffect } from './effects'
import { sanitizeTexts, type VideoText } from './text'

export interface VideoLook {
  texts: VideoText[]
  /** Filtro e ajustes de cor, no vídeo inteiro (os textos ficam por cima, sem filtro). */
  color?: ColorEffect
}

export const EMPTY_LOOK: VideoLook = { texts: [] }

/** Há algo a desenhar nos quadros (o vídeo precisa ser refeito). */
export const hasLook = (look: VideoLook | undefined): look is VideoLook =>
  Boolean(look && (look.texts.length > 0 || (look.color && colorMatrix(look.color))))

/** O que o Worker aceita: só itens válidos, dentro do vídeo. */
export function sanitizeLook(look: VideoLook | undefined, duration: number): VideoLook | undefined {
  if (!look) return undefined
  const texts = sanitizeTexts(Array.isArray(look.texts) ? look.texts : [], duration)
  const color = sanitizeColor(look.color)
  if (texts.length === 0 && !color) return undefined
  return color ? { texts, color } : { texts }
}

/**
 * A aparência do vídeo editado além dos cortes: por enquanto, os textos. O Worker desenha tudo isso em cada
 * quadro, então qualquer item aqui faz o vídeo ser refeito ao salvar.
 */
import { sanitizeTexts, type VideoText } from './text'

export interface VideoLook {
  texts: VideoText[]
}

export const EMPTY_LOOK: VideoLook = { texts: [] }

/** Há algo a desenhar nos quadros (o vídeo precisa ser refeito). */
export const hasLook = (look: VideoLook | undefined): look is VideoLook => Boolean(look && look.texts.length > 0)

/** O que o Worker aceita: só itens válidos, dentro do vídeo. */
export function sanitizeLook(look: VideoLook | undefined, duration: number): VideoLook | undefined {
  if (!look) return undefined
  const texts = sanitizeTexts(Array.isArray(look.texts) ? look.texts : [], duration)
  return texts.length > 0 ? { texts } : undefined
}

import type { TextFontId } from '../../../core/video/text'
import { textFontLoader } from '../../../workers/text-font-files'

const loadOther = typeof document === 'undefined' ? undefined : textFontLoader(document.fonts)

/**
 * Carrega a fonte de um texto na página antes de desenhar a prévia (o canvas não espera a fonte sozinho).
 * A do app já está declarada no CSS; as outras são registradas na primeira vez que alguém as escolhe.
 */
export function ensureTextFont(id: TextFontId = 'inter'): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (id === 'inter') return document.fonts.load('700 32px "Inter Variable"').then(() => undefined)
  return loadOther ? loadOther(id) : Promise.resolve()
}

import { detectImageType } from './image/signature'
import { detectVideoType } from './video/signature'

/** O que o Media Tools sabe abrir: foto (JPG, PNG, WEBP) ou vídeo (MP4, MOV, WEBM). */
export type MediaKind = 'image' | 'video'

/** Bytes do começo do arquivo que bastam para reconhecer a imagem ou o vídeo. */
export const MEDIA_SIGNATURE_BYTES = 4096

/**
 * Foto ou vídeo aceitos, pelo conteúdo (nunca pela extensão nem pelo tipo informado);
 * `null` para todo o resto. Só encaminha o arquivo: a ferramenta escolhida faz a validação completa.
 */
export function detectMediaKind(bytes: Uint8Array): MediaKind | null {
  if (detectImageType(bytes).kind === 'supported') return 'image'
  if (detectVideoType(bytes).kind === 'supported') return 'video'
  return null
}

export interface ChosenMedia {
  name: string
  kind: MediaKind | null
}

export type OpeningPlan =
  | { ok: true; kind: 'image'; count: number }
  | { ok: true; kind: 'video' }
  | { ok: false; message: string }

/**
 * Decide o que fazer com os arquivos escolhidos no início: várias imagens vão juntas
 * para as ferramentas de imagem; vídeo vai um por vez. Misturar não dá: cada ferramenta é de um tipo.
 */
export function planOpening(chosen: readonly ChosenMedia[]): OpeningPlan {
  if (chosen.length === 0) return { ok: false, message: 'Nenhum arquivo foi escolhido.' }
  const unknown = chosen.find((item) => item.kind === null)
  if (unknown) {
    return {
      ok: false,
      message: `"${unknown.name}" não é uma imagem nem um vídeo que o Media Tools abre. Escolha JPG, PNG, WEBP, MP4, MOV ou WEBM.`,
    }
  }
  const videos = chosen.filter((item) => item.kind === 'video').length
  if (videos === 0) return { ok: true, kind: 'image', count: chosen.length }
  if (videos < chosen.length) {
    return { ok: false, message: 'Escolha só imagens ou só um vídeo: cada ferramenta trabalha com um tipo de arquivo.' }
  }
  if (videos > 1) return { ok: false, message: 'Os vídeos são abertos um de cada vez. Escolha só um vídeo.' }
  return { ok: true, kind: 'video' }
}

import type { AspectChoice } from '../core/crop-fields'
import type { SizeTarget } from '../core/video/compress'

/**
 * Destinos com limites conhecidos, num lugar só (atalhos do Início e ajustes das ferramentas).
 * Os limites das plataformas mudam: valores conferidos em 25/11/2026.
 * - WhatsApp: vídeo enviado como mídia vai até 100 MB em 720p (conexão rápida) ou 64 MB em 480p
 *   (lenta), pela Central de Ajuda; como documento, até 2 GB. O preset fica em 64 MB e 720p: cabe nos dois.
 * - E-mail: Gmail aceita 25 MB de anexos; o Outlook, 20 MB. O preset fica em 20 MB.
 * - Discord: 20 MB por arquivo sem Nitro (desde agosto de 2026; antes, 10 MB).
 * - Instagram: Feed em 4:5 (1080 × 1350); Stories e Reels em 9:16 (1080 × 1920). TikTok: 9:16.
 *   YouTube: 16:9 (1920 × 1080).
 * Os tamanhos são em MiB (1024 × 1024), a mesma base que a tela usa; com a folga de 5% do cálculo, o
 * resultado fica abaixo do limite mesmo que a plataforma conte em milhões de bytes.
 */
const MB = 1024 * 1024

export type SizeDestinationId = 'whatsapp' | 'email' | 'discord'

export interface SizeDestination extends SizeTarget {
  id: SizeDestinationId
  label: string
  /** O que o ajuste faz, em uma frase. */
  summary: string
}

/** Destinos que limitam o tamanho do arquivo: o Comprimir vídeo calcula a taxa para caber. */
export const SIZE_DESTINATIONS: Record<SizeDestinationId, SizeDestination> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    maxBytes: 64 * MB,
    maxShortSide: 720,
    summary: 'Até 64 MB em 720p: o WhatsApp envia como vídeo, mesmo em conexão lenta.',
  },
  email: {
    id: 'email',
    label: 'E-mail',
    maxBytes: 20 * MB,
    maxShortSide: 1080,
    summary: 'Até 20 MB: cabe como anexo no Gmail e no Outlook.',
  },
  discord: {
    id: 'discord',
    label: 'Discord',
    maxBytes: 20 * MB,
    maxShortSide: 1080,
    summary: 'Até 20 MB: o limite de envio do Discord sem Nitro.',
  },
}

export const SIZE_DESTINATION_IDS = Object.keys(SIZE_DESTINATIONS) as SizeDestinationId[]

/** Destino pedido no endereço (ex.: "?destino=whatsapp", vindo de um atalho); `undefined` se não houver. */
export function parseSizeDestination(text: string | null): SizeDestinationId | undefined {
  return SIZE_DESTINATION_IDS.find((id) => id === text)
}

export type FrameDestinationId = 'instagram-feed' | 'stories' | 'tiktok' | 'youtube'

export interface FrameDestination {
  id: FrameDestinationId
  label: string
  aspect: AspectChoice
  /** Medidas recomendadas pela plataforma (largura × altura). */
  width: number
  height: number
}

/** Destinos que pedem uma proporção de quadro (recorte e, no editor, a proporção com fundo). */
export const FRAME_DESTINATIONS: Record<FrameDestinationId, FrameDestination> = {
  'instagram-feed': { id: 'instagram-feed', label: 'Instagram Feed', aspect: '4:5', width: 1080, height: 1350 },
  stories: { id: 'stories', label: 'Stories e Reels', aspect: '9:16', width: 1080, height: 1920 },
  tiktok: { id: 'tiktok', label: 'TikTok', aspect: '9:16', width: 1080, height: 1920 },
  youtube: { id: 'youtube', label: 'YouTube', aspect: '16:9', width: 1920, height: 1080 },
}

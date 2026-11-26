import { FileText, ImagePlay, MessageCircle, Music, RectangleVertical, type LucideIcon } from 'lucide-react'
import { SIZE_DESTINATIONS } from './destinations'

export interface Shortcut {
  id: string
  /** Texto do chip. */
  label: string
  /** O que ele faz, para quem não vê o ícone (e na dica do mouse). */
  hint: string
  /** Ferramenta já configurada pelo endereço. */
  to: string
  icon: LucideIcon
}

/** Atalhos rápidos do Início: os pedidos mais comuns, a um toque, com a ferramenta já ajustada. */
export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    hint: `vídeo comprimido para até ${SIZE_DESTINATIONS.whatsapp.maxBytes / (1024 * 1024)} MB`,
    to: '/videos/comprimir?destino=whatsapp',
    icon: MessageCircle,
  },
  { id: 'mp3', label: 'Vídeo para MP3', hint: 'só o som do vídeo, em MP3', to: '/videos/extrair-audio?formato=mp3', icon: Music },
  { id: 'pdf', label: 'Imagem para PDF', hint: 'fotos convertidas em PDF', to: '/imagens/converter?formato=pdf', icon: FileText },
  { id: 'gif', label: 'GIF', hint: 'um trecho do vídeo vira GIF animado', to: '/videos/gif', icon: ImagePlay },
  { id: 'story', label: 'Story 9:16', hint: 'vídeo recortado em pé, para Stories e Reels', to: '/videos/recortar?proporcao=9:16', icon: RectangleVertical },
]

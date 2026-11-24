import { ArrowLeftRight, Crop, ImagePlay, Minimize2, Monitor, Music, RotateCw, Scaling, Scissors } from 'lucide-react'
import type { SwitcherTool } from '../components/tool/ToolSwitcher'
import type { NavListItem } from '../components/ui/NavList'
import type { ToolTone } from '../components/ui/ToolIcon'
import type { MediaKind } from '../core/media-kind'

/** Uma ferramenta do catálogo: destino, cor do ícone e o tipo de arquivo que ela abre. */
export interface ToolEntry extends NavListItem {
  to: string
  tone: ToolTone
  media: MediaKind
  /** Nome curto para a grade de ícones do celular (cabe em duas linhas). */
  shortTitle: string
  /** Uma palavra, para a troca de ferramenta dentro do editor ("Converter", "Tamanho"). */
  switchLabel: string
}

export const IMAGE_TOOLS: readonly ToolEntry[] = [
  {
    id: 'image-convert',
    switchLabel: 'Converter',
    title: 'Converter imagem',
    shortTitle: 'Converter imagem',
    description: 'Para JPG, PNG, WEBP, PDF e mais',
    icon: ArrowLeftRight,
    tone: 'convert',
    media: 'image',
    to: '/imagens/converter',
  },
  {
    id: 'image-compress',
    switchLabel: 'Comprimir',
    title: 'Comprimir imagem',
    shortTitle: 'Comprimir imagem',
    description: 'Arquivo menor, mesma cara',
    icon: Minimize2,
    tone: 'compress',
    media: 'image',
    to: '/imagens/comprimir',
  },
  {
    id: 'image-resize',
    switchLabel: 'Tamanho',
    title: 'Redimensionar imagem',
    shortTitle: 'Tamanho da imagem',
    description: 'Por porcentagem ou em pixels',
    icon: Scaling,
    tone: 'size',
    media: 'image',
    to: '/imagens/redimensionar',
  },
  {
    id: 'image-crop',
    switchLabel: 'Recortar',
    title: 'Recortar imagem',
    shortTitle: 'Recortar imagem',
    description: 'Mantenha só a área que importa',
    icon: Crop,
    tone: 'crop',
    media: 'image',
    to: '/imagens/recortar',
  },
  {
    id: 'image-rotate-flip',
    switchLabel: 'Girar',
    title: 'Girar e espelhar',
    shortTitle: 'Girar e espelhar',
    description: 'Corrija a orientação da foto',
    icon: RotateCw,
    tone: 'rotate',
    media: 'image',
    to: '/imagens/girar',
  },
]

export const VIDEO_TOOLS: readonly ToolEntry[] = [
  {
    id: 'video-edit',
    switchLabel: 'Editar',
    title: 'Editar vídeo',
    shortTitle: 'Editar vídeo',
    description: 'Tire as partes que não quer, vendo na hora',
    icon: Scissors,
    tone: 'edit',
    media: 'video',
    to: '/videos/editar',
  },
  {
    id: 'video-crop',
    switchLabel: 'Recortar',
    title: 'Recortar vídeo',
    shortTitle: 'Recortar vídeo',
    description: 'Só a parte do quadro que importa',
    icon: Crop,
    tone: 'crop',
    media: 'video',
    to: '/videos/recortar',
  },
  {
    id: 'video-compress',
    switchLabel: 'Comprimir',
    title: 'Comprimir vídeo',
    shortTitle: 'Comprimir vídeo',
    description: 'Menor para enviar ou guardar',
    icon: Minimize2,
    tone: 'compress',
    media: 'video',
    to: '/videos/comprimir',
  },
  {
    id: 'video-audio',
    switchLabel: 'Áudio',
    title: 'Extrair áudio',
    shortTitle: 'Extrair áudio',
    description: 'Só o som, em M4A, WEBM ou MP3',
    icon: Music,
    tone: 'audio',
    media: 'video',
    to: '/videos/extrair-audio',
  },
  {
    id: 'video-resize',
    switchLabel: 'Resolução',
    title: 'Mudar resolução',
    shortTitle: 'Resolução do vídeo',
    description: 'Diminua para 1080p, 720p, 480p ou 360p',
    icon: Monitor,
    tone: 'size',
    media: 'video',
    to: '/videos/resolucao',
  },
  {
    id: 'video-convert',
    switchLabel: 'Converter',
    title: 'Converter vídeo',
    shortTitle: 'Converter vídeo',
    description: 'Entre MP4, MOV e WEBM',
    icon: ArrowLeftRight,
    tone: 'convert',
    media: 'video',
    to: '/videos/converter',
  },
  {
    id: 'video-gif',
    switchLabel: 'GIF',
    title: 'Criar GIF',
    shortTitle: 'Criar GIF',
    description: 'Um trecho de até 15 segundos',
    icon: ImagePlay,
    tone: 'gif',
    media: 'video',
    to: '/videos/gif',
  },
]

/** Ferramentas na forma da troca de ferramenta do editor. */
export function switcherTools(media: MediaKind): SwitcherTool[] {
  return toolsFor(media).map(({ id, to, switchLabel, icon, tone }) => ({ id, to, label: switchLabel, icon, tone }))
}

/** Ferramentas que abrem este tipo de arquivo. */
export function toolsFor(media: MediaKind): readonly ToolEntry[] {
  return media === 'image' ? IMAGE_TOOLS : VIDEO_TOOLS
}

export interface ToolGroup {
  id: string
  title: string
  description: string
  tools: readonly ToolEntry[]
}

function pick(...ids: string[]): ToolEntry[] {
  return ids.map((id) => {
    const tool = [...IMAGE_TOOLS, ...VIDEO_TOOLS].find((entry) => entry.id === id)
    if (!tool) throw new Error(`Ferramenta inexistente no catálogo: ${id}`)
    return tool
  })
}

/** As ferramentas agrupadas pelo que a pessoa quer fazer (página inicial). */
export const TOOL_GROUPS: readonly ToolGroup[] = [
  {
    id: 'editar',
    title: 'Editar',
    description: 'Cortar, recortar e girar',
    tools: pick('video-edit', 'image-crop', 'video-crop', 'image-rotate-flip', 'video-gif'),
  },
  {
    id: 'converter',
    title: 'Converter',
    description: 'Trocar o formato do arquivo',
    tools: pick('image-convert', 'video-convert', 'video-audio'),
  },
  {
    id: 'deixar-menor',
    title: 'Deixar menor',
    description: 'Ocupar menos espaço',
    tools: pick('image-compress', 'video-compress', 'image-resize', 'video-resize'),
  },
]

import { ArrowLeftRight, Crop, ImagePlay, LayoutDashboard, Minimize2, Monitor, Music, RotateCw, Scaling, Scissors, type LucideIcon } from 'lucide-react'
import type { MediaKind } from '../core/media-kind'

/** Uma ferramenta do catálogo: destino, ícone e o tipo de arquivo que ela abre. */
export interface ToolEntry {
  id: string
  title: string
  /** Uma linha: o que a ferramenta faz. */
  description: string
  icon: LucideIcon
  to: string
  media: MediaKind
  /** Trabalha com um arquivo por vez (Recortar imagem): fica fora das opções quando há várias imagens abertas. */
  single?: boolean
  /** Só faz sentido a partir de tantos arquivos (Criar colagem: 2): com menos, fica fora das opções do arquivo aberto. */
  minFiles?: number
}

export const IMAGE_TOOLS: readonly ToolEntry[] = [
  {
    id: 'image-convert',
    title: 'Converter imagem',
    description: 'JPG, PNG, WEBP, PDF e mais',
    icon: ArrowLeftRight,
    media: 'image',
    to: '/imagens/converter',
  },
  {
    id: 'image-compress',
    title: 'Comprimir imagem',
    description: 'Arquivo menor, mesma aparência',
    icon: Minimize2,
    media: 'image',
    to: '/imagens/comprimir',
  },
  {
    id: 'image-resize',
    title: 'Redimensionar imagem',
    description: 'Em porcentagem ou em pixels',
    icon: Scaling,
    media: 'image',
    to: '/imagens/redimensionar',
  },
  {
    id: 'image-crop',
    single: true,
    title: 'Recortar imagem',
    description: 'Corte as bordas da foto',
    icon: Crop,
    media: 'image',
    to: '/imagens/recortar',
  },
  {
    id: 'image-rotate-flip',
    title: 'Girar e espelhar',
    description: 'Acerte a orientação da foto',
    icon: RotateCw,
    media: 'image',
    to: '/imagens/girar',
  },
  {
    id: 'image-collage',
    title: 'Criar colagem',
    description: 'Junte várias fotos numa só',
    icon: LayoutDashboard,
    minFiles: 2,
    media: 'image',
    to: '/imagens/colagem',
  },
]

export const VIDEO_TOOLS: readonly ToolEntry[] = [
  {
    id: 'video-edit',
    title: 'Editar vídeo',
    description: 'Tire as partes que não quer',
    icon: Scissors,
    media: 'video',
    to: '/videos/editar',
  },
  {
    id: 'video-crop',
    title: 'Recortar vídeo',
    description: 'Corte as bordas do quadro',
    icon: Crop,
    media: 'video',
    to: '/videos/recortar',
  },
  {
    id: 'video-compress',
    title: 'Comprimir vídeo',
    description: 'Deixe menor para enviar',
    icon: Minimize2,
    media: 'video',
    to: '/videos/comprimir',
  },
  {
    id: 'video-audio',
    title: 'Extrair áudio',
    description: 'Salve só o som, em MP3 ou M4A',
    icon: Music,
    media: 'video',
    to: '/videos/extrair-audio',
  },
  {
    id: 'video-resize',
    title: 'Mudar resolução',
    description: 'De 1080p até 360p',
    icon: Monitor,
    media: 'video',
    to: '/videos/resolucao',
  },
  {
    id: 'video-convert',
    title: 'Converter vídeo',
    description: 'Entre MP4, MOV e WEBM',
    icon: ArrowLeftRight,
    media: 'video',
    to: '/videos/converter',
  },
  {
    id: 'video-gif',
    title: 'Criar GIF',
    description: 'Um trecho de até 15 segundos',
    icon: ImagePlay,
    media: 'video',
    to: '/videos/gif',
  },
]

/** Lista de ferramentas de cada tipo de arquivo: o "pai" das páginas de ferramenta (para onde o voltar leva). */
export const MEDIA_PARENTS: Record<MediaKind, { to: string; label: string }> = {
  image: { to: '/imagens', label: 'Imagens' },
  video: { to: '/videos', label: 'Vídeos' },
}

/** A ferramenta deste endereço (ex.: "/videos/comprimir"), se houver. */
export function toolByPath(pathname: string): ToolEntry | undefined {
  return [...IMAGE_TOOLS, ...VIDEO_TOOLS].find((tool) => tool.to === pathname)
}

/** Ferramentas que abrem este tipo de arquivo. */
export function toolsFor(media: MediaKind): readonly ToolEntry[] {
  return media === 'image' ? IMAGE_TOOLS : VIDEO_TOOLS
}

function pick(...ids: string[]): ToolEntry[] {
  return ids.map((id) => {
    const tool = [...IMAGE_TOOLS, ...VIDEO_TOOLS].find((entry) => entry.id === id)
    if (!tool) throw new Error(`Ferramenta inexistente no catálogo: ${id}`)
    return tool
  })
}

/** Ferramenta indicada primeiro ao abrir um arquivo deste tipo ("O que fazer com este arquivo?"). */
export const RECOMMENDED_TOOL: Partial<Record<MediaKind, string>> = { video: 'video-edit' }

/**
 * Ferramentas oferecidas para um arquivo aberto, na ordem do painel "O que fazer com este arquivo?":
 * no vídeo, o editor primeiro; com várias imagens, só as que trabalham com várias (e a colagem só a partir de 2).
 */
export function toolsForOpened(kind: MediaKind, count: number): readonly ToolEntry[] {
  if (kind === 'video') return pick('video-edit', 'video-compress', 'video-convert', 'video-audio', 'video-resize', 'video-crop', 'video-gif')
  return IMAGE_TOOLS.filter((tool) => (count === 1 || !tool.single) && count >= (tool.minFiles ?? 1))
}


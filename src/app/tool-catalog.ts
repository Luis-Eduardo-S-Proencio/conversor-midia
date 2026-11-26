import { ArrowLeftRight, Crop, ImagePlay, Minimize2, Monitor, Music, RotateCw, Scaling, Scissors, type LucideIcon } from 'lucide-react'
import type { SwitcherTool } from '../components/tool/ToolSwitcher'
import type { ToolTone } from '../components/ui/ToolIcon'
import type { MediaKind } from '../core/media-kind'

/** Uma ferramenta do catálogo: destino, cor do ícone e o tipo de arquivo que ela abre. */
export interface ToolEntry {
  id: string
  title: string
  /** Uma linha: o que a ferramenta faz. */
  description: string
  icon: LucideIcon
  to: string
  tone: ToolTone
  media: MediaKind
  /** Nome curto para a grade de ícones do celular (cabe em duas linhas). */
  shortTitle: string
  /** Uma palavra, para a troca de ferramenta dentro do editor ("Converter", "Tamanho"). */
  switchLabel: string
  /** Nome na lista de ferramentas da barra lateral do computador ("Redimensionar", "Extrair áudio"). */
  navLabel: string
  /** Trabalha com um arquivo por vez (Recortar imagem): fica fora das opções quando há várias imagens abertas. */
  single?: boolean
}

export const IMAGE_TOOLS: readonly ToolEntry[] = [
  {
    id: 'image-convert',
    navLabel: 'Converter',
    switchLabel: 'Converter',
    title: 'Converter imagem',
    shortTitle: 'Converter imagem',
    description: 'JPG, PNG, WEBP, PDF e mais',
    icon: ArrowLeftRight,
    tone: 'convert',
    media: 'image',
    to: '/imagens/converter',
  },
  {
    id: 'image-compress',
    navLabel: 'Comprimir',
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
    navLabel: 'Redimensionar',
    switchLabel: 'Tamanho',
    title: 'Redimensionar imagem',
    shortTitle: 'Tamanho da imagem',
    description: 'Em porcentagem ou pixels',
    icon: Scaling,
    tone: 'compress',
    media: 'image',
    to: '/imagens/redimensionar',
  },
  {
    id: 'image-crop',
    navLabel: 'Recortar',
    single: true,
    switchLabel: 'Recortar',
    title: 'Recortar imagem',
    shortTitle: 'Recortar imagem',
    description: 'Só a área que importa',
    icon: Crop,
    tone: 'edit',
    media: 'image',
    to: '/imagens/recortar',
  },
  {
    id: 'image-rotate-flip',
    navLabel: 'Girar',
    switchLabel: 'Girar',
    title: 'Girar e espelhar',
    shortTitle: 'Girar e espelhar',
    description: 'Acerte a orientação',
    icon: RotateCw,
    tone: 'edit',
    media: 'image',
    to: '/imagens/girar',
  },
]

export const VIDEO_TOOLS: readonly ToolEntry[] = [
  {
    id: 'video-edit',
    navLabel: 'Editar',
    switchLabel: 'Editar',
    title: 'Editar vídeo',
    shortTitle: 'Editar vídeo',
    description: 'Corte e veja na hora',
    icon: Scissors,
    tone: 'edit',
    media: 'video',
    to: '/videos/editar',
  },
  {
    id: 'video-crop',
    navLabel: 'Recortar',
    switchLabel: 'Recortar',
    title: 'Recortar vídeo',
    shortTitle: 'Recortar vídeo',
    description: 'Só a parte do quadro',
    icon: Crop,
    tone: 'edit',
    media: 'video',
    to: '/videos/recortar',
  },
  {
    id: 'video-compress',
    navLabel: 'Comprimir',
    switchLabel: 'Comprimir',
    title: 'Comprimir vídeo',
    shortTitle: 'Comprimir vídeo',
    description: 'Menor para enviar',
    icon: Minimize2,
    tone: 'compress',
    media: 'video',
    to: '/videos/comprimir',
  },
  {
    id: 'video-audio',
    navLabel: 'Extrair áudio',
    switchLabel: 'Áudio',
    title: 'Extrair áudio',
    shortTitle: 'Extrair áudio',
    description: 'Só o som do vídeo',
    icon: Music,
    tone: 'audio',
    media: 'video',
    to: '/videos/extrair-audio',
  },
  {
    id: 'video-resize',
    navLabel: 'Resolução',
    switchLabel: 'Resolução',
    title: 'Mudar resolução',
    shortTitle: 'Resolução do vídeo',
    description: 'De 1080p até 360p',
    icon: Monitor,
    tone: 'compress',
    media: 'video',
    to: '/videos/resolucao',
  },
  {
    id: 'video-convert',
    navLabel: 'Converter',
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
    navLabel: 'GIF',
    switchLabel: 'GIF',
    title: 'Criar GIF',
    shortTitle: 'Criar GIF',
    description: 'Trecho de até 15 s',
    icon: ImagePlay,
    tone: 'edit',
    media: 'video',
    to: '/videos/gif',
  },
]

/** Ferramentas na forma da troca de ferramenta do editor. */
export function switcherTools(media: MediaKind): SwitcherTool[] {
  return toolsFor(media).map(({ id, to, switchLabel, icon, tone }) => ({ id, to, label: switchLabel, icon, tone }))
}

/** Lista de ferramentas de cada tipo de arquivo: o "pai" das páginas de ferramenta (voltar e trilha). */
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

/** Todas as ferramentas, da mais usada para a menos usada (grade do Início). */
export const TOOLS_BY_USAGE: readonly ToolEntry[] = pick(
  'video-edit',
  'video-compress',
  'image-convert',
  'video-audio',
  'image-compress',
  'video-convert',
  'image-crop',
  'video-gif',
  'image-resize',
  'video-resize',
  'video-crop',
  'image-rotate-flip',
)

/** Ferramenta indicada primeiro ao abrir um arquivo deste tipo ("O que fazer com este arquivo?"). */
export const RECOMMENDED_TOOL: Partial<Record<MediaKind, string>> = { video: 'video-edit' }

/**
 * Ferramentas oferecidas para um arquivo aberto, na ordem do painel "O que fazer com este arquivo?":
 * no vídeo, o editor primeiro; com várias imagens, só as que trabalham em lote.
 */
export function toolsForOpened(kind: MediaKind, count: number): readonly ToolEntry[] {
  if (kind === 'video') return pick('video-edit', 'video-compress', 'video-convert', 'video-audio', 'video-resize', 'video-crop', 'video-gif')
  return IMAGE_TOOLS.filter((tool) => count === 1 || !tool.single)
}


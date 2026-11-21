import { ArrowLeftRight, Crop, ImagePlay, Minimize2, Music, RotateCw, Scaling, Scissors } from 'lucide-react'
import type { NavListItem } from '../components/ui/NavList'

/**
 * Catálogo das ferramentas exibidas na navegação.
 * Sem `to`, a ferramenta aparece como "Em breve"; ao implementar, basta preencher o caminho.
 */
export interface ToolEntry extends NavListItem {
  popular?: boolean
}

export const IMAGE_TOOLS: readonly ToolEntry[] = [
  {
    id: 'image-convert',
    title: 'Converter imagem',
    description: 'Para JPG, PNG, WEBP, PDF e mais',
    icon: ArrowLeftRight,
    to: '/imagens/converter',
    popular: true,
  },
  {
    id: 'image-compress',
    title: 'Comprimir imagem',
    description: 'Arquivo menor, qualidade sob controle',
    icon: Minimize2,
    to: '/imagens/comprimir',
    popular: true,
  },
  {
    id: 'image-resize',
    title: 'Redimensionar imagem',
    description: 'Por porcentagem ou em pixels',
    icon: Scaling,
    to: '/imagens/redimensionar',
    popular: true,
  },
  {
    id: 'image-crop',
    title: 'Recortar imagem',
    description: 'Mantenha só a área que importa',
    icon: Crop,
    to: '/imagens/recortar',
    popular: true,
  },
  { id: 'image-rotate-flip', title: 'Girar e espelhar', description: 'Corrija a orientação da foto', icon: RotateCw, to: '/imagens/girar' },
]

// As disponíveis primeiro; as que estão por vir, depois.
export const VIDEO_TOOLS: readonly ToolEntry[] = [
  { id: 'video-trim', title: 'Cortar trecho', description: 'Fique com um trecho ou tire partes do meio', icon: Scissors, to: '/videos/cortar' },
  { id: 'video-crop', title: 'Recortar vídeo', description: 'Mantenha só a parte do quadro que importa', icon: Crop, to: '/videos/recortar' },
  { id: 'video-compress', title: 'Comprimir vídeo', description: 'Reduza o tamanho para enviar ou guardar', icon: Minimize2, to: '/videos/comprimir' },
  { id: 'video-convert', title: 'Converter vídeo', description: 'Troque o formato do arquivo', icon: ArrowLeftRight },
  { id: 'video-resize', title: 'Mudar resolução', description: 'Diminua a resolução do vídeo', icon: Scaling },
  { id: 'video-audio', title: 'Extrair áudio', description: 'Salve só o som do vídeo', icon: Music },
  { id: 'video-gif', title: 'Criar GIF', description: 'Transforme um trecho do vídeo em GIF animado', icon: ImagePlay },
]

export const POPULAR_TOOLS: readonly ToolEntry[] = IMAGE_TOOLS.filter((tool) => tool.popular)

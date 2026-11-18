import { ArrowLeftRight, Crop, Minimize2, Music, RotateCw, Scaling, Scissors } from 'lucide-react'
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
    description: 'Entre JPG, PNG e WEBP',
    icon: ArrowLeftRight,
    to: '/imagens/converter',
    popular: true,
  },
  { id: 'image-compress', title: 'Comprimir imagem', description: 'Arquivo menor, qualidade sob controle', icon: Minimize2, popular: true },
  { id: 'image-resize', title: 'Redimensionar imagem', description: 'Largura e altura em pixels', icon: Scaling, popular: true },
  { id: 'image-crop', title: 'Recortar imagem', description: 'Mantenha só a área que importa', icon: Crop, popular: true },
  { id: 'image-rotate-flip', title: 'Girar e espelhar', description: 'Corrija a orientação da foto', icon: RotateCw },
]

export const VIDEO_TOOLS: readonly ToolEntry[] = [
  { id: 'video-convert', title: 'Converter vídeo', description: 'Troque o formato do arquivo', icon: ArrowLeftRight },
  { id: 'video-compress', title: 'Comprimir vídeo', description: 'Reduza o tamanho para enviar ou guardar', icon: Minimize2 },
  { id: 'video-trim', title: 'Cortar trecho', description: 'Remova o início, o fim ou uma parte', icon: Scissors },
  { id: 'video-resize', title: 'Mudar resolução', description: 'Diminua a resolução do vídeo', icon: Scaling },
  { id: 'video-audio', title: 'Extrair áudio', description: 'Salve só o som do vídeo', icon: Music },
]

export const POPULAR_TOOLS: readonly ToolEntry[] = IMAGE_TOOLS.filter((tool) => tool.popular)

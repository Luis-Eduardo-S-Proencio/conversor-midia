import { Film, House, Image as ImageIcon, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Ativo só no caminho exato (necessário para "/"). */
  end?: boolean
}

/**
 * Destinos principais, compartilhados pela barra lateral e pela barra inferior do celular.
 * O Sobre fica no rodapé e, no celular, também no menu "Mais opções" do cabeçalho.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/imagens', label: 'Imagens', icon: ImageIcon },
  { to: '/videos', label: 'Vídeos', icon: Film },
]

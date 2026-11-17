import { Film, House, Image as ImageIcon, Info, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Ativo só no caminho exato (necessário para "/"). */
  end?: boolean
}

/** Destinos principais, compartilhados pelo menu superior e pela barra inferior. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/imagens', label: 'Imagens', icon: ImageIcon },
  { to: '/videos', label: 'Vídeos', icon: Film },
  { to: '/sobre', label: 'Sobre', icon: Info },
]

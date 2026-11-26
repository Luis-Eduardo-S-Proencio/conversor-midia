import { Film, House, Image as ImageIcon, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Ativo só no caminho exato (necessário para "/"). */
  end?: boolean
}

/**
 * Navegação principal, igual no navegador e no app instalado: abas embaixo no celular e links no
 * cabeçalho a partir de 768 px. Sobre e Instalar ficam no menu (☰).
 */
export const TAB_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/imagens', label: 'Imagens', icon: ImageIcon },
  { to: '/videos', label: 'Vídeos', icon: Film },
]

/**
 * Qual aba está ativa para um endereço: a de mesmo começo (as ferramentas ficam dentro de
 * Imagens e Vídeos), ou nenhuma (página não encontrada).
 */
export function activeTabIndex(pathname: string): number {
  return TAB_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
}

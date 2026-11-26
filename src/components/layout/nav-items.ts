import { Film, House, Image as ImageIcon, Info, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Ativo só no caminho exato (necessário para "/"). */
  end?: boolean
}

export const HOME_ITEM: NavItem = { to: '/', label: 'Início', icon: House, end: true }
export const IMAGES_ITEM: NavItem = { to: '/imagens', label: 'Imagens', icon: ImageIcon }
export const VIDEOS_ITEM: NavItem = { to: '/videos', label: 'Vídeos', icon: Film }
export const ABOUT_ITEM: NavItem = { to: '/sobre', label: 'Sobre', icon: Info }

/** Abas do celular e trilho do tablet: as mesmas quatro no navegador e no app instalado. */
export const TAB_ITEMS: readonly NavItem[] = [HOME_ITEM, IMAGES_ITEM, VIDEOS_ITEM, ABOUT_ITEM]

/** Topo da barra lateral do computador (o Sobre fica no rodapé dela, junto de "Instalar app"). */
export const SIDEBAR_ITEMS: readonly NavItem[] = [HOME_ITEM, IMAGES_ITEM, VIDEOS_ITEM]

/**
 * Qual aba está ativa para um endereço: a de mesmo começo (as ferramentas ficam dentro de
 * Imagens e Vídeos), ou nenhuma (página não encontrada).
 */
export function activeTabIndex(pathname: string): number {
  return TAB_ITEMS.findIndex((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
}

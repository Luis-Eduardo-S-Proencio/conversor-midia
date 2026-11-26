import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'

const SIZES = { sm: 16, md: 20, lg: 24 } as const

export type IconSize = keyof typeof SIZES

interface IconProps {
  icon: LucideIcon
  size?: IconSize
  /** Preenchido (aba ativa): o contorno continua e o miolo ganha a cor em transparência, sem esconder os detalhes. */
  filled?: boolean
  className?: string
}

/**
 * Ícone Lucide padronizado: tamanhos da escala e traço de 1,75 px em qualquer tamanho.
 * Sempre decorativo; o nome acessível fica no controle que o contém.
 */
export function Icon({ icon: Glyph, size = 'md', filled = false, className }: IconProps) {
  return (
    <Glyph
      size={SIZES[size]}
      strokeWidth={1.75}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0', filled && 'fill-current [fill-opacity:0.24]', className)}
    />
  )
}

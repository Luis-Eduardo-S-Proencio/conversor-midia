import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { Icon } from './Icon'

const SIZES = {
  sm: { box: 'size-8 rounded-[9px]', icon: 'sm' },
  md: { box: 'size-9 rounded-[10px]', icon: 'md' },
  lg: { box: 'size-11 rounded-xl', icon: 'md' },
} as const

interface ToolIconProps {
  icon: LucideIcon
  size?: keyof typeof SIZES
  /** Sobre um grupo já elevado (dentro de painel): o ladrilho sobe mais um tom. */
  raised?: boolean
  className?: string
}

/**
 * Ícone de ferramenta num ladrilho neutro, como os ícones das listas dos apps do sistema.
 * Decorativo: o nome fica no texto ao lado.
 */
export function ToolIcon({ icon, size = 'md', raised = false, className }: ToolIconProps) {
  const dimensions = SIZES[size]
  return (
    <span
      aria-hidden="true"
      className={cx('grid shrink-0 place-items-center text-fg', raised ? 'bg-surface-hover' : 'bg-surface-3', dimensions.box, className)}
    >
      <Icon icon={icon} size={dimensions.icon} />
    </span>
  )
}

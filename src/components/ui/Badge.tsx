import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-border bg-surface-raised text-fg-muted',
  accent: 'border-transparent bg-accent-subtle text-accent-soft',
  success: 'border-transparent bg-success-subtle text-success',
  warning: 'border-transparent bg-warning-subtle text-warning',
  danger: 'border-transparent bg-danger-subtle text-danger',
}

interface BadgeProps {
  variant?: BadgeVariant
  icon?: LucideIcon
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex h-5.5 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
    >
      {icon && <Icon icon={icon} size="sm" className="-ml-0.5 size-3.5" />}
      {children}
    </span>
  )
}

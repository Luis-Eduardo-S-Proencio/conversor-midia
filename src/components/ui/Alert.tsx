import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface VariantStyle {
  icon: LucideIcon
  container: string
  iconColor: string
  role: 'alert' | 'status'
}

// Erro interrompe o leitor de tela (alert); os demais esperam a pausa (status).
const VARIANTS: Record<AlertVariant, VariantStyle> = {
  info: { icon: Info, container: 'border-accent/45 bg-accent-soft', iconColor: 'text-accent', role: 'status' },
  success: { icon: CircleCheck, container: 'border-success/30 bg-success-subtle', iconColor: 'text-success', role: 'status' },
  warning: { icon: TriangleAlert, container: 'border-warning/30 bg-warning-subtle', iconColor: 'text-warning', role: 'status' },
  error: { icon: CircleAlert, container: 'border-danger/30 bg-danger-subtle', iconColor: 'text-danger', role: 'alert' },
}

interface AlertProps {
  variant: AlertVariant
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  /** Desligue para mensagens fixas da página, que não devem ser anunciadas. */
  live?: boolean
  className?: string
}

export function Alert({ variant, title, children, action, live = true, className }: AlertProps) {
  const style = VARIANTS[variant]
  return (
    <div
      role={live ? style.role : undefined}
      className={cx('grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 rounded-lg border px-4 py-3.5', style.container, className)}
    >
      <Icon icon={style.icon} className={cx('mt-px', style.iconColor)} />
      <div className="grid gap-0.5 text-sm">
        <p className="font-semibold text-fg">{title}</p>
        {children && <div className="text-fg-muted">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

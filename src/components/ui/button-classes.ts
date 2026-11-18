import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  iconOnly?: boolean
  className?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap select-none ' +
  'transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-60'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent-emphasis text-on-accent hover:bg-accent-hover active:bg-accent-active',
  secondary: 'border-border bg-surface-raised text-fg hover:border-border-strong',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-surface-raised hover:text-fg',
  danger: 'border-transparent bg-transparent text-danger hover:bg-danger-subtle',
}

// Alvos de 44 px com toque; 40 px com mouse.
const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm pointer-coarse:h-11',
  lg: 'h-12 px-5 text-base',
}

const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  md: 'size-10 pointer-coarse:size-11',
  lg: 'size-12',
}

/** Classes de botão, também usadas para links com aparência de botão. */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  block = false,
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cx(BASE, VARIANTS[variant], iconOnly ? ICON_ONLY_SIZES[size] : SIZES[size], block && 'w-full', className)
}

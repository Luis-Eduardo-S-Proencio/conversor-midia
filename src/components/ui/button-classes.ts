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
  'inline-flex items-center justify-center gap-2 rounded-md border font-semibold whitespace-nowrap select-none ' +
  'transition-[color,background-color,border-color,scale] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-60'

const VARIANTS: Record<ButtonVariant, string> = {
  // Degradê violeta → rosa; cada estado escurece as duas pontas (o texto branco mantém o contraste).
  primary:
    'border-transparent bg-linear-135 from-accent-emphasis to-accent-emphasis-end text-on-accent shadow-accent ' +
    'hover:from-accent-hover hover:to-accent-hover-end active:from-accent-active active:to-accent-active-end',
  secondary: 'border-border bg-surface-raised text-fg hover:border-border-strong hover:bg-surface-overlay',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-surface-raised hover:text-fg',
  danger: 'border-transparent bg-transparent text-danger hover:bg-danger-subtle',
}

// Alvos de 44 px com toque; 40 px com mouse.
const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm pointer-coarse:h-11',
  lg: 'h-12 rounded-lg px-5 text-base',
}

const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  md: 'size-10 pointer-coarse:size-11',
  lg: 'size-12 rounded-lg',
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

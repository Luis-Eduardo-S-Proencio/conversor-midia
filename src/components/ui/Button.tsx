import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ComponentProps, MouseEvent } from 'react'
import { buttonClasses, type ButtonStyleOptions } from './button-classes'
import { Icon } from './Icon'

interface ButtonProps extends ComponentProps<'button'>, Omit<ButtonStyleOptions, 'iconOnly'> {
  icon?: LucideIcon
  /** Mantém o botão focável e anuncia "ocupado", mas ignora cliques. */
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  loading = false,
  className,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      {...rest}
      type={type}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      className={buttonClasses({ variant, size, block, className })}
    >
      {loading ? <Icon icon={LoaderCircle} className="animate-spin" /> : icon && <Icon icon={icon} />}
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  icon: LucideIcon
  /** Nome acessível e dica visual: o botão não tem texto. */
  label: string
  variant?: ButtonStyleOptions['variant']
  size?: ButtonStyleOptions['size']
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={buttonClasses({
        variant,
        size,
        iconOnly: true,
        className: `aria-pressed:border-accent aria-pressed:bg-accent-subtle aria-pressed:text-accent-soft ${className ?? ''}`,
      })}
    >
      <Icon icon={icon} />
    </button>
  )
}

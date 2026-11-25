import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cx } from './cx'

type CardProps<T extends ElementType> = {
  /** Elemento HTML do cartão (section, article, li…). Padrão: div. */
  as?: T
  /** Cartão clicável: sobe 2 px e clareia a borda com mouse; afunda ao tocar. */
  interactive?: boolean
  className?: string
  children?: ReactNode
} & Omit<ComponentProps<T>, 'as' | 'className' | 'children'>

/**
 * Superfície base: grafite em camadas, borda hairline, luz vindo de cima (realce no topo),
 * raio 16 e padding 16 no celular / 20 no computador.
 */
export function Card<T extends ElementType = 'div'>({ as, interactive = false, className, children, ...rest }: CardProps<T>) {
  const Element: ElementType = as ?? 'div'
  return (
    <Element
      {...rest}
      className={cx(
        'surface-card rounded-lg p-4 md:p-5',
        interactive &&
          'pressable transition-[translate,border-color,scale] duration-(--dur-2) hover:pointer-fine:-translate-y-0.5 hover:pointer-fine:border-border-strong',
        className,
      )}
    >
      {children}
    </Element>
  )
}

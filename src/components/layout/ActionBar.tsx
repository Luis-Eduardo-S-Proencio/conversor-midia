import type { ReactNode } from 'react'
import { cx } from '../ui/cx'

interface ActionBarProps {
  className?: string
  children: ReactNode
}

/**
 * Ação principal de uma ferramenta. No celular fica fixa no rodapé, ao alcance do polegar;
 * a rota da ferramenta deve declarar `handle: { hideBottomNav: true }`.
 * A partir de 768 px volta ao fluxo normal da página.
 */
export function ActionBar({ className, children }: ActionBarProps) {
  return (
    <div
      className={cx(
        'sticky bottom-0 z-20 -mx-4 grid gap-2 border-t border-border bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6',
        'md:static md:mx-0 md:border-t-0 md:bg-transparent md:p-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

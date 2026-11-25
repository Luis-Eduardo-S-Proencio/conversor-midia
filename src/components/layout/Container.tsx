import type { ReactNode } from 'react'
import { cx } from '../ui/cx'

interface ContainerProps {
  className?: string
  children: ReactNode
}

/** Largura máxima do conteúdo (1200 px, centralizado) e margem lateral de 16, 24 ou 40 px (--gutter). */
export function Container({ className, children }: ContainerProps) {
  return <div className={cx('mx-auto w-full max-w-[calc(var(--container-page)+2*var(--gutter))] px-(--gutter)', className)}>{children}</div>
}

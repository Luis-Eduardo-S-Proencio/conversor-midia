import type { ReactNode } from 'react'
import { cx } from '../ui/cx'

interface ContainerProps {
  className?: string
  children: ReactNode
}

/** Largura máxima do conteúdo (72rem) e margens laterais de 16, 24 e 32 px. */
export function Container({ className, children }: ContainerProps) {
  return <div className={cx('mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

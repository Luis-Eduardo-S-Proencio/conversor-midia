import { cx } from './cx'

interface SkeletonProps {
  /** Medidas e forma vêm das classes (ex.: "h-24 w-full rounded-md"). */
  className?: string
}

/** Lugar reservado enquanto algo carrega (miniaturas, timeline): evita que a tela pule. */
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={cx('skeleton block rounded-md', className)} />
}

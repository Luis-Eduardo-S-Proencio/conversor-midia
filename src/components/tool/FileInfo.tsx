import { formatFileMeta, type FileMeta } from '../../core/format'
import { cx } from '../ui/cx'

interface FileInfoProps extends FileMeta {
  name: string
  className?: string
}

/** Nome do arquivo e linha técnica ("PNG · 3024 × 4032 · 8,6 MB"). Nomes longos são cortados sem quebrar o layout. */
export function FileInfo({ name, className, ...meta }: FileInfoProps) {
  return (
    <div className={cx('grid min-w-0 gap-1', className)}>
      <p className="truncate text-sm font-medium text-fg" title={name}>
        {name}
      </p>
      <p className="truncate font-mono text-xs text-fg-muted tabular-nums">{formatFileMeta(meta)}</p>
    </div>
  )
}

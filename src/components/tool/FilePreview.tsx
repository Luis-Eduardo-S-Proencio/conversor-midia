import { cx } from '../ui/cx'

interface FilePreviewProps {
  /** URL já criada por quem chama (quem cria a Object URL é responsável por revogá-la). */
  src: string
  alt: string
  className?: string
}

/** Pré-visualização sobre fundo quadriculado, para a transparência ficar visível. */
export function FilePreview({ src, alt, className }: FilePreviewProps) {
  return (
    <div className={cx('grid place-items-center overflow-hidden rounded-lg border border-border bg-checker', className)}>
      <img src={src} alt={alt} decoding="async" className="max-h-[50dvh] w-auto max-w-full object-contain" />
    </div>
  )
}

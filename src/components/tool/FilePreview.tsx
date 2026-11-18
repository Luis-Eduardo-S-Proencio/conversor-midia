import { cx } from '../ui/cx'

interface FilePreviewProps {
  /** URL já criada por quem chama (quem cria a Object URL é responsável por revogá-la). */
  src: string
  alt: string
  /**
   * Cor de fundo que o resultado terá (ex.: branco ao converter transparência para JPG).
   * Sem ela, o quadriculado mostra a transparência. Em ambos os casos o fundo cobre só a imagem.
   */
  backdrop?: string
  className?: string
}

export function FilePreview({ src, alt, backdrop, className }: FilePreviewProps) {
  return (
    <div className={cx('grid min-h-48 place-items-center overflow-hidden rounded-lg border border-border bg-bg p-3', className)}>
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={cx('max-h-[50dvh] w-auto max-w-full object-contain', !backdrop && 'bg-checker')}
        style={backdrop ? { backgroundColor: backdrop } : undefined}
      />
    </div>
  )
}

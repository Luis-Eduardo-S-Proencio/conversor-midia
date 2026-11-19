import { useState, type CSSProperties } from 'react'
import { isUpright, orientationCss, orientedDimensions, type Orientation } from '../../core/image/orientation'
import type { Dimensions } from '../../core/image/resize'
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
  /** Giro e espelhamento escolhidos: a prévia já mostra a imagem como o resultado sairá. */
  orientation?: Orientation
  className?: string
}

/**
 * Caixa com as proporções da imagem já girada, do tamanho natural dela no máximo (como a prévia sem
 * giro). A imagem preenche a caixa e gira em volta do centro: as unidades cqw e cqh medem a caixa.
 */
function orientedLayout(natural: Dimensions, orientation: Orientation): { box: CSSProperties; image: CSSProperties } {
  const visual = orientedDimensions(natural, orientation)
  const turned = orientation.quarterTurns % 2 === 1
  return {
    box: {
      position: 'relative',
      containerType: 'size',
      aspectRatio: `${visual.width} / ${visual.height}`,
      width: `min(100%, ${visual.width}px, calc(50dvh * ${visual.width / visual.height}))`,
    },
    image: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      maxWidth: 'none',
      width: turned ? '100cqh' : '100cqw',
      height: turned ? '100cqw' : '100cqh',
      transform: `translate(-50%, -50%) ${orientationCss(orientation)}`,
    },
  }
}

export function FilePreview({ src, alt, backdrop, orientation, className }: FilePreviewProps) {
  const [natural, setNatural] = useState<Dimensions>()
  const layout = orientation && !isUpright(orientation) && natural ? orientedLayout(natural, orientation) : undefined

  return (
    <div className={cx('grid min-h-48 place-items-center overflow-hidden rounded-lg border border-border bg-bg p-3', className)}>
      {/* Sem giro, o invólucro não gera caixa (contents) e a imagem se ajusta sozinha, como sempre. */}
      <div className={layout ? undefined : 'contents'} style={layout?.box}>
        <img
          src={src}
          alt={alt}
          decoding="async"
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className={cx(!layout && 'max-h-[50dvh] w-auto max-w-full object-contain', !backdrop && 'bg-checker')}
          style={{ ...(backdrop ? { backgroundColor: backdrop } : undefined), ...layout?.image }}
        />
      </div>
    </div>
  )
}

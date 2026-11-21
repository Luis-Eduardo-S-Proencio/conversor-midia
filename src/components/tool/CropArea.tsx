import type { ReactNode } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import './crop-area.css'
import { cropFromPercent, cropToPercent, type CropRect } from '../../core/image/crop'
import type { Dimensions } from '../../core/image/resize'

/** Nomes da área e dos pontos de ajuste para leitor de tela (a biblioteca vem em inglês). */
const ARIA_LABELS = {
  cropArea: 'Área de recorte. Use as setas para mover.',
  nwDragHandle: 'Canto superior esquerdo. Use as setas para ajustar.',
  nDragHandle: 'Borda de cima. Use as setas para ajustar.',
  neDragHandle: 'Canto superior direito. Use as setas para ajustar.',
  eDragHandle: 'Borda direita. Use as setas para ajustar.',
  seDragHandle: 'Canto inferior direito. Use as setas para ajustar.',
  sDragHandle: 'Borda de baixo. Use as setas para ajustar.',
  swDragHandle: 'Canto inferior esquerdo. Use as setas para ajustar.',
  wDragHandle: 'Borda esquerda. Use as setas para ajustar.',
}

interface CropAreaProps {
  /** Medidas do quadro original (imagem ou vídeo), já orientado: a área é guardada em pixels dele. */
  size: Dimensions
  crop: CropRect
  /** Proporção fixa (largura ÷ altura), se escolhida. */
  ratio?: number
  onChange: (crop: CropRect) => void
  disabled?: boolean
  /** A mídia a recortar: `<img>` ou `<video>`, exibida no tamanho que couber. */
  children: ReactNode
}

/**
 * Área de recorte sobre a mídia (react-image-crop): a área e os pontos se ajustam com mouse, dedo ou
 * setas. A seleção é desenhada em porcentagem, então vale para a prévia reduzida e para o original.
 * Os campos de medida (CropOptions) são a alternativa a arrastar (WCAG 2.5.7).
 */
export function CropArea({ size, crop, ratio, onChange, disabled = false, children }: CropAreaProps) {
  return (
    // Folga em volta da mídia: os pontos de ajuste e a área de toque deles passam um pouco da borda.
    <div className="crop-area grid min-h-48 place-items-center rounded-lg border border-border bg-bg p-3 pointer-coarse:p-6">
      <ReactCrop
        crop={{ unit: '%', ...cropToPercent(crop, size) }}
        onChange={(_pixels, percent) => onChange(cropFromPercent(percent, size))}
        aspect={ratio}
        keepSelection
        disabled={disabled}
        ariaLabels={ARIA_LABELS}
        className="ReactCrop--no-animate"
        style={{ maxHeight: '50dvh' }}
      >
        {children}
      </ReactCrop>
    </div>
  )
}

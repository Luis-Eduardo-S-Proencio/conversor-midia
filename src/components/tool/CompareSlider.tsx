import { ChevronsLeftRight } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '../ui/Icon'

interface CompareSliderProps {
  /** Prévia do original (a mesma moldura do resultado). */
  beforeUrl: string
  afterUrl: string
  /** Nome do arquivo, para os textos alternativos. */
  name: string
}

/**
 * Antes e depois sobrepostos, com uma divisória que se arrasta (como nos apps de edição): à esquerda o
 * original, à direita o resultado. Um controle deslizante invisível cobre a imagem: arrastar, tocar
 * e as setas do teclado movem a divisória.
 */
export function CompareSlider({ beforeUrl, afterUrl, name }: CompareSliderProps) {
  const [position, setPosition] = useState(50)

  return (
    <div className="relative grid overflow-hidden rounded-lg bg-checker select-none">
      <img src={beforeUrl} alt={`Antes: ${name}`} className="block max-h-[60dvh] w-full object-contain" draggable={false} />
      <img
        src={afterUrl}
        alt={`Depois: ${name}`}
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        draggable={false}
      />
      <span aria-hidden="true" className="absolute top-2 left-2 rounded-sm bg-bg/75 px-2 py-0.5 text-caption text-fg">
        Antes
      </span>
      <span aria-hidden="true" className="absolute top-2 right-2 rounded-sm bg-bg/75 px-2 py-0.5 text-caption text-fg">
        Depois
      </span>
      {/* A divisória, com a alça no meio. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg shadow-2" style={{ left: `${position}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-9 -translate-1/2 place-items-center rounded-full border border-border-strong bg-surface-3 text-fg shadow-2">
          <Icon icon={ChevronsLeftRight} size="sm" />
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        onChange={(event) => setPosition(Number(event.currentTarget.value))}
        aria-label="Divisória entre antes e depois"
        aria-valuetext={`${100 - position}% do resultado à mostra`}
        className="absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
      />
    </div>
  )
}

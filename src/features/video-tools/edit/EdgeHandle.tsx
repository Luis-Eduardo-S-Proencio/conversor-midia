import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { cx } from '../../../components/ui/cx'
import { formatTime } from '../../../core/video/time'
import type { Edge } from '../../../core/video/timeline'
import { STRIP_HEIGHT, keyStep } from './settings'

/** Largura visível das alças das pontas (o mínimo da WCAG 2.2); a área de toque se estende além dela. */
export const HANDLE_WIDTH = 24

interface EdgeHandleProps {
  edge: Edge
  label: string
  /** Tempo da ponta no vídeo original. */
  value: number
  limits: { min: number; max: number }
  left: number
  pixelsPerSecond: number
  onChange: (value: number) => void
  disabled: boolean
}

/** Alça de uma ponta da parte marcada: arrastar ou usar as setas (0,1 s; com Shift, 1 s). Um controle deslizante para o leitor de tela. */
export function EdgeHandle({ edge, label, value, limits, left, pixelsPerSecond, onChange, disabled }: EdgeHandleProps) {
  const start = useRef<{ x: number; value: number } | null>(null)
  const clamp = (next: number) => Math.min(limits.max, Math.max(limits.min, next))

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const step = keyStep(event.shiftKey)
    const next = event.key === 'ArrowLeft' ? value - step : event.key === 'ArrowRight' ? value + step : null
    if (next === null || disabled) return
    event.preventDefault()
    onChange(clamp(next))
  }

  return (
    <span
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={value}
      aria-valuetext={`${formatTime(value)} do vídeo original`}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (disabled) return
        event.stopPropagation() // não arrasta a barra
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, value }
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        onChange(clamp(start.current.value + (event.clientX - start.current.x) / pixelsPerSecond))
      }}
      onPointerUp={(event) => {
        if (!start.current) return
        onChange(clamp(start.current.value + (event.clientX - start.current.x) / pixelsPerSecond))
        start.current = null
      }}
      className={cx(
        // A faixa invisível (before) aumenta a área de toque para os lados, sem aumentar a alça na tela.
        "absolute top-0 z-20 grid cursor-ew-resize touch-none place-items-center bg-accent text-on-accent before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-['']",
        edge === 'start' ? 'rounded-l-md' : 'rounded-r-md',
        disabled && 'opacity-50',
      )}
      style={{ left, width: HANDLE_WIDTH, height: STRIP_HEIGHT }}
    >
      <Icon icon={edge === 'start' ? ChevronLeft : ChevronRight} size="sm" />
    </span>
  )
}

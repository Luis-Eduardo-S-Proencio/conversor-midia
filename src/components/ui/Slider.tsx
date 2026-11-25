import { useId, useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { Field } from './Field'

type NativeRangeProps = Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'id'
>

interface SliderProps extends NativeRangeProps {
  label: ReactNode
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Texto do valor, exibido e anunciado pelo leitor de tela (ex.: "82%"). */
  formatValue?: (value: number) => string
  /** Valor padrão: toque duplo (ou clique duplo) na trilha volta a ele. */
  resetTo?: number
  hint?: ReactNode
}

/** Intervalo máximo entre dois toques para contar como toque duplo. */
const DOUBLE_TAP_MS = 300

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = String,
  resetTo,
  hint,
  className,
  style,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...rest
}: SliderProps) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const lastTap = useRef(0)
  const valueText = formatValue(value)
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0

  function handlePointerDown(event: PointerEvent<HTMLInputElement>) {
    setDragging(true)
    onPointerDown?.(event)
  }

  function handlePointerUp(event: PointerEvent<HTMLInputElement>) {
    setDragging(false)
    // Toque duplo detectado à mão: o dblclick não é confiável com toque nos celulares.
    const now = event.timeStamp
    if (resetTo !== undefined && now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0
      if (resetTo !== value) onChange(resetTo)
    } else {
      lastTap.current = now
    }
    onPointerUp?.(event)
  }

  function handlePointerCancel(event: PointerEvent<HTMLInputElement>) {
    setDragging(false)
    onPointerCancel?.(event)
  }

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      className={className}
      trailing={
        // Só visual: o leitor de tela já ouve o valor pelo aria-valuetext do slider.
        // (Um <output> seria região de status e anunciaria cada mudança duas vezes.)
        <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-fg">
          {valueText}
        </span>
      }
    >
      {(control) => (
        <div className="relative" style={{ '--fill': `${fill}%` } as CSSProperties}>
          <input
            {...rest}
            {...control}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-valuetext={valueText}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="slider"
            style={{ ...style, '--fill': `${fill}%` } as CSSProperties}
          />
          {dragging && (
            // Balão sobre a alça (que tem 20 px: o centro anda de 10 px a 100% − 10 px).
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 animate-enter rounded-sm bg-fg px-2 py-0.5 text-caption font-semibold text-bg tabular-nums shadow-2"
              style={{ left: `calc(${fill}% + ${10 - fill * 0.2}px)` }}
            >
              {valueText}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}

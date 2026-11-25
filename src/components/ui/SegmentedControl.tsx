import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

interface Thumb {
  x: number
  y: number
  width: number
  height: number
  /** Falso na primeira medida: o indicador aparece no lugar, sem deslizar do canto. */
  animate: boolean
}

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  /** Muitas opções: quebra em linhas de quatro, ocupando a largura toda. Sem isso, uma linha só. */
  columns?: 4
  className?: string
}

const ARROW_STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Escolha única entre poucas opções (ex.: formato de saída).
 * Padrão de grupo de rádio: Tab entra no item marcado e as setas mudam a seleção.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  columns,
  className,
}: SegmentedControlProps<T>) {
  const labelId = useId()
  const group = useRef<HTMLDivElement>(null)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const [thumb, setThumb] = useState<Thumb | null>(null)

  const enabledIndexes = options.flatMap((option, index) => (disabled || option.disabled ? [] : [index]))
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabbableIndex = enabledIndexes.includes(selectedIndex) ? selectedIndex : (enabledIndexes[0] ?? -1)

  // Mede a opção marcada e leva o indicador até ela. Na primeira medida ele aparece já no lugar
  // (sem deslizar do canto); depois desliza. Mede de novo quando a largura muda (fonte, giro da tela).
  useLayoutEffect(() => {
    const container = group.current
    if (!container) return
    const measure = () => {
      const button = buttons.current[selectedIndex]
      if (!button) {
        setThumb(null)
        return
      }
      setThumb((previous) => ({
        x: button.offsetLeft,
        y: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
        animate: previous !== null,
      }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [selectedIndex, options.length])

  function select(index: number) {
    const option = options[index]
    if (!option) return
    // Como no rádio nativo, a opção já marcada não gera mudança (evita refazer resultados à toa).
    if (option.value !== value) onChange(option.value)
    buttons.current[index]?.focus()
  }

  function targetFor(key: string, currentIndex: number): number | undefined {
    if (key === 'Home') return enabledIndexes[0]
    if (key === 'End') return enabledIndexes.at(-1)
    const step = ARROW_STEP[key]
    if (step === undefined) return undefined
    const position = enabledIndexes.indexOf(currentIndex)
    return enabledIndexes[(position + step + enabledIndexes.length) % enabledIndexes.length]
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = targetFor(event.key, index)
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div className={cx('grid gap-2', className)}>
      <span id={labelId} className="text-sm font-medium text-fg">
        {label}
      </span>
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        className={cx(
          'relative grid w-full gap-1 rounded-md border border-border bg-surface-1 p-1',
          columns === 4 ? 'grid-cols-4' : 'auto-cols-fr grid-flow-col sm:w-auto sm:justify-self-start',
        )}
      >
        {/* Indicador que desliza até a opção marcada (só visual: o estado está no aria-checked). */}
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute top-0 left-0 rounded-sm border border-accent/35 bg-accent-soft shadow-1',
            thumb ? 'opacity-100' : 'opacity-0',
            thumb?.animate && 'transition-[translate,width,height] duration-(--dur-3) ease-out',
          )}
          style={thumb ? { width: thumb.width, height: thumb.height, translate: `${thumb.x}px ${thumb.y}px` } : undefined}
        />
        {options.map((option, index) => {
          const checked = index === selectedIndex
          return (
            <button
              key={option.value}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={index === tabbableIndex ? 0 : -1}
              disabled={disabled || option.disabled}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                'relative h-9 rounded-sm text-sm font-semibold tabular-nums transition-colors duration-(--dur-2) pointer-coarse:h-11',
                // Em colunas, as opções encolhem para caber em telas de 320 px.
                columns ? 'min-w-0 px-1' : 'min-w-16 px-3',
                'disabled:cursor-not-allowed disabled:opacity-40',
                // No alto contraste do Windows o indicador some; o sublinhado mantém a seleção visível.
                checked
                  ? 'text-accent forced-colors:underline forced-colors:underline-offset-4'
                  : 'text-fg-muted hover:pointer-fine:not-disabled:text-fg',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

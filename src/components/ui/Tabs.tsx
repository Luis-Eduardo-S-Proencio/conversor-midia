import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  content: ReactNode
}

interface TabsProps<T extends string> {
  /** Nome do conjunto de abas, para o leitor de tela. */
  label: string
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

const ARROW_STEP: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 }

/**
 * Abas com o texto e um traço do acento embaixo da aberta (como nos apps do sistema).
 * Padrão de abas do WAI-ARIA: Tab entra na aba aberta, as setas trocam de aba e o painel vem em seguida.
 */
export function Tabs<T extends string>({ label, items, value, onChange, className }: TabsProps<T>) {
  const baseId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  )
  const selected = items[selectedIndex]

  function select(index: number) {
    const item = items[index]
    if (!item) return
    if (item.value !== value) onChange(item.value)
    buttons.current[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target: number | undefined
    if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = items.length - 1
    else if (ARROW_STEP[event.key] !== undefined) target = (index + (ARROW_STEP[event.key] ?? 0) + items.length) % items.length
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div className={cx('grid gap-5', className)}>
      <div role="tablist" aria-label={label} className="flex border-b border-border">
        {items.map((item, index) => {
          const active = index === selectedIndex
          return (
            <button
              key={item.value}
              ref={(element) => {
                buttons.current[index] = element
              }}
              id={`${baseId}-aba-${item.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${baseId}-painel-${item.value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                'relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-sm font-semibold transition-colors duration-(--dur-2)',
                'focus-visible:-outline-offset-2',
                // O traço fica sobre a linha de baixo da lista; no alto contraste, o sublinhado do texto.
                'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors after:duration-(--dur-2)',
                active
                  ? 'text-fg after:bg-accent forced-colors:underline forced-colors:underline-offset-4'
                  : 'text-fg-muted after:bg-transparent hover:pointer-fine:text-fg',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {selected && (
        <div
          id={`${baseId}-painel-${selected.value}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-aba-${selected.value}`}
          className="grid content-start gap-5 animate-enter focus-visible:outline-offset-4"
        >
          {selected.content}
        </div>
      )}
    </div>
  )
}

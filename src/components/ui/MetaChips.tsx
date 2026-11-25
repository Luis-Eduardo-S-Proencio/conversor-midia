import { cx } from './cx'

export interface MetaItem {
  /** Nome do dado para o leitor de tela ("Formato", "Resolução", "Duração", "Tamanho"). */
  label: string
  value: string
}

interface MetaChipsProps {
  items: readonly MetaItem[]
  /** Entrada em cascata ao aparecer (arquivo recém-carregado). */
  animate?: boolean
  className?: string
}

/**
 * Dados técnicos do arquivo (formato, resolução, duração, tamanho) em pílulas, com algarismos
 * tabulares: os números não "dançam" quando mudam. Lista de definição para o leitor de tela.
 */
export function MetaChips({ items, animate = false, className }: MetaChipsProps) {
  return (
    <dl className={cx('flex flex-wrap gap-1.5', className)}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cx(
            'inline-flex h-7 items-center rounded-full border border-border bg-surface-2 px-2.5 text-caption text-fg-muted tabular-nums',
            animate && 'animate-enter',
          )}
          style={animate ? { animationDelay: `${Math.min(index, 7) * 40}ms` } : undefined}
        >
          <dt className="sr-only">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

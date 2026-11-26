import { useId } from 'react'
import { SHORTCUTS } from '../../app/shortcuts'
import { TransitionLink } from '../../components/layout/TransitionLink'
import { CHIP_CLASSES } from '../../components/ui/Chip'
import { cx } from '../../components/ui/cx'
import { Icon } from '../../components/ui/Icon'

/**
 * Atalhos rápidos: cada um abre a ferramenta já configurada (ex.: Comprimir vídeo para o WhatsApp).
 * No celular, um carrossel sem barra de rolagem; no computador, cabem todos numa linha.
 */
export function QuickShortcuts() {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="grid grid-cols-1 gap-3">
      <h2 id={titleId} className="text-section">
        Atalhos rápidos
      </h2>
      <div className="-mx-(--gutter) lg:mx-0">
        <ul className="scroller-x py-0.5 lg:flex-wrap lg:overflow-visible lg:px-0 lg:[mask-image:none]">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.id}>
              <TransitionLink to={shortcut.to} direction="forward" title={shortcut.hint} className={cx(CHIP_CLASSES, 'text-fg')}>
                <Icon icon={shortcut.icon} size="sm" className="text-fg-muted" />
                {shortcut.label}
                <span className="sr-only">{`: ${shortcut.hint}`}</span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

interface AccordionProps {
  items: readonly AccordionItem[]
  className?: string
}

function AccordionRow({ item, open, onToggle }: { item: AccordionItem; open: boolean; onToggle: () => void }) {
  const buttonId = useId()
  const panelId = useId()
  return (
    <div>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="pressable flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-label text-fg hover:pointer-fine:bg-surface-2 focus-visible:-outline-offset-2"
        >
          {item.title}
          <Icon icon={ChevronDown} className={cx('shrink-0 text-fg-muted transition-transform duration-(--dur-3) ease-out', open && 'rotate-180')} />
        </button>
      </h3>
      {/* Altura suave: a linha da grade vai de 0fr a 1fr. Fechado, o conteúdo fica inerte (fora do Tab e do leitor de tela). */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-(--dur-3) ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-secondary text-fg-muted">{item.content}</div>
        </div>
      </div>
    </div>
  )
}

/** Perguntas que abrem e fecham uma a uma (várias podem ficar abertas). */
export function Accordion({ items, className }: AccordionProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cx('divide-y divide-border', className)}>
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} open={open.has(item.id)} onToggle={() => toggle(item.id)} />
      ))}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { cx } from '../ui/cx'
import { ToolIcon, type ToolTone } from '../ui/ToolIcon'

export interface SwitcherTool {
  id: string
  to: string
  /** Nome de uma palavra ("Converter", "Tamanho"). */
  label: string
  icon: LucideIcon
  tone: ToolTone
}

interface ToolSwitcherProps {
  /** Nome do menu para o leitor de tela ("Ferramentas de imagem"). */
  label: string
  tools: readonly SwitcherTool[]
  /** Chamado antes de ir para outra ferramenta (ex.: para levar o arquivo aberto junto). */
  onSwitch: (tool: SwitcherTool) => void
  className?: string
}

/**
 * Troca de ferramenta dentro do editor, como nos apps de edição: em coluna a partir de 1024 px;
 * abaixo disso, uma fileira que rola para o lado. A ferramenta atual (pelo endereço) leva
 * `aria-current` e não recarrega a tela ao ser tocada de novo.
 */
export function ToolSwitcher({ label, tools, onSwitch, className }: ToolSwitcherProps) {
  const { pathname } = useLocation()
  const list = useRef<HTMLUListElement>(null)

  // Na fileira do celular, a ferramenta atual já aparece centralizada (sem rolar a página).
  // De novo quando a fonte termina de carregar: as larguras dos rótulos mudam.
  useLayoutEffect(() => {
    let active = true
    const center = () => {
      const row = list.current
      const current = row?.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active || !row || !current || row.scrollWidth <= row.clientWidth) return
      row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2
    }
    center()
    void document.fonts.ready.then(center)
    return () => {
      active = false
    }
  }, [pathname])

  return (
    <nav aria-label={label} className={cx('min-w-0', className)}>
      <ul
        ref={list}
        // Relativa: as medidas dos links (offsetLeft) contam a partir da fileira.
        className="relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {tools.map((tool) => {
          const current = tool.to === pathname
          return (
            <li key={tool.id} className="shrink-0">
              <Link
                to={tool.to}
                aria-current={current ? 'page' : undefined}
                onClick={(event) => {
                  if (current) {
                    event.preventDefault()
                    return
                  }
                  onSwitch(tool)
                }}
                className={cx(
                  'flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-fg-muted transition-colors',
                  'hover:bg-surface-raised hover:text-fg lg:w-full lg:flex-col lg:justify-center lg:gap-1.5 lg:px-1 lg:py-2.5 lg:text-center',
                  'aria-[current=page]:bg-surface-raised aria-[current=page]:text-fg aria-[current=page]:ring-1 aria-[current=page]:ring-border-strong',
                  'forced-colors:aria-[current=page]:underline',
                )}
              >
                <ToolIcon icon={tool.icon} tone={tool.tone} />
                {tool.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

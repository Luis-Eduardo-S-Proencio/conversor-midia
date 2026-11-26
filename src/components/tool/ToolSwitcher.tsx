import type { LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { TransitionLink } from '../layout/TransitionLink'
import { CHIP_CLASSES } from '../ui/Chip'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import type { ToolTone } from '../ui/ToolIcon'

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

/** Cor do ícone de cada categoria (a ferramenta atual fica no acento). */
const TONE_TEXT: Record<ToolTone, string> = {
  edit: 'text-cat-edit',
  convert: 'text-cat-convert',
  compress: 'text-cat-compress',
  audio: 'text-cat-audio',
}

/**
 * Troca de ferramenta no celular e no tablet (no computador, quem faz isso é a barra lateral): chips
 * num carrossel, com a atual centralizada. A atual (pelo endereço) leva `aria-current` e não recarrega
 * a tela ao ser tocada de novo.
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
    <nav aria-label={label} className={cx('-mx-(--gutter) min-w-0', className)}>
      {/* Carrossel sem barra de rolagem, com fade nas bordas e encaixe; relativo para medir a posição dos chips. */}
      <ul ref={list} className="scroller-x relative py-0.5">
        {tools.map((tool) => {
          const current = tool.to === pathname
          return (
            // Encaixe pelo centro: a atual fica no meio da fileira, e a rolagem não a puxa de volta para a borda.
            <li key={tool.id} className="snap-center!">
              <TransitionLink
                to={tool.to}
                direction="tab"
                aria-current={current ? 'page' : undefined}
                onClick={(event) => {
                  if (current) {
                    event.preventDefault()
                    return
                  }
                  onSwitch(tool)
                }}
                className={CHIP_CLASSES}
              >
                <Icon icon={tool.icon} size="sm" className={current ? undefined : TONE_TEXT[tool.tone]} />
                {tool.label}
              </TransitionLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

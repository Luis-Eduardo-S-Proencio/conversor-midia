import { useId, useState } from 'react'
import { TOOLS_BY_USAGE, type ToolEntry } from '../../app/tool-catalog'
import { toolTransitionName } from '../../components/layout/tool-transition'
import { TransitionLink } from '../../components/layout/TransitionLink'
import { cx } from '../../components/ui/cx'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { ToolIcon } from '../../components/ui/ToolIcon'
import type { MediaKind } from '../../core/media-kind'
import { ToolCardBody } from '../tool-links'

type Filter = 'all' | MediaKind

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'video', label: 'Vídeo' },
  { value: 'image', label: 'Imagem' },
] as const satisfies ReadonlyArray<{ value: Filter; label: string }>

/**
 * Colunas sem buraco em cada filtro e largura. Todas (12): 4 colunas, 3 linhas (2 no tablet).
 * Vídeo (7): 4 colunas, com o primeiro ocupando 2. Imagem (5): 3 colunas (2 no tablet), com o
 * primeiro ocupando 2. Assim toda linha fecha.
 */
const GRID: Record<Filter, string> = {
  all: 'grid-cols-4 md:grid-cols-2 lg:grid-cols-4',
  video: 'grid-cols-4 md:grid-cols-2 lg:grid-cols-4',
  image: 'grid-cols-3 md:grid-cols-2 lg:grid-cols-3',
}

function ToolLink({ tool, featured }: { tool: ToolEntry; featured: boolean }) {
  const transitionName = toolTransitionName(tool.id)
  return (
    <TransitionLink to={tool.to} direction="forward" className="pressable group block h-full rounded-lg focus-visible:outline-offset-2">
      {/* Celular: ícone grande e o nome curto, como os apps; o destaque vira uma faixa com a descrição. */}
      {featured ? (
        <span className="surface-card flex h-full items-center gap-3 rounded-lg p-3 md:hidden">
          <ToolIcon icon={tool.icon} tone={tool.tone} size="lg" media={tool.media} transitionName={transitionName} />
          <span className="grid min-w-0 gap-0.5 text-left">
            <span className="text-label text-fg">{tool.title}</span>
            <span className="line-clamp-2 text-caption font-normal text-fg-muted">{tool.description}</span>
          </span>
        </span>
      ) : (
        <span className="flex flex-col items-center gap-2 text-center md:hidden">
          <ToolIcon icon={tool.icon} tone={tool.tone} size="lg" media={tool.media} transitionName={transitionName} />
          <span className="line-clamp-2 min-h-8.5 text-caption leading-tight text-fg-muted">{tool.shortTitle}</span>
        </span>
      )}
      {/* Tablet e computador: cartão com título e uma linha de descrição, todos da mesma altura. */}
      <ToolCardBody tool={tool} className="hidden md:flex" />
    </TransitionLink>
  )
}

/** Todas as ferramentas, da mais usada para a menos usada, com filtro por tipo de arquivo. */
export function ToolGrid() {
  const titleId = useId()
  const [filter, setFilter] = useState<Filter>('all')
  const tools = filter === 'all' ? TOOLS_BY_USAGE : TOOLS_BY_USAGE.filter((tool) => tool.media === filter)
  const featuredFirst = filter !== 'all'

  return (
    <section aria-labelledby={titleId} className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-section">
          Ferramentas
        </h2>
        <SegmentedControl label="Mostrar ferramentas de" hideLabel compact options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </div>
      <ul className={cx('grid gap-x-2 gap-y-5 md:gap-3', GRID[filter])}>
        {tools.map((tool, index) => {
          const featured = featuredFirst && index === 0
          return (
            <li key={tool.id} className={cx('animate-enter', featured && 'col-span-2')} style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}>
              <ToolLink tool={tool} featured={featured} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { ChevronRight } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { Link } from 'react-router'
import { TOOL_GROUPS, type ToolEntry, type ToolGroup } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { Icon } from '../components/ui/Icon'
import { ToolIcon } from '../components/ui/ToolIcon'
import { handOffFiles } from '../features/shared/file-handoff'
import { QuickOpen, type OpenedMedia } from './QuickOpen'

/**
 * Um grupo de ferramentas. No celular, grade de ícones com o nome curto (como nos apps);
 * a partir de 768 px, linhas com o nome completo e a descrição.
 */
function ToolGroupCard({ group, onOpen }: { group: ToolGroup; onOpen: (tool: ToolEntry) => void }) {
  return (
    <section aria-labelledby={`grupo-${group.id}`} className="grid content-start gap-3 rounded-xl border border-border bg-surface p-3 md:gap-1 md:p-2">
      <header className="grid gap-0.5 px-1 pt-1 md:px-3 md:pt-3 md:pb-2">
        <h3 id={`grupo-${group.id}`} className="font-bold tracking-tight text-fg">
          {group.title}
        </h3>
        <p className="text-xs text-fg-subtle">{group.description}</p>
      </header>
      <ul className="grid grid-cols-4 gap-x-1 gap-y-3 md:grid-cols-2 md:gap-1 lg:grid-cols-1">
        {group.tools.map((tool) => (
          <li key={tool.id}>
            <Link
              to={tool.to}
              onClick={() => onOpen(tool)}
              className="group flex h-full flex-col items-center gap-2 rounded-lg p-1.5 text-center transition-colors hover:bg-surface-raised md:flex-row md:gap-3 md:p-2.5 md:text-left"
            >
              <ToolIcon icon={tool.icon} tone={tool.tone} size="lg" className="md:hidden" />
              <ToolIcon icon={tool.icon} tone={tool.tone} className="hidden md:grid" />
              <span className="text-xs leading-tight font-medium text-fg-muted md:hidden">{tool.shortTitle}</span>
              <span className="hidden min-w-0 flex-1 gap-0.5 md:grid">
                <span className="text-sm font-semibold text-fg">{tool.title}</span>
                <span className="text-xs text-fg-subtle">{tool.description}</span>
              </span>
              <Icon
                icon={ChevronRight}
                size="sm"
                className="hidden text-fg-subtle transition-transform group-hover:translate-x-0.5 md:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HomePage() {
  // Com um arquivo já aberto, qualquer ferramenta do mesmo tipo o recebe (não só as da pergunta).
  const opened = useRef<OpenedMedia | null>(null)
  const remember = useCallback((media: OpenedMedia | null) => {
    opened.current = media
  }, [])
  const openTool = useCallback((tool: ToolEntry) => {
    const media = opened.current
    if (media && media.kind === tool.media) handOffFiles(media.kind, media.files)
  }, [])

  return (
    <>
      <title>Media Tools · Edite fotos e vídeos no navegador</title>
      <Container className="grid gap-10 py-8 md:gap-12 md:py-12">
        <section aria-labelledby="home-title" className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="grid gap-4">
            <h1 id="home-title" className="text-3xl font-extrabold tracking-tight text-balance md:text-5xl">
              Edite fotos e vídeos <span className="text-brand">direto no navegador</span>
            </h1>
            <p className="max-w-xl text-base text-fg-muted md:text-lg">
              Converta, comprima, recorte e corte em segundos, sem instalar nada.
            </p>
          </div>
          <QuickOpen onOpened={remember} />
        </section>

        <section aria-labelledby="tools-title" className="grid gap-4">
          <h2 id="tools-title" className="text-xl font-bold tracking-tight">
            Todas as ferramentas
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {TOOL_GROUPS.map((group) => (
              <ToolGroupCard key={group.id} group={group} onOpen={openTool} />
            ))}
          </div>
        </section>
      </Container>
    </>
  )
}

import { Film, Image as ImageIcon, Info } from 'lucide-react'
import { toolsFor } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { TransitionLink } from '../components/layout/TransitionLink'
import { FilePickerButton } from '../components/tool/FilePickerButton'
import { PageDropOverlay } from '../components/tool/PageDropOverlay'
import { usePageFileDrop } from '../components/tool/usePageFileDrop'
import { pasteShortcut, usePasteFiles } from '../components/tool/usePasteFiles'
import { Alert } from '../components/ui/Alert'
import { cx } from '../components/ui/cx'
import { Icon } from '../components/ui/Icon'
import { formatBytes } from '../core/format'
import { IMAGE_LIMITS } from '../core/image/inspect'
import type { MediaKind } from '../core/media-kind'
import { VIDEO_LIMITS } from '../core/video/inspect'
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../features/open/accept'
import { FileActionSheet } from '../features/open/FileActionSheet'
import { useOpenMedia } from '../features/open/useOpenMedia'
import { TOOL_ROW_ITEM, ToolCardBody, ToolRowBody } from './tool-links'

interface MediaPageText {
  tabTitle: string
  title: string
  description: string
  open: string
  limits: string
}

const TEXT: Record<MediaKind, MediaPageText> = {
  image: {
    tabTitle: 'Imagens · Media Tools',
    title: 'Ferramentas de imagem',
    description: 'Converta, comprima e edite fotos em JPG, PNG e WEBP.',
    open: 'Abrir imagens',
    limits: `JPG, PNG ou WEBP · até ${formatBytes(IMAGE_LIMITS.maxFileBytes)} e ${IMAGE_LIMITS.maxPixels / 1_000_000} megapixels por foto · até ${IMAGE_LIMITS.maxFiles} de uma vez`,
  },
  video: {
    tabTitle: 'Vídeos · Media Tools',
    title: 'Ferramentas de vídeo',
    description: 'Edite, comprima e converta vídeos, tire o som ou faça um GIF.',
    open: 'Abrir vídeo',
    limits: `MP4, MOV ou WEBM · até ${formatBytes(VIDEO_LIMITS.maxFileBytes)} · um vídeo por vez`,
  },
}

/**
 * Grade sem buraco no tablet e no computador: o primeiro cartão ocupa 2 colunas.
 * Imagens (5): 2 colunas no tablet, 3 no computador. Vídeos (7): 2 no tablet, 4 no computador.
 */
const GRID: Record<MediaKind, string> = {
  image: 'md:grid-cols-2 lg:grid-cols-3',
  video: 'md:grid-cols-2 lg:grid-cols-4',
}

/**
 * Imagens e Vídeos: título, uma linha, o botão grande de abrir (que leva a "O que fazer com este
 * arquivo?") e as ferramentas do tipo. Celular: lista de linhas; tablet e computador: grade de cartões.
 */
export function MediaToolsPage({ media }: { media: MediaKind }) {
  const text = TEXT[media]
  const tools = toolsFor(media)
  const { opened, error, open, close } = useOpenMedia()
  const dragging = usePageFileDrop(open, true)
  usePasteFiles(open, true)

  return (
    <>
      <title>{text.tabTitle}</title>
      <Container className="grid grid-cols-1 gap-6 pt-2 pb-8 md:gap-8 md:pt-8 lg:pt-10">
        <header className="grid gap-4">
          <div className="grid gap-2">
            <h1 className="font-display text-title">{text.title}</h1>
            <p className="max-w-text text-body text-fg-muted">{text.description}</p>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
            <FilePickerButton
              variant="primary"
              size="lg"
              icon={media === 'image' ? ImageIcon : Film}
              accept={media === 'image' ? IMAGE_ACCEPT : VIDEO_ACCEPT}
              multiple={media === 'image'}
              onFiles={open}
            >
              {text.open}
            </FilePickerButton>
            <p className="flex items-start gap-2 text-caption font-normal text-fg-subtle">
              <Icon icon={Info} size="sm" className="mt-px shrink-0" />
              <span className="tabular-nums">{text.limits}</span>
            </p>
          </div>
          {error && (
            <Alert variant="error" title="Não deu para abrir">
              {error}
            </Alert>
          )}
        </header>

        <section aria-label={text.title}>
          {/* Celular: linhas de 72 px num cartão, com divisores recuados. */}
          <ul className="surface-card overflow-hidden rounded-xl md:hidden">
            {tools.map((tool) => (
              <li key={tool.id} className={TOOL_ROW_ITEM}>
                <TransitionLink to={tool.to} direction="forward" className="group block focus-visible:-outline-offset-2">
                  <ToolRowBody tool={tool} />
                </TransitionLink>
              </li>
            ))}
          </ul>
          {/* Tablet e computador: cartões da mesma altura, sem buraco. */}
          <ul className={cx('hidden gap-3 md:grid', GRID[media])}>
            {tools.map((tool, index) => (
              <li key={tool.id} className={index === 0 ? 'md:col-span-2' : undefined}>
                <TransitionLink to={tool.to} direction="forward" className="pressable group block h-full rounded-lg">
                  <ToolCardBody tool={tool} />
                </TransitionLink>
              </li>
            ))}
          </ul>
        </section>

        {/* Computador: arrastar é o gesto principal; a área deixa isso claro (soltar vale em qualquer ponto da página). */}
        <div
          aria-hidden="true"
          data-dragover={dragging || undefined}
          className="viewfinder hidden min-h-40 place-items-center rounded-xl px-8 py-8 text-center lg:grid"
        >
          <p className="grid gap-1">
            <span className="text-label text-fg">{media === 'image' ? 'Arraste imagens para cá' : 'Arraste um vídeo para cá'}</span>
            <span className="text-secondary text-fg-muted">{`Ou use “${text.open}”. Colar (${pasteShortcut()}) também funciona.`}</span>
          </p>
        </div>
      </Container>

      <FileActionSheet opened={opened} onClose={close} onChooseAnother={open} />
      <PageDropOverlay active={dragging} />
    </>
  )
}

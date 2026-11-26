import { Film, Image as ImageIcon } from 'lucide-react'
import { useId } from 'react'
import { toolsFor } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { FilePickerButton } from '../components/tool/FilePickerButton'
import { PageDropOverlay } from '../components/tool/PageDropOverlay'
import { ToolList } from '../components/tool/ToolList'
import { usePageFileDrop } from '../components/tool/usePageFileDrop'
import { usePasteFiles } from '../components/tool/usePasteFiles'
import { Alert } from '../components/ui/Alert'
import { formatBytes } from '../core/format'
import { IMAGE_LIMITS } from '../core/image/inspect'
import type { MediaKind } from '../core/media-kind'
import { VIDEO_LIMITS } from '../core/video/inspect'
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../features/open/accept'
import { FileActionSheet } from '../features/open/FileActionSheet'
import { useOpenMedia } from '../features/open/useOpenMedia'

interface MediaPageText {
  tabTitle: string
  title: string
  description: string
  open: string
  listTitle: string
}

const TEXT: Record<MediaKind, MediaPageText> = {
  image: {
    tabTitle: 'Imagens · Media Tools',
    title: 'Imagens',
    description: `Fotos em JPG, PNG e WEBP, até ${formatBytes(IMAGE_LIMITS.maxFileBytes)} cada. Dá para abrir até ${IMAGE_LIMITS.maxFiles} de uma vez.`,
    open: 'Abrir imagens',
    listTitle: 'Ferramentas de imagem',
  },
  video: {
    tabTitle: 'Vídeos · Media Tools',
    title: 'Vídeos',
    description: `Vídeos em MP4, MOV e WEBM, até ${formatBytes(VIDEO_LIMITS.maxFileBytes)}, um por vez.`,
    open: 'Abrir vídeo',
    listTitle: 'Ferramentas de vídeo',
  },
}

/**
 * Imagens e Vídeos: título, o que dá para abrir, o botão de abrir (que leva a "O que fazer com este
 * arquivo?") e a lista das ferramentas do tipo. Soltar e colar valem em qualquer ponto da página.
 */
export function MediaToolsPage({ media }: { media: MediaKind }) {
  const text = TEXT[media]
  const listTitleId = useId()
  const { opened, error, open, close } = useOpenMedia()
  const dragging = usePageFileDrop(open, true)
  usePasteFiles(open, true)

  return (
    <>
      <title>{text.tabTitle}</title>
      <Container className="pt-3 pb-12 md:pt-8 lg:pt-12">
        <div className="grid max-w-3xl gap-8">
          <header className="grid gap-6">
            <div className="grid gap-2">
              <h1 className="text-title text-fg">{text.title}</h1>
              <p className="max-w-text text-body text-fg-muted">{text.description}</p>
            </div>
            {error && (
              <Alert variant="error" title="Não deu para abrir">
                {error}
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <FilePickerButton
                variant="primary"
                size="lg"
                icon={media === 'image' ? ImageIcon : Film}
                accept={media === 'image' ? IMAGE_ACCEPT : VIDEO_ACCEPT}
                multiple={media === 'image'}
                onFiles={open}
                className="max-sm:w-full"
              >
                {text.open}
              </FilePickerButton>
              <p className="hidden text-secondary text-fg-subtle lg:block">ou arraste para qualquer lugar desta página</p>
            </div>
          </header>

          <section aria-labelledby={listTitleId} className="grid gap-3">
            <h2 id={listTitleId} className="text-section text-fg">
              {text.listTitle}
            </h2>
            <ToolList tools={toolsFor(media)} labelledBy={listTitleId} />
          </section>
        </div>
      </Container>

      <FileActionSheet opened={opened} onClose={close} onChooseAnother={open} />
      <PageDropOverlay active={dragging} />
    </>
  )
}

import { ClipboardPaste, Plus } from 'lucide-react'
import { useId } from 'react'
import { IMAGE_TOOLS, VIDEO_TOOLS } from '../app/tool-catalog'
import { Container } from '../components/layout/Container'
import { FilePickerButton } from '../components/tool/FilePickerButton'
import { PageDropOverlay } from '../components/tool/PageDropOverlay'
import { ToolList } from '../components/tool/ToolList'
import { usePageFileDrop } from '../components/tool/usePageFileDrop'
import { pasteShortcut, readClipboardFiles, usePasteFiles } from '../components/tool/usePasteFiles'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/toast-context'
import { OPEN_ACCEPT } from '../features/open/accept'
import { FileActionSheet } from '../features/open/FileActionSheet'
import { useOpenMedia } from '../features/open/useOpenMedia'
import { DropPanel } from './home/DropPanel'

/**
 * Início: o título, "Abrir foto ou vídeo" (que leva a "O que fazer com este arquivo?") e todas as
 * ferramentas, em duas listas: Vídeo e Imagem (lado a lado no computador). No computador, também a
 * área de soltar e "Colar"; soltar e colar valem em qualquer ponto da página.
 */
export function HomePage() {
  const { opened, error, open, close } = useOpenMedia()
  const dragging = usePageFileDrop(open, true)
  usePasteFiles(open, true)
  const toast = useToast()
  const videoTitleId = useId()
  const imageTitleId = useId()

  async function paste() {
    const files = await readClipboardFiles()
    if (files && files.length > 0) open(files)
    else toast({ message: `Copie uma imagem e use ${pasteShortcut()} aqui para abri-la.` })
  }

  return (
    <>
      <title>Media Tools · Edite fotos e vídeos no navegador</title>
      <Container className="grid gap-10 pt-3 pb-12 md:pt-8 lg:gap-14 lg:pt-12">
        <section aria-labelledby="home-title" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
          <div className="grid content-start gap-6">
            <div className="grid gap-2">
              <h1 id="home-title" className="text-display text-fg">
                Edite fotos e vídeos
              </h1>
              <p className="text-body text-fg-muted">Tudo é feito no seu aparelho. Nada é enviado.</p>
            </div>
            {error && (
              <Alert variant="error" title="Não deu para abrir">
                {error}
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <FilePickerButton variant="primary" size="lg" icon={Plus} accept={OPEN_ACCEPT} onFiles={open} className="max-sm:w-full">
                Abrir foto ou vídeo
              </FilePickerButton>
              <Button
                size="lg"
                icon={ClipboardPaste}
                onClick={() => void paste()}
                aria-keyshortcuts="Control+V Meta+V"
                className="max-lg:hidden"
              >
                Colar
                <kbd className="rounded-sm bg-surface-hover px-1.5 font-sans text-caption font-medium text-fg-muted">{pasteShortcut()}</kbd>
              </Button>
            </div>
          </div>
          <DropPanel onFiles={open} dragging={dragging} className="max-lg:hidden" />
        </section>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          <section aria-labelledby={videoTitleId} className="grid content-start gap-3">
            <h2 id={videoTitleId} className="text-section text-fg">
              Vídeo
            </h2>
            <ToolList tools={VIDEO_TOOLS} labelledBy={videoTitleId} />
          </section>
          <section aria-labelledby={imageTitleId} className="grid content-start gap-3">
            <h2 id={imageTitleId} className="text-section text-fg">
              Imagem
            </h2>
            <ToolList tools={IMAGE_TOOLS} labelledBy={imageTitleId} />
          </section>
        </div>
      </Container>

      <FileActionSheet opened={opened} onClose={close} onChooseAnother={open} />
      <PageDropOverlay active={dragging} />
    </>
  )
}

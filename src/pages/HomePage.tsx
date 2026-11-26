import { ClipboardPaste, FolderOpen, Lock } from 'lucide-react'
import { Container } from '../components/layout/Container'
import { SiteNote } from '../components/layout/SiteNote'
import { FilePickerButton } from '../components/tool/FilePickerButton'
import { PageDropOverlay } from '../components/tool/PageDropOverlay'
import { usePageFileDrop } from '../components/tool/usePageFileDrop'
import { pasteShortcut, readClipboardFiles, usePasteFiles } from '../components/tool/usePasteFiles'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useToast } from '../components/ui/toast-context'
import { MediaBlocks } from './home/MediaBlocks'
import { QuickShortcuts } from './home/QuickShortcuts'
import { ToolGrid } from './home/ToolGrid'
import { UploadPanel } from './home/UploadPanel'
import { OPEN_ACCEPT } from './open/accept'
import { FileActionSheet } from './open/FileActionSheet'
import { useOpenMedia } from './open/useOpenMedia'

/**
 * Início. Celular: dois blocos grandes (Vídeo e Imagem) que abrem o seletor já filtrado; computador:
 * área de abrir arquivo com "Colar". Depois de escolher, sobe "O que fazer com este arquivo?".
 * Embaixo, atalhos rápidos e todas as ferramentas.
 */
export function HomePage() {
  const { opened, error, open, close } = useOpenMedia()
  const dragging = usePageFileDrop(open, true)
  usePasteFiles(open, true)
  const toast = useToast()

  async function paste() {
    const files = await readClipboardFiles()
    if (files && files.length > 0) open(files)
    else toast({ message: `Copie uma imagem e use ${pasteShortcut()} aqui para abri-la.` })
  }

  return (
    <>
      <title>Media Tools · Edite fotos e vídeos no navegador</title>
      <Container className="grid grid-cols-1 gap-8 pt-2 pb-8 md:pt-8 lg:gap-12 lg:pt-10">
        <section aria-labelledby="home-title" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch lg:gap-10">
          <div className="grid content-start gap-3 lg:content-center lg:gap-5">
            <h1 id="home-title" className="font-display text-display">
              Edite fotos e vídeos direto no navegador
            </h1>
            <p className="text-body text-fg-muted">Tudo no seu aparelho. Nada é enviado.</p>
            {error && (
              <Alert variant="error" title="Não deu para abrir">
                {error}
              </Alert>
            )}
            <MediaBlocks onFiles={open} className="mt-3 lg:hidden" />
            <div className="hidden flex-wrap gap-3 lg:flex">
              <FilePickerButton variant="primary" size="lg" icon={FolderOpen} accept={OPEN_ACCEPT} onFiles={open}>
                Abrir arquivo
              </FilePickerButton>
              <Button size="lg" icon={ClipboardPaste} onClick={() => void paste()} aria-keyshortcuts="Control+V Meta+V">
                Colar
                <kbd className="rounded-sm bg-surface-hover px-1.5 font-sans text-caption font-medium text-fg-muted">{pasteShortcut()}</kbd>
              </Button>
            </div>
          </div>
          <UploadPanel onFiles={open} dragging={dragging} className="hidden lg:grid" />
        </section>

        <QuickShortcuts />
        <ToolGrid />

        <p className="flex items-center justify-center gap-2 text-secondary text-fg-muted lg:justify-start">
          <Icon icon={Lock} size="sm" className="text-success" />
          Seus arquivos não saem do aparelho.
        </p>
        <SiteNote />
      </Container>

      <FileActionSheet opened={opened} onClose={close} onChooseAnother={open} />
      <PageDropOverlay active={dragging} />
    </>
  )
}

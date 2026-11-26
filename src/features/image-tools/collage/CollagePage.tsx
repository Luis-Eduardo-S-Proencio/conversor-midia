import { ImagePlus, LayoutDashboard, LayoutGrid, LoaderCircle, Pencil, Plus, Shapes, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { ActionBar } from '../../../components/layout/ActionBar'
import { TopAppBar } from '../../../components/layout/TopAppBar'
import { DownloadActions } from '../../../components/tool/DownloadActions'
import { Dropzone } from '../../../components/tool/Dropzone'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { LeaveGuard } from '../../../components/tool/LeaveGuard'
import { PageDropOverlay } from '../../../components/tool/PageDropOverlay'
import { ResultImage } from '../../../components/tool/ResultMedia'
import { ToolMenuButton } from '../../../components/tool/ToolMenuButton'
import { useWakeLock } from '../../../components/tool/processing'
import { usePageFileDrop } from '../../../components/tool/usePageFileDrop'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { MetaChips } from '../../../components/ui/MetaChips'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { COLLAGE_LIMITS } from '../../../core/image/collage'
import { formatBytes } from '../../../core/format'
import { supportsImageWorker } from '../../../workers/image-client'
import { ReuseResultButton } from '../../open/ReuseResultButton'
import { useOpenFilesSource } from '../../shared/file-handoff'
import { ACCEPTED_TYPES } from '../shared/constants'
import { CollageCanvas } from './CollageCanvas'
import { CollageOptions } from './CollageOptions'
import { useCollage, type Collage } from './useCollage'

const TITLE = 'Criar colagem'

const MODES: readonly { icon: LucideIcon; title: string; text: string }[] = [
  { icon: LayoutGrid, title: 'Grade', text: 'Modelos prontos de 2 a 9 fotos, com borda, cantos e cor do seu jeito.' },
  { icon: Shapes, title: 'Livre', text: 'Fotos soltas sobre um fundo: mova, gire e mude o tamanho de cada uma.' },
]

function CollageActions({ collage, size, onEdit, onReset }: { collage: Collage; size: 'md' | 'lg'; onEdit: () => void; onReset: () => void }) {
  if (collage.phase === 'rendering') {
    return (
      <div className="grid gap-3">
        <ProgressBar label="Montando a colagem" />
        <Button size={size} block onClick={collage.cancel}>
          Cancelar
        </Button>
      </div>
    )
  }
  if (collage.phase === 'done') {
    return (
      <div className="grid gap-2">
        <DownloadActions getFiles={collage.getResultFiles} downloadLabel="Baixar colagem" size={size} stacked />
        <ReuseResultButton kind="image" getFiles={collage.getResultFiles} size={size} />
        <Button variant="ghost" size={size} block icon={Pencil} onClick={onEdit}>
          Editar colagem
        </Button>
        <Button variant="ghost" size={size} block icon={ImagePlus} onClick={onReset}>
          Nova colagem
        </Button>
      </div>
    )
  }
  const missing = collage.photos.length < COLLAGE_LIMITS.minPhotos && !collage.preparing
  return (
    <div className="grid gap-2">
      <Button variant="primary" size={size} block icon={LayoutDashboard} disabled={!collage.canCreate} onClick={() => void collage.create()}>
        {collage.preparing ? 'Preparando…' : TITLE}
      </Button>
      {missing && <p className="text-center text-xs text-fg-muted">Abra pelo menos 2 fotos para montar a colagem.</p>}
    </div>
  )
}

/** Quando ainda não há o que mostrar no quadro: preparando, ou nenhuma foto pôde ser aberta. */
function EmptyStage({ preparing }: { preparing: boolean }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg text-center">
      {preparing ? (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Icon icon={LoaderCircle} className="animate-spin" />
          Preparando as fotos…
        </p>
      ) : (
        <p className="max-w-xs text-sm text-fg-muted">Nenhuma foto pôde ser aberta. Os motivos estão na aba Fotos.</p>
      )}
    </div>
  )
}

/**
 * Criar colagem: de 2 a 9 fotos numa imagem só, em grade (modelos prontos) ou livre (fotos soltas).
 * A prévia é a própria colagem, com as mesmas contas do arquivo; o arquivo sai do Worker de imagens.
 */
export function CollagePage() {
  const collage = useCollage()
  const { batch, phase, result, photos } = collage
  const supported = supportsImageWorker()
  const optionsHeadingId = useId()
  const [canvasNote, setCanvasNote] = useState('')
  const pickerButton = useRef<HTMLButtonElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const focusPickerWhenEmpty = useRef(false)
  const busy = phase === 'rendering'
  const items = batch.items

  const dragging = usePageFileDrop(collage.addFiles, supported && !busy)
  useWakeLock(busy)
  // Indo para outra ferramenta de imagem, as fotos abertas vão junto.
  useOpenFilesSource('image', batch.getOriginalFiles)

  // Pronta: o foco vai para o resultado, onde estão os botões de baixar.
  useEffect(() => {
    if (collage.completedRuns > 0) resultHeading.current?.focus()
  }, [collage.completedRuns])

  // A lista esvaziou: o foco vai para "Selecionar fotos", não para o topo da página.
  useEffect(() => {
    if (items.length > 0 || !focusPickerWhenEmpty.current) return
    focusPickerWhenEmpty.current = false
    pickerButton.current?.focus()
  }, [items.length])

  function handleRemove(id: string) {
    if (items.length === 1) focusPickerWhenEmpty.current = true
    batch.remove(id)
  }

  function handleReset() {
    focusPickerWhenEmpty.current = true
    collage.reset()
  }

  const actions = (size: 'md' | 'lg') => <CollageActions collage={collage} size={size} onEdit={collage.edit} onReset={handleReset} />

  return (
    <>
      <title>{`${TITLE} · Media Tools`}</title>
      <TopAppBar title={TITLE} backTo="/imagens" actions={<ToolMenuButton media="image" />} />
      <div className="mx-auto grid w-full max-w-editor gap-4 px-(--gutter) pt-2 pb-6 lg:grid-cols-[minmax(0,1fr)_var(--panel-w)] lg:gap-x-6">
        <p className="max-w-text text-secondary text-fg-muted lg:col-span-2">
          Junte de 2 a 9 fotos numa imagem só, em grade ou do seu jeito.
        </p>

        {!supported ? (
          <div className="lg:col-span-2">
            <Alert variant="error" title="Navegador sem suporte" live={false}>
              Este navegador não tem os recursos necessários para processar imagens. Use uma versão recente do Chrome, Edge,
              Firefox ou Safari.
            </Alert>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-w-0 content-start gap-5 lg:col-span-2">
            <Dropzone
              buttonRef={pickerButton}
              accept={ACCEPTED_TYPES}
              onFiles={collage.addFiles}
              multiple
              buttonLabel="Selecionar fotos"
              dragLabel="Arraste as fotos para cá"
              hint={`JPG, PNG ou WEBP, de ${COLLAGE_LIMITS.minPhotos} a ${COLLAGE_LIMITS.maxPhotos} fotos`}
              className="lg:min-h-80"
            />
            <ul className="grid gap-3 sm:grid-cols-2" aria-label="Dois jeitos de montar">
              {MODES.map((mode) => (
                <li key={mode.title} className="flex gap-3.5 rounded-lg border border-border bg-surface-1 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-3 text-fg">
                    <Icon icon={mode.icon} />
                  </span>
                  <div className="grid gap-0.5">
                    <p className="text-label text-fg">{mode.title}</p>
                    <p className="text-secondary text-fg-muted">{mode.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <section
              aria-label={phase === 'done' ? 'Como ficou' : 'Colagem'}
              className="min-w-0 rounded-xl bg-stage p-3 sm:p-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start"
            >
              {phase === 'done' && result ? (
                <ResultImage key={result.url} src={result.url} name={result.name} />
              ) : photos.length === 0 ? (
                <EmptyStage preparing={collage.preparing} />
              ) : (
                <CollageCanvas collage={collage} disabled={busy} onAnnounce={setCanvasNote} />
              )}
              {phase === 'editing' && photos.length === 1 && !collage.preparing && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-border bg-surface-1 p-3">
                  <p className="text-sm text-fg-muted">Falta pelo menos mais uma foto.</p>
                  <FilePickerButton accept={ACCEPTED_TYPES} multiple onFiles={collage.addFiles} icon={Plus} size="sm" className="pointer-coarse:h-11">
                    Adicionar fotos
                  </FilePickerButton>
                </div>
              )}
            </section>

            <section
              aria-labelledby={phase === 'done' ? undefined : optionsHeadingId}
              aria-label={phase === 'done' ? 'Resultado' : undefined}
              className="grid content-start gap-5 rounded-xl border border-border bg-surface-1 p-4 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start"
            >
              {phase === 'done' && result ? (
                <div className="grid gap-3">
                  <h2 ref={resultHeading} tabIndex={-1} className="text-lg font-bold tracking-tight focus:outline-none">
                    Colagem pronta
                  </h2>
                  <MetaChips
                    animate
                    items={[
                      { label: 'Formato', value: 'JPG' },
                      { label: 'Medidas', value: `${result.width} × ${result.height}` },
                      { label: 'Tamanho', value: formatBytes(result.size) },
                    ]}
                  />
                  <p className="text-secondary text-fg-muted">Confira como ficou. Para mudar algo, toque em Editar colagem.</p>
                </div>
              ) : (
                <>
                  <h2 id={optionsHeadingId} className="text-lg font-bold tracking-tight">
                    Opções
                  </h2>
                  <CollageOptions collage={collage} onRemove={handleRemove} />
                </>
              )}
              {collage.error && (
                <Alert variant="error" title="A colagem não saiu">
                  {collage.error}
                </Alert>
              )}
              <div className="hidden gap-2 md:grid">{actions('md')}</div>
            </section>
          </>
        )}

        {supported && items.length > 0 && <ActionBar className="md:hidden">{actions('lg')}</ActionBar>}
      </div>

      <p role="status" className="sr-only">
        {batch.announcement}
      </p>
      <p role="status" className="sr-only">
        {collage.announcement}
      </p>
      <p role="status" className="sr-only">
        {canvasNote}
      </p>
      <PageDropOverlay active={dragging} label="Solte as fotos para abrir" />
      <LeaveGuard
        active={busy}
        title="Parar a colagem?"
        description="A colagem ainda está sendo montada. Se sair agora, ela é cancelada."
        confirmLabel="Sair e cancelar"
        cancelLabel="Continuar aqui"
      />
    </>
  )
}

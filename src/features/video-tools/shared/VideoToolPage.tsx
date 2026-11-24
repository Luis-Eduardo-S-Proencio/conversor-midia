import { ArrowLeft, CircleCheck, Download, Eye, Headphones, RefreshCw, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ActionBar } from '../../../components/layout/ActionBar'
import { CompareView } from '../../../components/tool/CompareView'
import { ResultAudio, ResultGif, ResultVideo } from '../../../components/tool/ResultMedia'
import { Container } from '../../../components/layout/Container'
import { PageHeader } from '../../../components/layout/PageHeader'
import { saveBlob } from '../../../components/tool/download'
import { Dropzone } from '../../../components/tool/Dropzone'
import { FileListItem, type FileItemState, type MessageTone } from '../../../components/tool/FileListItem'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { ResultSummary } from '../../../components/tool/ResultSummary'
import { usePageFileDrop } from '../../../components/tool/usePageFileDrop'
import { Alert } from '../../../components/ui/Alert'
import { Button, IconButton } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { formatBytes } from '../../../core/format'
import { ACCEPTED_VIDEO_TYPES } from '../../../core/video/formats'
import { supportsVideoWorker } from '../../../workers/video-client'
import { VideoActions } from './VideoActions'
import { outputTexts, purposeOf, type VideoTool, type VideoToolLabels, type VideoToolState } from './useVideoTool'
import { describeVideo } from './video-meta'

function BackToVideos() {
  return (
    <Link to="/videos" className="inline-flex min-h-11 items-center gap-1.5 text-fg-muted transition-colors hover:text-fg pointer-fine:min-h-0">
      <Icon icon={ArrowLeft} size="sm" />
      Vídeos
    </Link>
  )
}

interface ItemView {
  state: FileItemState
  statusLabel?: string
  message?: string
  messageTone?: MessageTone
}

function describeItem({ phase, message, result }: VideoToolState): ItemView {
  switch (phase) {
    case 'opening':
      return { state: 'pending', statusLabel: 'Abrindo…' }
    case 'rejected':
    case 'failed':
      return { state: 'error', message }
    case 'done':
      // Observação sobre o resultado (ex.: original mantido) no tom informativo, sem cor de erro.
      return { state: 'done', statusLabel: result ? formatBytes(result.size) : undefined, message: result?.note, messageTone: 'info' }
    default:
      // Processando: o progresso aparece junto do botão de cancelar, não aqui.
      return { state: 'ready' }
  }
}

interface VideoToolPageProps {
  title: string
  description: string
  labels: VideoToolLabels
  actionIcon: LucideIcon
  tool: VideoTool
  /** Prévia da ferramenta (player ou área de recorte), mostrada com o vídeo aberto. */
  preview: ReactNode
  /** Opções da ferramenta, mostradas com o vídeo aberto. */
  options: ReactNode
  /** Detalhes do resultado, abaixo do antes e depois (ex.: duração do trecho). */
  resultDetails?: ReactNode
  /** A ferramenta consegue processar este vídeo neste navegador e com estas opções disponíveis. */
  canStart: boolean
  onStart: () => void
}

/**
 * Esqueleto das ferramentas de vídeo, um vídeo por vez: seleção → prévia → opções → processamento → resultado.
 * Cuida de foco, anúncios para leitor de tela, arrastar e soltar na página e da barra de ação no celular.
 */
export function VideoToolPage({ title, description, labels, actionIcon, tool, preview, options, resultDetails, canStart, onStart }: VideoToolPageProps) {
  const { state } = tool
  const optionsHeadingId = useId()
  const fileHeadingId = useId()
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const pickerButton = useRef<HTMLButtonElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)
  const focusPickerWhenEmpty = useRef(false)
  const supported = supportsVideoWorker()
  const texts = outputTexts(labels)
  const ResultMedia = labels.output === 'audio' ? ResultAudio : labels.output === 'gif' ? ResultGif : ResultVideo
  const busy = state.phase === 'processing'
  const opened = state.phase === 'ready' || state.phase === 'processing' || state.phase === 'done' || state.phase === 'failed'

  usePageFileDrop(tool.selectFiles, supported && !busy)

  // Ao terminar, leva o foco ao resultado, onde estão os botões de download.
  useEffect(() => {
    if (tool.completedRuns > 0) resultHeading.current?.focus()
  }, [tool.completedRuns])

  // O botão focado some ao limpar: o foco vai para "Selecionar vídeo", não para o topo.
  useEffect(() => {
    if (state.phase !== 'empty' || !focusPickerWhenEmpty.current) return
    focusPickerWhenEmpty.current = false
    pickerButton.current?.focus()
  }, [state.phase])

  function handleReset() {
    focusPickerWhenEmpty.current = true
    tool.reset()
  }

  /** Leva até a comparação (no celular ela fica acima do painel) e escolhe "Como ficou", que recebe o foco. */
  function showResult() {
    const comparison = compareRef.current
    if (!comparison) return
    comparison.scrollIntoView({ block: 'start' })
    comparison.querySelector<HTMLElement>('[role="radio"]')?.click()
  }

  function handleDownload() {
    const file = tool.getResultFile()
    if (file) saveBlob(file, file.name)
  }

  const actions = (size: 'md' | 'lg') => (
    <VideoActions
      state={state}
      labels={labels}
      icon={actionIcon}
      size={size}
      canStart={canStart}
      onStart={onStart}
      onCancel={tool.cancel}
      onReset={handleReset}
      getFile={tool.getResultFile}
    />
  )

  const waiting = state.phase === 'opening' ? 'Abrindo o vídeo…' : `Escolha outro vídeo para ${purposeOf(labels)}.`

  return (
    <>
      <title>{`${title} · Media Tools`}</title>
      <Container className="grid gap-6 py-8 md:gap-8 md:py-12">
        <PageHeader breadcrumb={<BackToVideos />} title={title} description={description} />

        {!supported ? (
          <Alert variant="error" title="Navegador sem suporte" live={false}>
            Este navegador não tem os recursos necessários para processar vídeos. Use uma versão recente do Chrome, Edge,
            Firefox ou Safari.
          </Alert>
        ) : state.phase === 'empty' ? (
          <Dropzone
            buttonRef={pickerButton}
            accept={ACCEPTED_VIDEO_TYPES}
            onFiles={tool.selectFiles}
            multiple={false}
            buttonLabel="Selecionar vídeo"
            dragLabel="Arraste um vídeo para cá"
            hint="MP4, MOV ou WEBM · até 1 GB"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <section aria-labelledby={fileHeadingId} className="grid min-w-0 gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={fileHeadingId} className="text-lg font-semibold tracking-tight">
                  Vídeo
                </h2>
                <div className="flex flex-wrap gap-2">
                  <FilePickerButton accept={ACCEPTED_VIDEO_TYPES} icon={RefreshCw} multiple={false} onFiles={tool.selectFiles} disabled={busy}>
                    Trocar vídeo
                  </FilePickerButton>
                  <Button variant="ghost" onClick={handleReset} disabled={busy}>
                    Limpar
                  </Button>
                </div>
              </div>

              {state.notice && (
                <Alert variant="warning" title="Um vídeo por vez" live={false}>
                  {state.notice}
                </Alert>
              )}

              {opened &&
                (state.phase === 'done' && state.result ? (
                  <CompareView
                    resultKey={state.result.url}
                    containerRef={compareRef}
                    result={<ResultMedia key={state.result.url} src={state.result.url} name={state.result.name} />}
                    original={preview}
                  />
                ) : (
                  preview
                ))}

              {state.file && (
                <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
                  <FileListItem
                    name={state.file.name}
                    meta={describeVideo(state.file.size, state.info)}
                    showThumbnail={false}
                    {...describeItem(state)}
                    actions={
                      state.phase === 'done' &&
                      state.result && <IconButton icon={Download} label={`Baixar ${state.result.name}`} onClick={handleDownload} />
                    }
                  />
                </ul>
              )}
            </section>

            <section
              aria-labelledby={state.phase === 'done' ? undefined : optionsHeadingId}
              aria-label={state.phase === 'done' ? 'Resultado' : undefined}
              className="grid gap-5 rounded-lg border border-border bg-surface p-4 md:p-5 lg:sticky lg:top-20"
            >
              {state.phase === 'done' && state.file && state.result ? (
                <div className="grid gap-4">
                  <h2 ref={resultHeading} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Icon icon={CircleCheck} className="text-success" />
                    {`${texts.noun} ${labels.done}`}
                  </h2>
                  <p className="truncate text-xs text-fg-muted tabular-nums" title={state.result.name}>
                    {state.result.name}
                  </p>
                  {/* Som e GIF não se comparam ao vídeo de onde saíram: a ferramenta mostra o tamanho nos detalhes. */}
                  {(labels.output ?? 'video') === 'video' && <ResultSummary beforeBytes={state.file.size} afterBytes={state.result.size} />}
                  {resultDetails}
                  <Button icon={labels.output === 'audio' ? Headphones : Eye} onClick={showResult}>
                    {texts.view}
                  </Button>
                </div>
              ) : (
                <>
                  <h2 id={optionsHeadingId} className="text-lg font-semibold tracking-tight">
                    Opções
                  </h2>
                  {opened ? options : <p className="text-sm text-fg-muted">{waiting}</p>}
                </>
              )}
              <div className="hidden gap-2 md:grid">{actions('md')}</div>
              {state.phase === 'done' && (
                // Depois do download, a ação principal; no celular o download fica na barra fixa.
                <Button variant="ghost" icon={SlidersHorizontal} onClick={tool.invalidateResult}>
                  Alterar opções
                </Button>
              )}
            </section>
          </div>
        )}

        {supported && state.phase !== 'empty' && <ActionBar className="md:hidden">{actions('lg')}</ActionBar>}

        <p role="status" className="sr-only">
          {tool.announcement}
        </p>
      </Container>
    </>
  )
}

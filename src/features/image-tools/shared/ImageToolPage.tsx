import { ArrowLeft, Eye, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ActionBar } from '../../../components/layout/ActionBar'
import { Container } from '../../../components/layout/Container'
import { PageHeader } from '../../../components/layout/PageHeader'
import { saveBlob } from '../../../components/tool/download'
import { Dropzone } from '../../../components/tool/Dropzone'
import { usePageFileDrop } from '../../../components/tool/usePageFileDrop'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import type { Orientation } from '../../../core/image/orientation'
import { supportsImageWorker } from '../../../workers/image-client'
import { BatchActions } from './BatchActions'
import { BatchFiles } from './BatchFiles'
import { BatchResult } from './BatchResult'
import type { BatchItem } from './batch-state'
import { ACCEPTED_TYPES, type BatchLabels } from './constants'
import type { ImageBatch } from './useImageBatch'

function BackToImages() {
  return (
    <Link to="/imagens" className="inline-flex min-h-11 items-center gap-1.5 text-fg-muted transition-colors hover:text-fg pointer-fine:min-h-0">
      <Icon icon={ArrowLeft} size="sm" />
      Imagens
    </Link>
  )
}

interface ImageToolPageProps {
  title: string
  description: string
  labels: BatchLabels
  actionIcon: LucideIcon
  batch: ImageBatch
  /** Conteúdo do painel de opções (só as opções desta ferramenta). */
  options: ReactNode
  onStart: () => void
  zipName: string
  /** Cor que o resultado terá onde a imagem é transparente, mostrada na prévia do arquivo único. */
  backdrop?: string
  /** Giro e espelhamento escolhidos, mostrados na prévia e nas miniaturas. */
  orientation?: Orientation
  /** Uma imagem por vez (use junto com `useImageBatch(labels, { singleImage: true })`). */
  singleImage?: boolean
  /** Prévia própria da ferramenta para o arquivo único (ex.: a área de recorte). */
  renderPreview?: (item: BatchItem) => ReactNode
}

/**
 * Esqueleto de toda ferramenta de imagens: seleção → prévia → opções → processamento → resultado.
 * Cuida de foco, anúncios para leitor de tela, arrastar e soltar na página e da barra de ação no celular.
 */
export function ImageToolPage({
  title,
  description,
  labels,
  actionIcon,
  batch,
  options,
  onStart,
  zipName,
  backdrop,
  orientation,
  singleImage = false,
  renderPreview,
}: ImageToolPageProps) {
  const { items, summary } = batch
  const optionsHeadingId = useId()
  const filesHeading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const pickerButton = useRef<HTMLButtonElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)
  const focusPickerWhenEmpty = useRef(false)
  const supported = supportsImageWorker()
  const [onlyItem] = items
  const singleResult = items.length === 1 && onlyItem?.status === 'done' && Boolean(onlyItem.output?.url)

  usePageFileDrop(batch.addFiles, supported && !summary.isProcessing)

  // Ao terminar, leva o foco ao resultado, onde estão os botões de download.
  useEffect(() => {
    if (batch.completedRuns > 0) resultHeading.current?.focus()
  }, [batch.completedRuns])

  // O botão focado some ao esvaziar a lista: o foco vai para "Selecionar imagens", não para o topo.
  useEffect(() => {
    if (items.length > 0 || !focusPickerWhenEmpty.current) return
    focusPickerWhenEmpty.current = false
    pickerButton.current?.focus()
  }, [items.length])

  function handleReset() {
    focusPickerWhenEmpty.current = true
    batch.reset()
  }

  function handleRemove(id: string) {
    if (items.length === 1) {
      focusPickerWhenEmpty.current = true
      batch.remove(id)
      return
    }
    batch.remove(id)
    filesHeading.current?.focus()
  }

  /** Leva até a comparação (no celular ela fica acima do painel) e escolhe "Como ficou", que recebe o foco. */
  function showResult() {
    const comparison = compareRef.current
    if (!comparison) return
    comparison.scrollIntoView({ block: 'start' })
    comparison.querySelector<HTMLElement>('[role="radio"]')?.click()
  }

  function handleDownload(id: string) {
    const file = batch.getResultFile(id)
    if (file) saveBlob(file, file.name)
  }

  const actions = (size: 'md' | 'lg') => (
    <BatchActions
      summary={summary}
      progress={batch.progress}
      labels={labels}
      icon={actionIcon}
      size={size}
      onStart={onStart}
      onCancel={batch.cancel}
      onReset={handleReset}
      getFiles={batch.getResultFiles}
      bundle={() => batch.createZip(zipName)}
    />
  )

  return (
    <>
      <title>{`${title} · Media Tools`}</title>
      <Container className="grid gap-6 py-8 md:gap-8 md:py-12">
        <PageHeader breadcrumb={<BackToImages />} title={title} description={description} />

        {!supported ? (
          <Alert variant="error" title="Navegador sem suporte" live={false}>
            Este navegador não tem os recursos necessários para processar imagens. Use uma versão recente do Chrome, Edge,
            Firefox ou Safari.
          </Alert>
        ) : items.length === 0 ? (
          <Dropzone
            buttonRef={pickerButton}
            accept={ACCEPTED_TYPES}
            onFiles={batch.addFiles}
            multiple={!singleImage}
            buttonLabel={singleImage ? 'Selecionar imagem' : 'Selecionar imagens'}
            dragLabel={singleImage ? 'Arraste uma imagem para cá' : 'Arraste imagens para cá'}
            hint={singleImage ? 'JPG, PNG ou WEBP · até 50 MB' : 'JPG, PNG ou WEBP · até 50 MB por arquivo · até 20 arquivos'}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <BatchFiles
              items={items}
              busy={summary.isProcessing}
              notice={batch.notice}
              headingRef={filesHeading}
              backdrop={backdrop}
              orientation={orientation}
              singleImage={singleImage}
              renderPreview={renderPreview}
              progressVerb={labels.progress}
              compareRef={compareRef}
              onAdd={batch.addFiles}
              onRemove={handleRemove}
              onClear={handleReset}
              onDownload={handleDownload}
            />
            <section
              aria-labelledby={summary.hasResults ? undefined : optionsHeadingId}
              aria-label={summary.hasResults ? 'Resultado' : undefined}
              className="grid gap-5 rounded-lg border border-border bg-surface p-4 md:p-5 lg:sticky lg:top-20"
            >
              {summary.hasResults ? (
                <>
                  <BatchResult items={items} labels={labels} headingRef={resultHeading} />
                  {singleResult && (
                    <Button icon={Eye} onClick={showResult}>
                      Ver como ficou
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h2 id={optionsHeadingId} className="text-lg font-semibold tracking-tight">
                    Opções
                  </h2>
                  {options}
                </>
              )}
              <div className="hidden gap-2 md:grid">{actions('md')}</div>
              {summary.hasResults && (
                // Depois do download, a ação principal; no celular o download fica na barra fixa.
                <Button variant="ghost" icon={SlidersHorizontal} onClick={batch.invalidateResults}>
                  Alterar opções
                </Button>
              )}
            </section>
          </div>
        )}

        {supported && items.length > 0 && <ActionBar className="md:hidden">{actions('lg')}</ActionBar>}

        <p role="status" className="sr-only">
          {batch.announcement}
        </p>
      </Container>
    </>
  )
}

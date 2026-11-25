import { Eye, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { switcherTools } from '../../../app/tool-catalog'
import { saveBlob } from '../../../components/tool/download'
import { Dropzone } from '../../../components/tool/Dropzone'
import { ToolPanel, ToolStage, ToolUnsupported, ToolWorkspace } from '../../../components/tool/ToolWorkspace'
import { usePageFileDrop } from '../../../components/tool/usePageFileDrop'
import { Button } from '../../../components/ui/Button'
import type { Orientation } from '../../../core/image/orientation'
import { supportsImageWorker } from '../../../workers/image-client'
import { handOffFiles } from '../../shared/file-handoff'
import { BatchActions } from './BatchActions'
import { BatchFiles } from './BatchFiles'
import { BatchResult } from './BatchResult'
import type { BatchItem } from './batch-state'
import { ACCEPTED_TYPES, type BatchLabels } from './constants'
import type { ImageBatch } from './useImageBatch'

const IMAGE_SWITCHER = switcherTools('image')
const BACK_TO_IMAGES = { to: '/imagens', label: 'Imagens' }

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
    <ToolWorkspace
      title={title}
      description={description}
      back={BACK_TO_IMAGES}
      tools={IMAGE_SWITCHER}
      toolsLabel="Ferramentas de imagem"
      onSwitch={() => handOffFiles('image', batch.getOriginalFiles())}
      mobileActions={supported && items.length > 0 ? actions('lg') : undefined}
      announcement={batch.announcement}
    >
      {!supported ? (
        <ToolUnsupported media="imagens" />
      ) : items.length === 0 ? (
        <ToolStage empty>
          <Dropzone
            buttonRef={pickerButton}
            accept={ACCEPTED_TYPES}
            onFiles={batch.addFiles}
            multiple={!singleImage}
            buttonLabel={singleImage ? 'Selecionar imagem' : 'Selecionar imagens'}
            dragLabel={singleImage ? 'Arraste uma imagem para cá' : 'Arraste imagens para cá'}
            hint={singleImage ? 'JPG, PNG ou WEBP · até 50 MB' : 'JPG, PNG ou WEBP · até 50 MB por arquivo · até 20 arquivos'}
            className="w-full max-w-xl"
          />
        </ToolStage>
      ) : (
        <>
          <ToolStage>
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
          </ToolStage>
          <ToolPanel labelledBy={summary.hasResults ? undefined : optionsHeadingId} label={summary.hasResults ? 'Resultado' : undefined}>
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
                <h2 id={optionsHeadingId} className="text-lg font-bold tracking-tight">
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
          </ToolPanel>
        </>
      )}
    </ToolWorkspace>
  )
}

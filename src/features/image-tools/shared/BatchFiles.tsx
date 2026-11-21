import { Download, Eye, Plus, RefreshCw, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react'
import { CompareView } from '../../../components/tool/CompareView'
import { FileListItem, type FileItemState, type MessageTone } from '../../../components/tool/FileListItem'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { FilePreview } from '../../../components/tool/FilePreview'
import { ResultImage } from '../../../components/tool/ResultMedia'
import { Alert } from '../../../components/ui/Alert'
import { Button, IconButton } from '../../../components/ui/Button'
import { formatBytes, formatFileMeta } from '../../../core/format'
import { IMAGE_FORMATS } from '../../../core/image/formats'
import { IMAGE_LIMITS } from '../../../core/image/inspect'
import type { Orientation } from '../../../core/image/orientation'
import type { BatchItem } from './batch-state'
import { ACCEPTED_TYPES } from './constants'

const ANIMATION_WARNING = 'Só o primeiro quadro da animação será usado.'

interface ItemView {
  state: FileItemState
  meta: string
  statusLabel?: string
  message?: string
  messageTone?: MessageTone
}

function describeItem(item: BatchItem): ItemView {
  const meta = item.image
    ? formatFileMeta({ format: IMAGE_FORMATS[item.image.format].label, width: item.image.width, height: item.image.height, sizeBytes: item.size })
    : formatBytes(item.size)
  switch (item.status) {
    case 'inspecting':
      return { state: 'pending', meta }
    case 'ready':
      return item.image?.animated ? { state: 'ready', meta, message: ANIMATION_WARNING, messageTone: 'warning' } : { state: 'ready', meta }
    case 'queued':
      return { state: 'queued', meta, statusLabel: 'Na fila' }
    case 'processing':
      return { state: 'processing', meta }
    case 'done':
      return {
        state: 'done',
        meta,
        statusLabel: item.output ? formatBytes(item.output.size) : undefined,
        message: item.output?.note,
        messageTone: 'info',
      }
    case 'rejected':
    case 'failed':
      return { state: 'error', meta, message: item.message }
  }
}

interface BatchFilesProps {
  items: readonly BatchItem[]
  busy: boolean
  notice?: string
  headingRef: RefObject<HTMLHeadingElement | null>
  /** Cor de fundo que o resultado terá onde a imagem é transparente (prévia do arquivo único). */
  backdrop?: string
  /** Giro e espelhamento escolhidos: prévia e miniaturas já mostram o resultado. */
  orientation?: Orientation
  /** Ferramenta de uma imagem por vez: o botão troca a imagem em vez de adicionar outras. */
  singleImage?: boolean
  /** Prévia própria da ferramenta para o arquivo único (ex.: a área de recorte), no lugar da prévia comum. */
  renderPreview?: (item: BatchItem) => ReactNode
  /** Gerúndio da ferramenta ("Comprimindo"), para o nome da barra de progresso. */
  progressVerb: string
  /** A comparação do arquivo único, para o botão "Ver como ficou" do painel levar até ela. */
  compareRef?: Ref<HTMLDivElement>
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onDownload: (id: string) => void
}

interface ResultComparisonProps {
  item: BatchItem
  /** Nome acessível da prévia original. */
  name: string
  containerRef?: Ref<HTMLDivElement>
}

/** Como ficou e o original, um de cada vez. A prévia original sai sem o giro e o fundo escolhidos: é a imagem de antes. */
function ResultComparison({ item, name, containerRef }: ResultComparisonProps) {
  const url = item.output?.url
  if (!url || !item.output || !item.previewUrl) return null
  return (
    <CompareView
      resultKey={url}
      containerRef={containerRef}
      result={<ResultImage key={url} src={url} name={item.output.name} />}
      original={<FilePreview src={item.previewUrl} alt={`Pré-visualização de ${name}`} />}
    />
  )
}

/** Arquivo único com prévia grande; vários, em lista com miniaturas. Erros aparecem por arquivo. */
export function BatchFiles({
  items,
  busy,
  notice,
  headingRef,
  backdrop,
  orientation,
  singleImage = false,
  renderPreview,
  progressVerb,
  compareRef,
  onAdd,
  onRemove,
  onClear,
  onDownload,
}: BatchFilesProps) {
  const headingId = useId()
  const viewingHeadingId = useId()
  const viewingHeading = useRef<HTMLHeadingElement>(null)
  const [viewingId, setViewingId] = useState<string>()
  const [first] = items
  const single = items.length === 1 && first?.previewUrl ? first : undefined
  // No lote, a comparação de um arquivo pronto abre acima da lista; some quando o resultado é descartado.
  const viewing = single ? undefined : items.find((item) => item.id === viewingId && item.status === 'done' && item.output?.url)

  useEffect(() => {
    if (viewingId) viewingHeading.current?.focus()
  }, [viewingId])

  function closeViewing() {
    setViewingId(undefined)
    headingRef.current?.focus()
  }

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight">
          {items.length === 1 ? '1 arquivo' : `${items.length} arquivos`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {singleImage ? (
            <FilePickerButton accept={ACCEPTED_TYPES} icon={RefreshCw} multiple={false} onFiles={onAdd} disabled={busy}>
              Trocar imagem
            </FilePickerButton>
          ) : (
            <FilePickerButton accept={ACCEPTED_TYPES} icon={Plus} onFiles={onAdd} disabled={busy || items.length >= IMAGE_LIMITS.maxFiles}>
              Adicionar
            </FilePickerButton>
          )}
          <Button variant="ghost" onClick={onClear} disabled={busy}>
            Limpar
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant="warning" title="Limite de arquivos" live={false}>
          {notice}
        </Alert>
      )}

      {single?.previewUrl &&
        (single.status === 'done' && single.output?.url ? (
          <ResultComparison item={single} name={single.name} containerRef={compareRef} />
        ) : renderPreview ? (
          renderPreview(single)
        ) : (
          <FilePreview
            src={single.previewUrl}
            alt={`Pré-visualização de ${single.name}`}
            backdrop={single.image?.hasAlpha ? backdrop : undefined}
            orientation={orientation}
          />
        ))}

      {viewing && (
        <section aria-labelledby={viewingHeadingId} className="grid gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id={viewingHeadingId} ref={viewingHeading} tabIndex={-1} className="min-w-0 truncate text-sm font-semibold">
              {`Como ficou: ${viewing.output?.name ?? viewing.name}`}
            </h3>
            <IconButton icon={X} label="Fechar a comparação" onClick={closeViewing} />
          </div>
          <ResultComparison item={viewing} name={viewing.name} />
        </section>
      )}

      <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {items.map((item) => (
          <FileListItem
            key={item.id}
            name={item.name}
            thumbnailUrl={single ? undefined : item.thumbnailUrl}
            showThumbnail={!single}
            orientation={orientation}
            progressLabel={`${progressVerb} ${item.name}`}
            {...describeItem(item)}
            actions={
              <>
                {item.status === 'done' && !single && item.output?.url && (
                  <IconButton icon={Eye} label={`Ver como ficou ${item.output.name}`} onClick={() => setViewingId(item.id)} />
                )}
                {item.status === 'done' && (
                  <IconButton icon={Download} label={`Baixar ${item.output?.name ?? item.name}`} onClick={() => onDownload(item.id)} />
                )}
                {!busy && <IconButton icon={X} label={`Remover ${item.name}`} onClick={() => onRemove(item.id)} />}
              </>
            }
          />
        ))}
      </ul>
    </section>
  )
}

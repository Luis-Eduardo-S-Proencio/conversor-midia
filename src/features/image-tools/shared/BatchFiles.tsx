import { Download, Plus, X } from 'lucide-react'
import { useId, type RefObject } from 'react'
import { FileListItem, type FileItemState, type MessageTone } from '../../../components/tool/FileListItem'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { FilePreview } from '../../../components/tool/FilePreview'
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
  /** Gerúndio da ferramenta ("Comprimindo"), para o nome da barra de progresso. */
  progressVerb: string
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onDownload: (id: string) => void
}

/** Arquivo único com prévia grande; vários, em lista com miniaturas. Erros aparecem por arquivo. */
export function BatchFiles({
  items,
  busy,
  notice,
  headingRef,
  backdrop,
  orientation,
  progressVerb,
  onAdd,
  onRemove,
  onClear,
  onDownload,
}: BatchFilesProps) {
  const headingId = useId()
  const [first] = items
  const single = items.length === 1 && first?.previewUrl ? first : undefined

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight">
          {items.length === 1 ? '1 arquivo' : `${items.length} arquivos`}
        </h2>
        <div className="flex flex-wrap gap-2">
          <FilePickerButton accept={ACCEPTED_TYPES} icon={Plus} onFiles={onAdd} disabled={busy || items.length >= IMAGE_LIMITS.maxFiles}>
            Adicionar
          </FilePickerButton>
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

      {single?.previewUrl && (
        <FilePreview
          src={single.previewUrl}
          alt={`Pré-visualização de ${single.name}`}
          backdrop={single.image?.hasAlpha ? backdrop : undefined}
          orientation={orientation}
        />
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

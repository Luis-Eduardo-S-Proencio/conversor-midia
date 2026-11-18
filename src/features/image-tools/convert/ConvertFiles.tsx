import { Download, Plus, X } from 'lucide-react'
import { useId, type RefObject } from 'react'
import { FileListItem, type FileItemState } from '../../../components/tool/FileListItem'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { FilePreview } from '../../../components/tool/FilePreview'
import { Alert } from '../../../components/ui/Alert'
import { Button, IconButton } from '../../../components/ui/Button'
import { formatBytes, formatFileMeta } from '../../../core/format'
import { IMAGE_FORMATS } from '../../../core/image/formats'
import { IMAGE_LIMITS } from '../../../core/image/inspect'
import type { ConvertItem } from './convert-state'
import { ACCEPTED_TYPES, BACKGROUND_COLORS, type ConvertSettings } from './settings'

const ANIMATION_WARNING = 'Só o primeiro quadro da animação será convertido.'

interface ItemView {
  state: FileItemState
  meta: string
  statusLabel?: string
  message?: string
  messageTone?: 'error' | 'warning'
}

function describeItem(item: ConvertItem): ItemView {
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
    case 'converting':
      return { state: 'processing', meta }
    case 'done':
      return { state: 'done', meta, statusLabel: item.output ? formatBytes(item.output.size) : undefined }
    case 'rejected':
    case 'failed':
      return { state: 'error', meta, message: item.message }
  }
}

interface ConvertFilesProps {
  items: readonly ConvertItem[]
  settings: ConvertSettings
  busy: boolean
  notice?: string
  headingRef: RefObject<HTMLHeadingElement | null>
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onDownload: (id: string) => void
}

/** Arquivo único com prévia grande; vários, em lista com miniaturas. Erros aparecem por arquivo. */
export function ConvertFiles({ items, settings, busy, notice, headingRef, onAdd, onRemove, onClear, onDownload }: ConvertFilesProps) {
  const headingId = useId()
  const [first] = items
  const single = items.length === 1 && first?.previewUrl ? first : undefined
  // Converter transparência para JPG: a prévia já mostra o fundo que o arquivo terá.
  const backdrop = IMAGE_FORMATS[settings.target].supportsAlpha ? undefined : BACKGROUND_COLORS[settings.background]

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
        />
      )}

      <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {items.map((item) => (
          <FileListItem
            key={item.id}
            name={item.name}
            thumbnailUrl={single ? undefined : item.thumbnailUrl}
            showThumbnail={!single}
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

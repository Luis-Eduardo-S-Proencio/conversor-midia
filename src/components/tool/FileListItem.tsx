import { Check, CircleAlert, Image as ImageIcon, ImageOff, Info, LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'

export type FileItemState = 'pending' | 'ready' | 'queued' | 'processing' | 'done' | 'error'

export type MessageTone = 'error' | 'warning' | 'info'

const MESSAGE_STYLES: Record<MessageTone, { icon: LucideIcon; color: string }> = {
  error: { icon: CircleAlert, color: 'text-danger' },
  warning: { icon: TriangleAlert, color: 'text-warning' },
  info: { icon: Info, color: 'text-fg-muted' },
}

interface FileListItemProps {
  name: string
  /** Linha técnica já formatada ("PNG · 3024 × 4032 · 8,6 MB"). */
  meta?: string
  thumbnailUrl?: string
  state: FileItemState
  /** Texto curto do estado, como "Na fila" ou o tamanho do resultado. */
  statusLabel?: string
  message?: string
  messageTone?: MessageTone
  /** Nome da barra de progresso para leitor de tela, com o verbo da ferramenta ("Comprimindo foto.jpg"). */
  progressLabel?: string
  actions?: ReactNode
  /** Desligue quando uma prévia grande do mesmo arquivo já aparece acima. */
  showThumbnail?: boolean
}

function StatusBadge({ state, label }: { state: FileItemState; label: string }) {
  return (
    <Badge variant={state === 'done' ? 'success' : 'neutral'} icon={state === 'done' ? Check : undefined}>
      {label}
    </Badge>
  )
}

function Thumbnail({ url, state }: { url?: string; state: FileItemState }) {
  if (url) return <img src={url} alt="" decoding="async" className="size-full object-contain" />
  if (state === 'pending') return <Icon icon={LoaderCircle} className="animate-spin" />
  return <Icon icon={state === 'error' ? ImageOff : ImageIcon} />
}

/**
 * Um arquivo numa lista de ferramenta. A miniatura é decorativa (alt vazio): o nome está ao lado.
 * Use dentro de uma lista: `<ul className="grid gap-px overflow-hidden rounded-lg border bg-border">`.
 */
export function FileListItem({
  name,
  meta,
  thumbnailUrl,
  state,
  statusLabel,
  message,
  messageTone = 'error',
  progressLabel = `Processando ${name}`,
  actions,
  showThumbnail = true,
}: FileListItemProps) {
  return (
    <li
      className={cx(
        'grid items-center gap-3 bg-surface px-4 py-3',
        showThumbnail ? 'grid-cols-[3rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]',
      )}
    >
      {showThumbnail && (
        <span className="grid size-12 place-items-center overflow-hidden rounded-sm bg-checker text-fg-subtle">
          <Thumbnail url={thumbnailUrl} state={state} />
        </span>
      )}
      <div className="grid min-w-0 gap-1">
        <p className="truncate text-sm font-medium text-fg" title={name}>
          {name}
        </p>
        {meta && <p className="truncate font-mono text-xs text-fg-muted tabular-nums">{meta}</p>}
        {/* Em telas estreitas o estado fica sob o nome, para não espremê-lo. A visibilidade fica num
            invólucro: no próprio Badge, `hidden` disputaria com o `inline-flex` dele. */}
        {statusLabel && (
          <span className="justify-self-start sm:hidden">
            <StatusBadge state={state} label={statusLabel} />
          </span>
        )}
        {state === 'processing' && <ProgressBar label={progressLabel} hideLabel />}
        {message && (
          <p className={cx('flex gap-1.5 text-xs', MESSAGE_STYLES[messageTone].color)}>
            <Icon icon={MESSAGE_STYLES[messageTone].icon} size="sm" className="mt-px size-3.5" />
            <span>{message}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {statusLabel && (
          <span className="hidden sm:block">
            <StatusBadge state={state} label={statusLabel} />
          </span>
        )}
        {actions}
      </div>
    </li>
  )
}

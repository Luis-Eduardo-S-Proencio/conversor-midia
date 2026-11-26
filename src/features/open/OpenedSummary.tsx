import { useEffect, useRef, useState } from 'react'
import { MetaChips, type MetaItem } from '../../components/ui/MetaChips'
import { formatBytes, formatDimensions } from '../../core/format'
import { formatTime } from '../../core/video/time'
import type { OpenedMedia } from './useOpenMedia'

interface MediaMeta {
  width: number
  height: number
  /** Em segundos (só vídeo). */
  duration?: number
}

/**
 * Miniatura do primeiro arquivo: a URL temporária é ligada direto no elemento e liberada ao trocar de
 * arquivo ou fechar. As medidas (e a duração do vídeo) vêm do que o navegador lê dela.
 */
function Thumbnail({ file, kind, onMeta }: { file: File; kind: OpenedMedia['kind']; onMeta: (meta: MediaMeta) => void }) {
  const image = useRef<HTMLImageElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const element = kind === 'image' ? image.current : video.current
    // "#t=0.1": o Safari só mostra um quadro do vídeo parado quando o tempo inicial é pedido.
    if (element) element.src = kind === 'image' ? url : `${url}#t=0.1`
    return () => {
      element?.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file, kind])

  const box = 'size-16 shrink-0 rounded-md border border-border object-cover'
  if (kind === 'image') {
    return (
      <img
        ref={image}
        alt=""
        className={`${box} bg-checker`}
        onLoad={(event) => onMeta({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      />
    )
  }
  return (
    <video
      ref={video}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={`${box} bg-stage`}
      onLoadedMetadata={(event) => {
        const element = event.currentTarget
        if (element.videoWidth > 0) onMeta({ width: element.videoWidth, height: element.videoHeight, duration: element.duration })
      }}
    />
  )
}

/** O que foi aberto: miniatura, nome e dados (formato, medidas, duração, tamanho) com algarismos tabulares. */
export function OpenedSummary({ opened }: { opened: OpenedMedia }) {
  const [first] = opened.files
  const [meta, setMeta] = useState<{ file: File; value: MediaMeta }>()
  if (!first) return null

  const count = opened.files.length
  const total = opened.files.reduce((sum, file) => sum + file.size, 0)
  const current = meta?.file === first ? meta.value : undefined
  const items: MetaItem[] =
    count > 1
      ? [
          { label: 'Arquivos', value: `${count} imagens` },
          { label: 'Tamanho', value: formatBytes(total) },
        ]
      : [
          { label: 'Formato', value: opened.formatLabel },
          ...(current ? [{ label: 'Medidas', value: formatDimensions(current.width, current.height) }] : []),
          ...(current?.duration && Number.isFinite(current.duration) ? [{ label: 'Duração', value: formatTime(current.duration) }] : []),
          { label: 'Tamanho', value: formatBytes(total) },
        ]

  return (
    <div className="flex items-center gap-3">
      <span className="relative">
        <Thumbnail file={first} kind={opened.kind} onMeta={(value) => setMeta({ file: first, value })} />
        {count > 1 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -bottom-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-surface-1 bg-surface-3 px-1 text-xs font-semibold text-fg tabular-nums"
          >
            {count}
          </span>
        )}
      </span>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="truncate text-sm font-semibold text-fg">{count > 1 ? `${first.name} e mais ${count - 1}` : first.name}</p>
        <MetaChips items={items} animate />
      </div>
    </div>
  )
}

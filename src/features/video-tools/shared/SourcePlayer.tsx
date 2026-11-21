import { useState } from 'react'

/**
 * O vídeo escolhido, com os controles do navegador (teclado incluído), para conferir antes de processar.
 * Use com `key` do vídeo para recomeçar a cada vídeo novo.
 */
export function SourcePlayer({ src, name }: { src: string; name: string }) {
  const [unplayable, setUnplayable] = useState(false)
  return (
    <div className="grid gap-3">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={`Vídeo ${name}`}
        onError={() => setUnplayable(true)}
        className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
      />
      {unplayable && <p className="text-sm text-fg-muted">Este navegador não consegue mostrar este vídeo.</p>}
    </div>
  )
}

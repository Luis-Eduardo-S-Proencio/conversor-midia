import { useState } from 'react'
import { FilePreview } from './FilePreview'

function Unviewable({ children }: { children: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-border bg-bg p-6 text-center text-sm text-fg-muted">
      <p>{children}</p>
    </div>
  )
}

interface ResultMediaProps {
  /** URL temporária do resultado (quem a cria a libera). */
  src: string
  /** Nome do arquivo gerado, para o nome acessível. */
  name: string
}

/**
 * A imagem gerada, como ela ficou. Alguns formatos o navegador não mostra (TIFF fora do Safari, PDF):
 * aí a pessoa é orientada a baixar para ver. Use com `key={src}` para recomeçar a cada resultado.
 */
export function ResultImage({ src, name }: ResultMediaProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Unviewable>Este navegador não mostra este formato de arquivo. Baixe para ver como ficou.</Unviewable>
  return <FilePreview src={src} alt={`Como ficou: ${name}`} onError={() => setFailed(true)} />
}

/** O vídeo gerado, com os controles do navegador. Use com `key={src}` para recomeçar a cada resultado. */
export function ResultVideo({ src, name }: ResultMediaProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Unviewable>Este navegador não consegue mostrar este vídeo. Baixe para ver como ficou.</Unviewable>
  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label={`Como ficou: ${name}`}
      onError={() => setFailed(true)}
      className="max-h-[50dvh] w-full rounded-lg border border-border bg-bg"
    />
  )
}

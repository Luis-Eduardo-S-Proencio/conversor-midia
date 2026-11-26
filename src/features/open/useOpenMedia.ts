import { useCallback, useRef, useState } from 'react'
import { MEDIA_SIGNATURE_BYTES, detectMedia, planOpening, type DetectedMedia, type MediaKind } from '../../core/media-kind'

/** Arquivos abertos numa tela de entrada (Início, Imagens, Vídeos), à espera da ferramenta escolhida. */
export interface OpenedMedia {
  kind: MediaKind
  files: readonly File[]
  /** Formato do primeiro arquivo, pelo conteúdo ("JPG", "MP4"). */
  formatLabel: string
}

async function readMedia(file: File): Promise<DetectedMedia | null> {
  try {
    return detectMedia(new Uint8Array(await file.slice(0, MEDIA_SIGNATURE_BYTES).arrayBuffer()))
  } catch {
    return null // arquivo ilegível (ex.: apagado depois de escolhido): vira "não é imagem nem vídeo"
  }
}

/**
 * Abre uma foto, várias fotos ou um vídeo: reconhece o tipo pelos primeiros bytes (nunca pela extensão)
 * e decide se dá para seguir. O arquivo fica só na memória da aba.
 */
export function useOpenMedia() {
  const [opened, setOpened] = useState<OpenedMedia | null>(null)
  const [error, setError] = useState('')
  const request = useRef(0)

  const open = useCallback((incoming: File[]) => {
    const current = ++request.current
    void Promise.all(incoming.map(readMedia)).then((detected) => {
      if (current !== request.current) return // outro arquivo foi escolhido no meio da leitura
      const plan = planOpening(incoming.map((file, index) => ({ name: file.name, kind: detected[index]?.kind ?? null })))
      if (!plan.ok) {
        setOpened(null)
        setError(plan.message)
        return
      }
      setError('')
      setOpened({ kind: plan.kind, files: incoming, formatLabel: detected[0]?.formatLabel ?? '' })
    })
  }, [])

  const close = useCallback(() => setOpened(null), [])

  return { opened, error, open, close }
}

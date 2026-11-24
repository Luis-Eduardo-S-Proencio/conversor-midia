import { useEffect, useLayoutEffect, useRef } from 'react'
import type { MediaKind } from '../../core/media-kind'

/**
 * Arquivos entregues de uma tela para a próxima ferramenta (ex.: escolhidos no Início).
 * Ficam só na memória desta aba, como os arquivos abertos em qualquer ferramenta:
 * nada é salvo no aparelho nem enviado a lugar algum.
 */
interface HandOff {
  kind: MediaKind
  files: readonly File[]
}

let pending: HandOff | null = null

/** Guarda os arquivos para a próxima ferramenta deste tipo que abrir. */
export function handOffFiles(kind: MediaKind, files: readonly File[]): void {
  pending = files.length > 0 ? { kind, files: [...files] } : null
}

/** Arquivos deixados para uma ferramenta deste tipo, sem retirá-los. */
export function peekHandOff(kind: MediaKind): readonly File[] | null {
  return pending?.kind === kind ? pending.files : null
}

/** Retira os arquivos entregues (só se ainda forem os mesmos). */
export function clearHandOff(files: readonly File[]): void {
  if (pending?.files === files) pending = null
}

/**
 * Recebe na ferramenta os arquivos entregues por outra tela.
 * No modo estrito do React a montagem se repete (monta, desmonta, monta): por isso os arquivos só
 * saem da entrega depois que a montagem assentou, e desmontar desfaz o recebimento.
 * Chame depois do efeito que cria o Worker: os efeitos rodam na ordem em que são declarados.
 */
export function useHandedOffFiles(kind: MediaKind, receive: (files: File[]) => void, undo: () => void): void {
  const receiveRef = useRef(receive)
  const undoRef = useRef(undo)
  useLayoutEffect(() => {
    receiveRef.current = receive
    undoRef.current = undo
  })

  useEffect(() => {
    const files = peekHandOff(kind)
    if (!files) return
    receiveRef.current([...files])
    const settle = window.setTimeout(() => clearHandOff(files))
    return () => {
      window.clearTimeout(settle)
      undoRef.current()
    }
  }, [kind])
}

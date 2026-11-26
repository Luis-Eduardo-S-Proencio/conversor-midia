import { useEffect, useRef, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'
import { useBackDismiss } from './useBackDismiss'

/** Duração da saída (igual a --dur-2), depois da qual o <dialog> fecha de fato. */
const EXIT_MS = 200

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface ModalDialog {
  ref: RefObject<HTMLDialogElement | null>
  /** Esc: o pai decide fechar (o estado aberto/fechado é dele). */
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void
  /** Toque no fundo escurecido (fora do conteúdo) fecha. */
  onClick: (event: MouseEvent<HTMLDialogElement>) => void
}

/**
 * Mecânica comum de painéis e diálogos sobre um <dialog> modal: o navegador prende o foco e
 * deixa o resto da página inerte. Aqui: abrir e fechar conforme `open` (com animação de saída),
 * devolver o foco a quem abriu, Esc e toque no fundo pedem para fechar, e o voltar do
 * navegador/Android fecha antes de sair da tela.
 */
export function useModalDialog(open: boolean, onClose: () => void, { historyStep = true }: { historyStep?: boolean } = {}): ModalDialog {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  // Sem o passo no histórico quando o próprio diálogo nasce de uma navegação bloqueada (LeaveGuard).
  useBackDismiss(historyStep && open, onClose)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (dialog.open) {
        delete dialog.dataset.closing
        return
      }
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      delete dialog.dataset.closing
      dialog.showModal()
      return
    }
    if (!dialog.open) return
    dialog.dataset.closing = ''
    const finish = () => {
      if (dialog.dataset.closing === undefined) return // reaberto durante a saída
      delete dialog.dataset.closing
      dialog.close()
      // O foco volta ao controle que abriu, se ele ainda estiver na página.
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
      opener.current = null
    }
    if (prefersReducedMotion()) {
      finish()
      return
    }
    const timer = window.setTimeout(finish, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  // Desmontou aberto (ex.: saiu da tela): fecha sem animação.
  useEffect(() => {
    const dialog = ref.current
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return {
    ref,
    onCancel(event) {
      event.preventDefault()
      onClose()
    },
    onClick(event) {
      // O alvo é o próprio <dialog> só quando o toque cai no fundo, fora do conteúdo.
      if (event.target === event.currentTarget) onClose()
    },
  }
}

import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface LeaveGuardProps {
  /** Há algo que se perde ao sair (processamento em andamento, edição não salva). */
  active: boolean
  title: string
  description: string
  /** Texto do botão de sair mesmo assim ("Sair e cancelar", "Descartar"). */
  confirmLabel: string
  /** Texto do botão de ficar ("Continuar aqui", "Continuar editando"). */
  cancelLabel: string
}

/**
 * Pede confirmação antes de sair da tela quando algo se perderia. Dentro do app (voltar, abas, barra
 * lateral, gesto do Android), um diálogo próprio; ao fechar ou recarregar a aba, o aviso do navegador.
 * Painéis no mesmo endereço (que empilham um passo no histórico) não contam como sair.
 */
export function LeaveGuard({ active, title, description, confirmLabel, cancelLabel }: LeaveGuardProps) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => active && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!active) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      destructive
      historyStep={false}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  )
}

import { useEffect, useId, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

function overlayOf(state: unknown): string | undefined {
  return typeof state === 'object' && state !== null ? (state as { overlay?: string }).overlay : undefined
}

/** pending: o passo foi pedido e ainda não chegou; active: o passo está no topo do histórico. */
type Phase = 'none' | 'pending' | 'active'

/**
 * Painel ou diálogo aberto empilha um passo no histórico (mesmo endereço, sem rolar a página).
 * Assim o voltar do navegador, o gesto do Android e o botão voltar do app instalado fecham o
 * painel primeiro, em vez de sair da tela. Fechar pelo próprio painel (✕, Esc, arrastar) desfaz
 * esse passo, para o histórico não acumular entradas mortas.
 */
export function useBackDismiss(open: boolean, onDismiss: () => void): void {
  const id = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const phase = useRef<Phase>('none')
  const dismiss = useRef(onDismiss)
  // Lidos no momento de empilhar, sem fazer o efeito de abrir rodar a cada mudança de endereço.
  const current = useRef(location)

  useEffect(() => {
    dismiss.current = onDismiss
    current.current = location
  })

  // Abriu: empilha o passo.
  useEffect(() => {
    if (!open || phase.current !== 'none') return
    phase.current = 'pending'
    const { pathname, search, hash, state } = current.current
    const base = typeof state === 'object' && state !== null ? state : {}
    void navigate({ pathname, search, hash }, { state: { ...base, overlay: id }, preventScrollReset: true })
  }, [open, id, navigate])

  // Acompanha o topo do histórico: o passo chegou, ou saiu (voltar) e então o painel fecha.
  useEffect(() => {
    const onTop = overlayOf(location.state) === id
    if (phase.current === 'pending' && onTop) phase.current = 'active'
    else if (phase.current === 'active' && !onTop) {
      phase.current = 'none'
      dismiss.current()
    }
  }, [location, id])

  // Fechou pelo próprio painel: desfaz o passo, se ele estiver no topo.
  useEffect(() => {
    if (open || phase.current === 'none') return
    const wasActive = phase.current === 'active'
    phase.current = 'none'
    if (wasActive && overlayOf(current.current.state) === id) void navigate(-1)
  }, [open, id, navigate])
}

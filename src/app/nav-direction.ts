/**
 * Direção da navegação, para a animação de troca de página (View Transitions):
 * - `forward`: entrar numa tela mais funda (desliza da direita);
 * - `back`: voltar (desliza da esquerda);
 * - `tab`: trocar de aba ou de ferramenta (só esmaece).
 * Fica em `data-nav` no <html>, que o CSS lê (base.css). Sem suporte a View Transitions, nada muda.
 */
export type NavDirection = 'forward' | 'back' | 'tab'

export function setNavDirection(direction: NavDirection): void {
  document.documentElement.dataset.nav = direction
}

/** Posição da entrada atual no histórico do app (o roteador guarda `idx` em history.state). */
export function historyIndex(state: unknown = window.history.state): number {
  const idx = typeof state === 'object' && state !== null ? (state as { idx?: unknown }).idx : undefined
  return typeof idx === 'number' ? idx : 0
}

let lastIndex = historyIndex()

/** Atualiza a posição conhecida; o roteador chama a cada navegação. */
export function rememberHistoryIndex(): void {
  lastIndex = historyIndex()
}

/**
 * Voltar e avançar do navegador (e o gesto do Android) disparam popstate antes de o roteador trocar
 * a tela: a direção vem da posição no histórico. Registrado antes do roteador (main.tsx importa este
 * módulo primeiro), então roda antes dele.
 */
window.addEventListener('popstate', (event) => {
  const index = historyIndex(event.state)
  setNavDirection(index < lastIndex ? 'back' : 'forward')
  lastIndex = index
})

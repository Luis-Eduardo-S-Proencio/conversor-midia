import { useEffect, useState } from 'react'
import { formatRemaining, remainingSeconds } from '../../core/eta'

/**
 * Mantém a tela acesa enquanto processa (Wake Lock): com a tela apagada, o celular suspende a aba e o
 * processamento para. Sem suporte ou sem permissão, segue sem (a tela pode apagar).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let stopped = false

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (stopped) void sentinel.release()
      } catch (error) {
        // Recusado (aba em segundo plano, economia de bateria): o processamento continua mesmo assim.
        if (import.meta.env.DEV) console.warn('Wake Lock indisponível:', error)
      }
    }

    // O navegador solta o pedido quando a aba some; ao voltar, pede de novo.
    function reacquire() {
      if (document.visibilityState === 'visible' && !stopped) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', reacquire)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', reacquire)
      void sentinel?.release()
    }
  }, [active])
}

/**
 * "cerca de 30 s" que faltam, pelo ritmo do progresso (0 a 1) desde que o processamento começou;
 * `undefined` no começo, quando ainda não dá para estimar.
 */
export function useRemainingTime(progress: number | undefined, active: boolean): string | undefined {
  const [wasActive, setWasActive] = useState(active)
  const [elapsed, setElapsed] = useState(0)

  // Começou a processar: o relógio recomeça (ajuste de estado durante a renderização, sem efeito).
  if (active !== wasActive) {
    setWasActive(active)
    if (active) setElapsed(0)
  }

  useEffect(() => {
    if (!active) return
    const start = performance.now()
    // Atualiza a estimativa mesmo quando o progresso demora a mudar (ex.: um arquivo grande no lote).
    const timer = window.setInterval(() => setElapsed(performance.now() - start), 1000)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active || progress === undefined) return undefined
  const seconds = remainingSeconds(progress, elapsed)
  return seconds === null ? undefined : formatRemaining(seconds)
}

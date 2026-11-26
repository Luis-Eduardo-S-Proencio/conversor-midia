/**
 * Tempo restante de um processamento, pelo ritmo até agora. Funções puras: sem React nem DOM.
 */

/** Antes disto (fração feita e tempo decorrido), o ritmo ainda não diz nada: melhor não prometer. */
const MIN_PROGRESS = 0.03
const MIN_ELAPSED_MS = 1500

/** Segundos que faltam, ou `null` enquanto não dá para estimar com honestidade. */
export function remainingSeconds(progress: number, elapsedMs: number): number | null {
  if (!(progress >= MIN_PROGRESS) || progress >= 1 || elapsedMs < MIN_ELAPSED_MS) return null
  return ((elapsedMs / progress) * (1 - progress)) / 1000
}

/** "cerca de 25 s", "cerca de 2 min": arredondado, porque é uma estimativa. */
export function formatRemaining(seconds: number): string {
  if (seconds < 10) return 'quase pronto'
  if (seconds < 60) return `cerca de ${Math.round(seconds / 5) * 5} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `cerca de ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `cerca de ${hours} h` : `cerca de ${hours} h ${rest} min`
}

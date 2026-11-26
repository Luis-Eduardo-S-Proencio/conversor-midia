/**
 * Nome de View Transition do ícone de uma ferramenta: o mesmo nome no cartão (Início, listas) e no
 * título da ferramenta faz o ícone "voar" de um para o outro na troca de página. Único por página.
 */
export function toolTransitionName(toolId: string): string {
  return `tool-${toolId}`
}

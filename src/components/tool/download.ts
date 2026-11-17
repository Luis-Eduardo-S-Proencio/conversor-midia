/**
 * Entrega de arquivos ao usuário: download pelo navegador e compartilhamento do sistema.
 * Fica na camada de interface porque depende do DOM (o núcleo em src/core não pode).
 */

/**
 * Prazo para liberar a URL temporária. Revogar logo após o clique cancela o download
 * em alguns navegadores; 40 s é o mesmo intervalo usado pelo FileSaver.js.
 */
export const REVOKE_DELAY_MS = 40_000

/** Inicia o download de um Blob e libera a URL temporária depois. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/** O navegador consegue compartilhar estes arquivos (ex.: "Salvar imagem" no iPhone)? */
export function canShareFiles(files: File[]): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files })
}

/** Abre o compartilhamento do sistema. Cancelar a folha não é erro. */
export async function shareFiles(files: File[]): Promise<'shared' | 'cancelled'> {
  try {
    await navigator.share({ files })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}

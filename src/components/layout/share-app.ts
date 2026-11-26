/**
 * Compartilhar o endereço do app (Sobre e menu ☰): folha de compartilhar do sistema e, sem ela,
 * o link copiado. Quem chama mostra o aviso de acordo com o resultado.
 */
export type ShareAppOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'

export function appUrl(): string {
  return `${window.location.origin}/`
}

export async function shareApp(): Promise<ShareAppOutcome> {
  const url = appUrl()
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Media Tools', text: 'Converta, comprima e edite fotos e vídeos direto no navegador.', url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled' // a pessoa fechou a folha
      if (import.meta.env.DEV) console.error(error)
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch (error) {
    if (import.meta.env.DEV) console.error(error)
    return 'failed'
  }
}

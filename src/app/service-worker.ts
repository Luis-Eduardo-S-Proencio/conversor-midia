/**
 * Registra o service worker (`src/service-worker/sw.ts`), que guarda os arquivos do site para o app abrir
 * sem internet. Só no build de produção: no servidor de desenvolvimento ele serviria arquivos velhos no
 * lugar dos recarregados. Depois da carga, para não disputar a rede com a primeira tela.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      // Sem service worker o site continua funcionando; só não abre sem internet.
      console.warn('Service worker não registrado:', error)
    })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

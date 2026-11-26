import { useSyncExternalStore } from 'react'

/**
 * Evento do Chromium (Chrome, Edge, Samsung Internet) que deixa o site abrir o pedido de instalação
 * do app por um botão próprio. Ainda não está nos tipos do DOM.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Como instalar o app aqui:
 * - `installed`: já está aberto como app (ou acabou de ser instalado);
 * - `prompt`: o navegador abre o pedido de instalação pelo botão do site;
 * - `manual`: só pelo menu do navegador (Safari, Firefox, ou o Chrome antes de liberar o pedido).
 */
export type InstallMode = 'installed' | 'prompt' | 'manual'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

// Registrados ao carregar o módulo, que vai no pacote inicial com o cabeçalho: o Chromium pode
// disparar o evento logo depois da carga, antes de o menu existir.
window.addEventListener('beforeinstallprompt', (event) => {
  // Sem isso, o Chrome do Android mostra a própria faixa de instalação por cima das abas;
  // a instalação fica no menu do site, para quando a pessoa pedir.
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  installed = true
  notify()
})

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Aberto pelo ícone da tela inicial: pelo modo de exibição do manifesto ou, no iPhone, pelo atalho do Safari. */
function runningAsApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true)
}

function currentMode(): InstallMode {
  if (installed || runningAsApp()) return 'installed'
  return deferred ? 'prompt' : 'manual'
}

/** Como instalar o app neste navegador; muda quando o navegador libera o pedido ou o app é instalado. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, currentMode)
}

/** iPhone ou iPad (o iPadOS se apresenta como Mac, mas tem toque). Lá não existe pedido de instalação. */
export function isAppleMobile(userAgent = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

/**
 * Onde a pessoa está, para o passo a passo de instalar quando o navegador não abre o pedido sozinho:
 * - `apple`: iPhone e iPad (Safari → Compartilhar → Adicionar à Tela de Início);
 * - `android`: menu do navegador → Instalar app;
 * - `desktop`: ícone de instalar na barra de endereço (Chrome, Edge) ou Adicionar ao Dock (Safari do Mac).
 */
export type InstallPlatform = 'apple' | 'android' | 'desktop'

export function installPlatform(userAgent = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): InstallPlatform {
  if (isAppleMobile(userAgent, maxTouchPoints)) return 'apple'
  return /Android/i.test(userAgent) ? 'android' : 'desktop'
}

/**
 * Abre o pedido de instalação do navegador. Chame direto no toque ou clique (o navegador exige um gesto)
 * e só com o modo `prompt`. Cada evento abre o pedido uma vez: recusado, o modo passa a `manual` até o
 * navegador liberar outro.
 */
export async function requestInstall(): Promise<'accepted' | 'dismissed'> {
  const event = deferred
  if (!event) throw new Error('O navegador não liberou o pedido de instalação.')
  deferred = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}

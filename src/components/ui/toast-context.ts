import { createContext, use } from 'react'

export type ToastTone = 'info' | 'success' | 'danger'

export interface ToastOptions {
  message: string
  tone?: ToastTone
  /** Ação curta no próprio aviso (ex.: "Atualizar"). Com ação, o aviso fica até ser usado ou fechado. */
  action?: { label: string; onClick: () => void }
}

/** Tempo na tela de um aviso sem ação. */
export const TOAST_MS = 3000

export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

/** Mostra um aviso curto que sobe de baixo e some sozinho (precisa do <ToastProvider>). */
export function useToast(): (options: ToastOptions) => void {
  const show = use(ToastContext)
  if (!show) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return show
}

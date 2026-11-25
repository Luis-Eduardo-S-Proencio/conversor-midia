import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { TOAST_MS, ToastContext, type ToastOptions, type ToastTone } from './toast-context'
import { cx } from './cx'
import { Icon } from './Icon'

interface ToastItem extends ToastOptions {
  id: number
}

const TONE_ICONS: Record<ToastTone, { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: 'text-fg-muted' },
  success: { icon: CircleCheck, color: 'text-success' },
  danger: { icon: CircleAlert, color: 'text-danger' },
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const { icon, color } = TONE_ICONS[toast.tone ?? 'info']
  const done = useRef(onDone)

  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    if (toast.action) return
    const timer = window.setTimeout(() => done.current(toast.id), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.action])

  return (
    <div className="pointer-events-auto flex min-h-12 w-full max-w-md animate-enter items-center gap-3 rounded-md border border-border-strong bg-surface-3 px-4 py-2.5 text-sm text-fg shadow-2">
      <Icon icon={icon} className={color} />
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDone(toast.id)
          }}
          className="pressable -mr-2 inline-flex min-h-11 items-center rounded-sm px-2 font-semibold text-accent"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Avisos da aplicação. Ficam acima da barra inferior: quem monta o provedor define
 * `--toast-lift` (a altura do que estiver fixo embaixo).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++
    // No máximo dois de uma vez: o mais antigo sai.
    setToasts((current) => [...current.slice(-1), { ...options, id }])
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      {/*
        Região sempre presente: o leitor de tela anuncia cada aviso que entra. Só aria-live (sem
        role="status"), para não competir com a região de status da própria página.
      */}
      <div
        aria-live="polite"
        data-toast-region=""
        className={cx(
          'pointer-events-none fixed inset-x-0 z-50 grid justify-items-center gap-2 px-(--gutter)',
          'bottom-[calc(env(safe-area-inset-bottom)+16px+var(--toast-lift,0px))]',
        )}
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDone={remove} />
        ))}
      </div>
    </ToastContext>
  )
}

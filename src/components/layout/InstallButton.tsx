import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/toast-context'
import { InstallSheet } from './InstallSheet'
import { requestInstall, useInstallOffer } from './install-app'
import { SIDEBAR_LINK, SIDEBAR_LABEL } from './sidebar-classes'

export type InstallButtonVariant = 'header' | 'sidebar' | 'rail' | 'button'

interface InstallButtonProps {
  variant: InstallButtonVariant
  /** Barra lateral recolhida: só o ícone (o nome continua para o leitor de tela). */
  collapsed?: boolean
  className?: string
}

/**
 * "Instalar": só aparece quando o navegador deixa instalar (pedido do Chrome/Edge) ou no iPhone/iPad
 * (passo a passo do Safari). Com o app instalado, some.
 */
export function InstallButton({ variant, collapsed = false, className }: InstallButtonProps) {
  const offer = useInstallOffer()
  const [guideOpen, setGuideOpen] = useState(false)
  const toast = useToast()

  if (!offer) return null

  function install() {
    if (offer === 'guide') {
      setGuideOpen(true)
      return
    }
    // Sem esperar nada antes: o navegador só abre o pedido dentro do toque da pessoa.
    requestInstall().then(
      (outcome) => {
        if (outcome === 'accepted') toast({ message: 'Pronto! O Media Tools está instalado.', tone: 'success' })
      },
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error)
        toast({ message: 'Não deu para abrir a instalação. Use o menu do navegador e toque em Instalar app.' })
      },
    )
  }

  const sheet = <InstallSheet open={guideOpen} onClose={() => setGuideOpen(false)} />

  if (variant === 'header') {
    return (
      <>
        <Button size="sm" icon={Download} onClick={install} className={cx('rounded-full pointer-coarse:h-11', className)}>
          Instalar
        </Button>
        {sheet}
      </>
    )
  }

  if (variant === 'button') {
    return (
      <>
        <Button icon={Download} onClick={install} className={className}>
          Instalar app
        </Button>
        {sheet}
      </>
    )
  }

  if (variant === 'rail') {
    return (
      <>
        <button
          type="button"
          onClick={install}
          className={cx(
            'pressable flex w-full flex-col items-center gap-1 rounded-md py-2 text-xs font-medium text-fg-muted hover:pointer-fine:text-fg',
            className,
          )}
        >
          <span className="grid h-8 w-14 place-items-center rounded-full">
            <Icon icon={Download} />
          </span>
          Instalar
        </button>
        {sheet}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        title={collapsed ? 'Instalar app' : undefined}
        className={cx(SIDEBAR_LINK, collapsed && 'justify-center px-0', className)}
      >
        <Icon icon={Download} className="text-fg-muted" />
        <span className={collapsed ? 'sr-only' : SIDEBAR_LABEL}>Instalar app</span>
      </button>
      {sheet}
    </>
  )
}

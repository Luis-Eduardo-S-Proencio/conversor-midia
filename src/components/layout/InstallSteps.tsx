import { EllipsisVertical, MonitorDown, Share, SquarePlus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import type { InstallPlatform } from './install-app'

/** Ícone do botão do navegador citado no passo, para a pessoa reconhecê-lo. O nome vem escrito ao lado. */
function BrowserIcon({ icon }: { icon: LucideIcon }) {
  return <Icon icon={icon} size="sm" className="inline align-text-bottom text-fg" />
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>
}

/** Passos em ordem (iPhone e Android) ou caminhos alternativos (computador, um por navegador). */
const STEPS: Record<InstallPlatform, { ordered: boolean; steps: readonly ReactNode[] }> = {
  apple: {
    ordered: true,
    steps: [
      <>
        No Safari, toque em <BrowserIcon icon={Share} /> <Strong>Compartilhar</Strong>.
      </>,
      <>
        Role a lista e toque em <BrowserIcon icon={SquarePlus} /> <Strong>Adicionar à Tela de Início</Strong>.
      </>,
      <>
        Toque em <Strong>Adicionar</Strong>. O ícone do Media Tools aparece na tela inicial.
      </>,
    ],
  },
  android: {
    ordered: true,
    steps: [
      <>
        Toque no menu <BrowserIcon icon={EllipsisVertical} /> do navegador, no canto de cima.
      </>,
      <>
        Toque em <Strong>Instalar app</Strong> ou em <Strong>Adicionar à tela inicial</Strong>.
      </>,
      <>
        Confirme. O ícone do Media Tools aparece na tela inicial.
      </>,
    ],
  },
  desktop: {
    ordered: false,
    steps: [
      <>
        No Chrome e no Edge: clique em <BrowserIcon icon={MonitorDown} /> <Strong>Instalar</Strong>, no fim da barra de endereço.
      </>,
      <>
        No Safari do Mac: menu <Strong>Arquivo</Strong> e depois <Strong>Adicionar ao Dock</Strong>.
      </>,
      <>O Firefox não instala sites como app. Para instalar, abra o Media Tools no Chrome ou no Edge.</>,
    ],
  },
}

/** Como instalar pelo próprio navegador, quando ele não deixa o site abrir o pedido de instalação. */
export function InstallSteps({ platform }: { platform: InstallPlatform }) {
  const { ordered, steps } = STEPS[platform]
  const List = ordered ? 'ol' : 'ul'
  return (
    <List className="grid gap-2">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-3 rounded-md bg-surface-2 px-4 py-3 text-secondary text-fg-muted">
          {ordered && (
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-caption font-semibold text-fg tabular-nums">
              {index + 1}
            </span>
          )}
          <span className={ordered ? 'pt-0.5' : undefined}>{step}</span>
        </li>
      ))}
    </List>
  )
}

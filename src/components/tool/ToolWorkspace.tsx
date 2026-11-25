import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ActionBar } from '../layout/ActionBar'
import { Alert } from '../ui/Alert'
import { Icon } from '../ui/Icon'
import { ToolSwitcher, type SwitcherTool } from './ToolSwitcher'

interface ToolWorkspaceProps {
  title: string
  description: string
  /** Para onde "voltar" leva: a lista de ferramentas do mesmo tipo. */
  back: { to: string; label: string }
  /** Ferramentas do mesmo tipo, para trocar sem sair do editor. */
  tools: readonly SwitcherTool[]
  /** Nome do menu de ferramentas para o leitor de tela ("Ferramentas de imagem"). */
  toolsLabel: string
  /** Chamado antes de ir para outra ferramenta (para levar o arquivo aberto junto). */
  onSwitch: () => void
  /** Ações da ferramenta no celular, na barra fixa embaixo (a partir de 768 px elas ficam no painel). */
  mobileActions?: ReactNode
  /** Anúncios para o leitor de tela: abrindo, processando, pronto, erros. */
  announcement: string
  /** O palco (`ToolStage`) e o painel (`ToolPanel`), ou um aviso. */
  children: ReactNode
}

/**
 * Esqueleto dos editores de imagem e de vídeo: o título no alto e, a partir de 1024 px, a troca de
 * ferramenta, o palco com a foto ou o vídeo e o painel de opções lado a lado. No celular, um embaixo do outro,
 * com as ações numa barra fixa ao alcance do polegar.
 */
export function ToolWorkspace({ title, description, back, tools, toolsLabel, onSwitch, mobileActions, announcement, children }: ToolWorkspaceProps) {
  return (
    <>
      <title>{`${title} · Media Tools`}</title>
      <div className="mx-auto grid w-full max-w-editor gap-4 px-(--gutter) pt-4 pb-6 lg:grid-cols-[6.5rem_minmax(0,1fr)_21rem] lg:gap-x-5 lg:pt-5">
        <header className="grid gap-1 border-b border-border pb-4 lg:col-span-3">
          <div className="text-sm">
            <Link to={back.to} className="inline-flex min-h-11 items-center gap-1.5 text-fg-muted transition-colors hover:text-fg pointer-fine:min-h-0">
              <Icon icon={ArrowLeft} size="sm" />
              {back.label}
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
          <p className="max-w-3xl text-sm text-fg-muted">{description}</p>
        </header>

        <ToolSwitcher label={toolsLabel} tools={tools} onSwitch={onSwitch} className="lg:sticky lg:top-5 lg:self-start" />

        {children}

        {mobileActions && <ActionBar className="md:hidden">{mobileActions}</ActionBar>}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  )
}

/** Palco escuro onde fica a foto ou o vídeo. `empty`: ocupa também o lugar do painel e centraliza a área de abrir. */
export function ToolStage({ empty = false, children }: { empty?: boolean; children: ReactNode }) {
  return (
    <div className={empty ? 'grid place-items-center rounded-xl bg-stage p-3 sm:p-6 lg:col-span-2 lg:min-h-112' : 'min-w-0 rounded-xl bg-stage p-3 sm:p-4'}>
      {children}
    </div>
  )
}

interface ToolPanelProps {
  /** Id do título do painel ("Opções"). */
  labelledBy?: string
  /** Nome do painel quando ele não tem título próprio ("Resultado"). */
  label?: string
  children: ReactNode
}

/** Painel ao lado do palco, com as opções ou o resultado; fica parado ao rolar a partir de 1024 px. */
export function ToolPanel({ labelledBy, label, children }: ToolPanelProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={label}
      className="grid content-start gap-5 rounded-xl border border-border bg-surface-1 p-4 md:p-5 lg:sticky lg:top-5 lg:self-start"
    >
      {children}
    </section>
  )
}

/** Navegador sem os recursos para processar este tipo de arquivo: o aviso ocupa o palco e o painel. */
export function ToolUnsupported({ media }: { media: 'imagens' | 'vídeos' }) {
  return (
    <div className="lg:col-span-2">
      <Alert variant="error" title="Navegador sem suporte" live={false}>
        {`Este navegador não tem os recursos necessários para processar ${media}. Use uma versão recente do Chrome, Edge, Firefox ou Safari.`}
      </Alert>
    </div>
  )
}

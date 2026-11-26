import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'
import { useId } from 'react'
import { useLocation } from 'react-router'
import { IMAGE_TOOLS, VIDEO_TOOLS, type ToolEntry } from '../../app/tool-catalog'
import { handOffOpenFiles } from '../../features/shared/file-handoff'
import { Logo, LogoMark } from '../brand/Logo'
import { IconButton } from '../ui/Button'
import { cx } from '../ui/cx'
import { Icon } from '../ui/Icon'
import { ToolIcon } from '../ui/ToolIcon'
import { InstallButton } from './InstallButton'
import { ABOUT_ITEM, SIDEBAR_ITEMS, type NavItem } from './nav-items'
import { SIDEBAR_LABEL, SIDEBAR_LINK } from './sidebar-classes'
import { TransitionLink, TransitionNavLink } from './TransitionLink'
import { useStoredFlag } from './useStoredFlag'

/** Chave da preferência "barra lateral recolhida", guardada no aparelho. */
export const SIDEBAR_COLLAPSED_KEY = 'media-tools:sidebar-collapsed'

function SideItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <TransitionNavLink
      to={item.to}
      end={item.end}
      direction="tab"
      title={collapsed ? item.label : undefined}
      className={cx(SIDEBAR_LINK, collapsed && 'justify-center px-0')}
    >
      {({ isActive }) => (
        <>
          <Icon icon={item.icon} filled={isActive} className={isActive ? 'text-accent' : undefined} />
          <span className={collapsed ? 'sr-only' : SIDEBAR_LABEL}>{item.label}</span>
        </>
      )}
    </TransitionNavLink>
  )
}

function ToolGroup({ title, tools, collapsed }: { title: string; tools: readonly ToolEntry[]; collapsed: boolean }) {
  const titleId = useId()
  const { pathname } = useLocation()
  return (
    <div className="grid gap-1">
      <p id={titleId} className={collapsed ? 'sr-only' : 'px-3 pt-2 pb-1 text-caption text-fg-subtle'}>
        {title}
      </p>
      <ul aria-labelledby={titleId} className="grid gap-0.5">
        {tools.map((tool) => (
          <li key={tool.id}>
            <TransitionNavLink
              to={tool.to}
              direction="forward"
              // O nome completo ("Converter imagem") diferencia os dois "Converter" da lista.
              aria-label={tool.title}
              title={collapsed ? tool.title : undefined}
              onClick={(event) => {
                // A ferramenta atual não recarrega; indo para outra, os arquivos abertos vão junto.
                if (tool.to === pathname) {
                  event.preventDefault()
                  return
                }
                handOffOpenFiles(tool.media)
              }}
              className={cx(SIDEBAR_LINK, 'gap-2.5 px-1.5', collapsed && 'justify-center px-0')}
            >
              <ToolIcon icon={tool.icon} tone={tool.tone} size="sm" />
              <span className={collapsed ? 'sr-only' : SIDEBAR_LABEL}>{tool.navLabel}</span>
            </TransitionNavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Barra lateral do computador (a partir de 1024 px): marca, Início/Imagens/Vídeos, todas as
 * ferramentas agrupadas (a atual destacada) e, no rodapé, Sobre, Instalar app e o selo de
 * processamento local. Recolhível para 72 px; a escolha fica guardada no aparelho.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useStoredFlag(SIDEBAR_COLLAPSED_KEY)

  return (
    <aside
      aria-label="Navegação"
      data-collapsed={collapsed || undefined}
      className={cx(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface-1 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] [view-transition-name:sidebar] lg:flex',
        collapsed ? 'w-(--rail-w)' : 'w-(--sidebar-w)',
      )}
    >
      <div className={cx('flex shrink-0 gap-1 px-3 pt-4 pb-3', collapsed ? 'flex-col items-center' : 'items-center justify-between')}>
        <TransitionLink to="/" direction="tab" className="pressable flex h-11 min-w-0 items-center rounded-md px-1.5">
          {collapsed ? (
            <>
              <LogoMark className="size-8" />
              <span className="sr-only">Media Tools, início</span>
            </>
          ) : (
            <Logo className="font-display" />
          )}
        </TransitionLink>
        <IconButton
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? 'Expandir a barra lateral' : 'Recolher a barra lateral'}
          aria-expanded={!collapsed}
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin]">
        <nav aria-label="Principal">
          <ul className="grid gap-0.5">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.to}>
                <SideItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>
        <hr className="mx-1.5 my-3 border-border" />
        <nav aria-label="Ferramentas" className="grid gap-2">
          <ToolGroup title="Imagem" tools={IMAGE_TOOLS} collapsed={collapsed} />
          <ToolGroup title="Vídeo" tools={VIDEO_TOOLS} collapsed={collapsed} />
        </nav>
      </div>

      <div className="grid shrink-0 gap-0.5 border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SideItem item={ABOUT_ITEM} collapsed={collapsed} />
        <InstallButton variant="sidebar" collapsed={collapsed} />
        <TransitionLink
          to="/sobre#privacidade"
          direction="forward"
          title={collapsed ? 'Processamento local: nada é enviado' : undefined}
          className={cx(
            'pressable mt-1 flex min-h-9 items-center gap-2 rounded-full border border-border px-3 text-caption text-fg-muted hover:text-fg pointer-coarse:min-h-11',
            collapsed && 'justify-center px-0',
          )}
        >
          <Icon icon={ShieldCheck} size="sm" className="text-success" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>Processamento local</span>
        </TransitionLink>
      </div>
    </aside>
  )
}

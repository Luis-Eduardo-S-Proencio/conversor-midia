import { AlignCenter, AlignLeft, AlignRight, ArrowLeftToLine, ArrowRightToLine, Check, Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { ChoiceGrid } from '../../../components/ui/ChoiceGrid'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Slider } from '../../../components/ui/Slider'
import { Tabs } from '../../../components/ui/Tabs'
import { cx } from '../../../components/ui/cx'
import { formatTime } from '../../../core/video/time'
import { ensureTextFont } from './text-fonts'
import {
  TEXT_COLORS,
  TEXT_FONTS,
  TEXT_LIMITS,
  TEXT_STYLES,
  canvasMeasure,
  drawText,
  layoutText,
  type TextAlign,
  type TextCanvas,
  type TextFontId,
  type TextStyleId,
  type VideoText,
} from '../../../core/video/text'

type PanelTab = 'style' | 'font' | 'color' | 'adjust'

/** O controle de tamanho vai de 0 a 100; o texto, do menor ao maior tamanho permitido. */
const toSlider = (size: number) => Math.round(((size - TEXT_LIMITS.minSize) / (TEXT_LIMITS.maxSize - TEXT_LIMITS.minSize)) * 100)
const fromSlider = (value: number) => TEXT_LIMITS.minSize + (value / 100) * (TEXT_LIMITS.maxSize - TEXT_LIMITS.minSize)

/**
 * "T": abre um texto novo no ponto da linha. A letra grande, na fonte do app, e um "+" no acento no canto,
 * como nos editores de celular.
 */
export function TextButton({ className, ...props }: Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button
      type="button"
      aria-label="Adicionar texto"
      className={cx(
        'group/text pressable relative grid size-11 shrink-0 place-items-center rounded-md border border-border-strong bg-surface-3 text-fg shadow-1',
        'transition-colors duration-(--dur-2) not-disabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-[1.375rem] leading-none font-extrabold tracking-tight">
        T
      </span>
      <span
        aria-hidden="true"
        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent-solid text-on-accent shadow-1 ring-2 ring-surface-1"
      >
        <Icon icon={Plus} size="sm" className="size-3" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full z-40 mt-2 hidden rounded-sm border border-border-strong bg-surface-3 px-2 py-1 text-caption font-medium whitespace-nowrap text-fg shadow-2 pointer-fine:group-hover/text:block pointer-fine:group-focus-visible/text:block"
      >
        Adicionar texto
      </span>
    </button>
  )
}

/** Miniatura de um estilo: "Aa" desenhado pelas mesmas funções do vídeo, na cor escolhida. */
function StylePreview({ style, color, font }: { style: TextStyleId; color: string; font?: TextFontId }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const width = 88 * ratio
    const height = 52 * ratio
    element.width = width
    element.height = height
    const sample: VideoText = { id: 0, text: 'Aa', style, font, color, size: 0.1, align: 'center', x: 0.5, y: 0.5, start: 0, end: 1 }
    const target = context as unknown as TextCanvas
    const draw = () => {
      context.clearRect(0, 0, width, height)
      drawText(target, sample, layoutText(sample, { width, height }, canvasMeasure(target), { fontSize: 22 * ratio }))
    }
    draw()
    // Com a fonte carregada, desenha de novo (a primeira vez pode sair na do sistema).
    let alive = true
    ensureTextFont(font).then(
      () => alive && draw(),
      (error: unknown) => {
        if (import.meta.env.DEV) console.error(error) // sem a fonte, a miniatura fica na do sistema
      },
    )
    return () => {
      alive = false
    }
  }, [style, color, font])
  return <canvas ref={canvas} aria-hidden="true" className="h-[52px] w-[88px] max-w-full" />
}

const TILE =
  'grid min-h-11 place-items-center overflow-hidden rounded-md border bg-stroke p-0.5 transition-colors duration-(--dur-2) ' +
  'border-border hover:pointer-fine:border-border-strong aria-checked:border-accent aria-checked:ring-2 aria-checked:ring-accent/40 forced-colors:aria-checked:outline'

const SWATCH =
  'grid size-11 justify-self-center place-items-center rounded-full transition-shadow duration-(--dur-2) ' +
  'aria-checked:ring-2 aria-checked:ring-accent aria-checked:ring-offset-2 aria-checked:ring-offset-surface-1 forced-colors:aria-checked:outline'

const ALIGN_OPTIONS: readonly { value: TextAlign; label: ReactNode }[] = [
  { value: 'left', label: <AlignLabel icon={AlignLeft} text="À esquerda" /> },
  { value: 'center', label: <AlignLabel icon={AlignCenter} text="No centro" /> },
  { value: 'right', label: <AlignLabel icon={AlignRight} text="À direita" /> },
]

function AlignLabel({ icon, text }: { icon: typeof AlignLeft; text: string }) {
  return (
    <span className="inline-flex items-center justify-center">
      <Icon icon={icon} size="sm" />
      <span className="sr-only">{text}</span>
    </span>
  )
}

interface TextPanelProps {
  text: VideoText
  /** Instante do vídeo original no ponto da linha (para "Começar aqui" e "Terminar aqui"). */
  sourceTime: number
  onChange: (change: (text: VideoText) => VideoText) => void
  onTime: (edge: 'start' | 'end', sourceTime: number) => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
  disabled: boolean
}

/**
 * O texto aberto, logo embaixo do player (o vídeo continua à vista enquanto a pessoa escreve): o campo do
 * texto e as abas Estilo, Cor e Ajustes (tamanho, alinhamento e quando aparece).
 */
export function TextPanel({ text, sourceTime, onChange, onTime, onDuplicate, onDelete, onClose, disabled }: TextPanelProps) {
  const [tab, setTab] = useState<PanelTab>('style')
  const field = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()
  // Cada texto aberto monta este painel de novo (key): vazio ao abrir, é um texto novo, e o campo já vem pronto.
  const [startsEmpty] = useState(!text.text)
  useEffect(() => {
    if (startsEmpty) field.current?.focus({ preventScroll: true })
  }, [startsEmpty])

  const set = (patch: Partial<VideoText>) => onChange((current) => ({ ...current, ...patch }))

  return (
    <section aria-label="Texto aberto" className="grid animate-enter gap-3 rounded-xl border border-border-strong bg-surface-1 p-3 shadow-2 sm:p-4">
      <div className="flex items-start gap-2">
        <label htmlFor={fieldId} className="sr-only">
          Texto
        </label>
        <textarea
          ref={field}
          id={fieldId}
          value={text.text}
          maxLength={TEXT_LIMITS.maxLength}
          rows={2}
          placeholder="Escreva o texto"
          disabled={disabled}
          onChange={(event) => set({ text: event.currentTarget.value })}
          className="min-h-11 min-w-0 flex-1 resize-none rounded-md border border-stroke bg-surface-2 px-3 py-2 text-base text-fg placeholder:text-fg-subtle focus-visible:border-accent"
        />
        <IconButton icon={Check} label="Concluir o texto" variant="primary" tooltipAlign="end" onClick={onClose} />
      </div>

      <Tabs<PanelTab>
        label="Aparência do texto"
        value={tab}
        onChange={setTab}
        className="gap-4"
        items={[
          {
            value: 'style',
            label: 'Estilo',
            content: (
              <ChoiceGrid<TextStyleId>
                label="Estilo do texto"
                columns={4}
                value={text.style}
                onChange={(style) => set({ style })}
                optionClassName={TILE}
                options={TEXT_STYLES.map((style) => ({ value: style.id, name: style.name, content: () => <StylePreview style={style.id} color={text.color} font={text.font} /> }))}
              />
            ),
          },
          {
            value: 'font',
            label: 'Fonte',
            content: (
              <ChoiceGrid<TextFontId>
                label="Fonte do texto"
                columns={4}
                value={text.font ?? 'inter'}
                onChange={(font) => set({ font })}
                optionClassName={TILE}
                options={TEXT_FONTS.map((font) => ({
                  value: font.id,
                  name: font.name,
                  content: () => (
                    <span className="grid justify-items-center gap-1 pb-1">
                      <StylePreview style={text.style} color={text.color} font={font.id} />
                      {/* O nome à vista: no celular não há a dica de passar o mouse. */}
                      <span aria-hidden="true" className="max-w-full truncate rounded-sm bg-bg/70 px-1.5 text-[11px] leading-4 font-medium text-fg">
                        {font.name}
                      </span>
                    </span>
                  ),
                }))}
              />
            ),
          },
          {
            value: 'color',
            label: 'Cor',
            content: (
              <ChoiceGrid
                label="Cor do texto"
                columns={5}
                value={TEXT_COLORS.some((color) => color.value === text.color) ? text.color : undefined}
                onChange={(color) => set({ color })}
                optionClassName={SWATCH}
                options={TEXT_COLORS.map((color) => ({
                  value: color.value,
                  name: color.name,
                  content: () => <span className="size-8 rounded-full shadow-1 ring-1 ring-white/25 ring-inset" style={{ backgroundColor: color.value }} />,
                }))}
              />
            ),
          },
          {
            value: 'adjust',
            label: 'Ajustes',
            content: (
              <>
                <Slider label="Tamanho" value={toSlider(text.size)} onChange={(value) => set({ size: fromSlider(value) })} formatValue={(value) => `${value}%`} resetTo={toSlider(TEXT_LIMITS.defaultSize)} />
                <SegmentedControl<TextAlign> label="Alinhamento" options={ALIGN_OPTIONS} value={text.align} onChange={(align) => set({ align })} compact />
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-fg">Quando aparece</p>
                  <p className="text-sm text-fg-muted tabular-nums">{`De ${formatTime(text.start)} a ${formatTime(text.end)} do vídeo original`}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={ArrowRightToLine} className="pointer-coarse:h-11" disabled={disabled} onClick={() => onTime('start', sourceTime)}>
                      Começar aqui
                    </Button>
                    <Button size="sm" icon={ArrowLeftToLine} className="pointer-coarse:h-11" disabled={disabled} onClick={() => onTime('end', sourceTime)}>
                      Terminar aqui
                    </Button>
                  </div>
                  <p className="text-xs text-fg-muted">Leve a linha da barra até o ponto e toque num dos botões, ou arraste as pontas do bloco do texto na barra.</p>
                </div>
              </>
            ),
          },
        ]}
      />

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" icon={Copy} className="pointer-coarse:h-11" disabled={disabled} onClick={onDuplicate}>
          Duplicar
        </Button>
        <Button variant="danger" size="sm" icon={Trash2} className="pointer-coarse:h-11" disabled={disabled} onClick={onDelete}>
          Excluir texto
        </Button>
      </div>
    </section>
  )
}

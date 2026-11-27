import { Check, RotateCcw, Sparkles } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { ChoiceGrid } from '../../../components/ui/ChoiceGrid'
import { Slider } from '../../../components/ui/Slider'
import { Tabs } from '../../../components/ui/Tabs'
import {
  ADJUSTMENTS,
  ADJUSTMENT_LIMIT,
  FILTERS,
  NO_ADJUSTMENTS,
  NO_EFFECTS,
  SPEEDS,
  hasColorChange,
  speedLabel,
  svgMatrixValues,
  type ColorMatrix,
  type FilterId,
  type VideoEffects,
} from '../../../core/video/effects'
import { formatTime } from '../../../core/video/time'
import { thumbnailCell } from '../../../core/video/timeline'
import { filterIdBase } from './settings'
import type { Thumbnails } from './useEditTool'

type PanelTab = 'filters' | 'adjust' | 'speed'

/**
 * Filtros SVG de matriz de cor, para `filter: url(#id)`. Em sRGB, como o Worker faz a conta: sem isso, o SVG
 * misturaria as cores em RGB linear e a prévia não seria igual ao arquivo. Fica fora da tela, mas no
 * documento (o Firefox ignora filtros dentro de `display: none`).
 */
export function ColorFilterDefs({ filters }: { filters: readonly { id: string; matrix: ColorMatrix }[] }) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="pointer-events-none absolute size-0 overflow-hidden">
      <defs>
        {filters.map(({ id, matrix }) => (
          <filter key={id} id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
            <feColorMatrix type="matrix" values={svgMatrixValues(matrix)} />
          </filter>
        ))}
      </defs>
    </svg>
  )
}

/** "Efeitos": abre os filtros, os ajustes e a velocidade do vídeo inteiro. */
export function EffectsButton({ active, ...props }: Omit<ComponentProps<'button'>, 'children'> & { active: boolean }) {
  return (
    <Button icon={Sparkles} className="relative" {...props}>
      Efeitos
      {active && (
        <>
          <span aria-hidden="true" className="absolute -top-1 -right-1 size-2.5 rounded-full bg-accent-solid ring-2 ring-surface-1" />
          <span className="sr-only">(em uso)</span>
        </>
      )}
    </Button>
  )
}

/**
 * Quadro de exemplo de cada filtro: a miniatura do ponto da linha ou, sem miniaturas (vídeo que o navegador
 * não lê), um degradê de cores. É conteúdo de exemplo, como as cores do texto, não cor da interface.
 */
const SAMPLE_GRADIENT = 'linear-gradient(135deg, #e5484d 0%, #f5a524 30%, #46a758 60%, #3e63dd 100%)'

const TILE =
  'grid min-h-11 content-start gap-1 overflow-hidden rounded-md border bg-surface-2 p-0.5 pb-1 transition-colors duration-(--dur-2) ' +
  'border-border hover:pointer-fine:border-border-strong aria-checked:border-accent aria-checked:ring-2 aria-checked:ring-accent/40 forced-colors:aria-checked:outline'

const CHIP =
  'grid min-h-11 place-items-center rounded-md border border-border bg-surface-2 px-2 text-sm font-medium tabular-nums text-fg transition-colors duration-(--dur-2) ' +
  'hover:pointer-fine:border-border-strong aria-checked:border-accent aria-checked:bg-accent-solid aria-checked:text-on-accent forced-colors:aria-checked:outline'

/** "+20", "−20", "0". */
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0')

interface EffectsPanelProps {
  effects: VideoEffects
  /** `key`: o controle deslizante que mudou (mudanças seguidas no mesmo controle são um passo de desfazer). */
  onChange: (change: (current: VideoEffects) => VideoEffects, key?: string) => void
  onClose: () => void
  thumbnails?: Thumbnails
  /** Duração do vídeo original e o ponto da linha nele (para a miniatura dos filtros). */
  duration: number
  sourceTime: number
  /** Duração do que fica, na velocidade normal. */
  editedDuration: number
  disabled: boolean
}

/**
 * Os efeitos, logo embaixo do player (o vídeo continua à vista e já mostra cada mudança): filtros prontos com
 * a força, ajustes de cor e a velocidade, todos valendo para o vídeo inteiro.
 */
export function EffectsPanel({ effects, onChange, onClose, thumbnails, duration, sourceTime, editedDuration, disabled }: EffectsPanelProps) {
  const [tab, setTab] = useState<PanelTab>('filters')
  const base = filterIdBase(useId())
  const { color, speed } = effects
  const adjusted = ADJUSTMENTS.some(({ id }) => color.adjust[id] !== 0)
  const active = hasColorChange(color) || speed !== 1

  const sample = thumbnails
    ? {
        backgroundImage: `url(${thumbnails.url})`,
        backgroundSize: `${thumbnails.count * 100}% 100%`,
        backgroundPositionX: thumbnails.count > 1 ? `${(thumbnailCell(sourceTime, duration, thumbnails.count) / (thumbnails.count - 1)) * 100}%` : '0',
        aspectRatio: `${thumbnails.width} / ${thumbnails.height}`,
      }
    : { backgroundImage: SAMPLE_GRADIENT, aspectRatio: '16 / 9' }

  const setColor = (patch: Partial<VideoEffects['color']>, key?: string) => onChange((current) => ({ ...current, color: { ...current.color, ...patch } }), key)

  return (
    <section aria-label="Efeitos" className="grid animate-enter gap-3 rounded-xl border border-border-strong bg-surface-1 p-3 shadow-2 sm:p-4">
      <ColorFilterDefs filters={FILTERS.filter((filter) => filter.id !== 'original').map((filter) => ({ id: `${base}-${filter.id}`, matrix: filter.matrix }))} />
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">Efeitos no vídeo inteiro</h3>
        <IconButton icon={Check} label="Concluir os efeitos" variant="primary" tooltipAlign="end" onClick={onClose} />
      </div>

      <Tabs<PanelTab>
        label="Efeitos do vídeo"
        value={tab}
        onChange={setTab}
        className="gap-4"
        items={[
          {
            value: 'filters',
            label: 'Filtros',
            content: (
              <>
                <ChoiceGrid<FilterId>
                  label="Filtro"
                  columns={4}
                  value={color.filter}
                  onChange={(filter) => setColor({ filter, intensity: 100 })}
                  optionClassName={TILE}
                  options={FILTERS.map((filter) => ({
                    value: filter.id,
                    name: filter.name,
                    content: () => (
                      <>
                        <span
                          aria-hidden="true"
                          className="block w-full rounded-sm bg-cover"
                          style={{ ...sample, filter: filter.id === 'original' ? undefined : `url(#${base}-${filter.id})` }}
                        />
                        {/* O nome à vista: no celular não há a dica de passar o mouse. */}
                        <span aria-hidden="true" className="truncate px-1 text-[11px] leading-4 font-medium text-fg">
                          {filter.name}
                        </span>
                      </>
                    ),
                  }))}
                />
                {color.filter !== 'original' && (
                  <Slider
                    label="Força do filtro"
                    value={color.intensity}
                    onChange={(intensity) => setColor({ intensity }, 'intensity')}
                    formatValue={(value) => `${value}%`}
                    resetTo={100}
                    disabled={disabled}
                  />
                )}
              </>
            ),
          },
          {
            value: 'adjust',
            label: 'Ajustes',
            content: (
              <>
                {ADJUSTMENTS.map(({ id, name }) => (
                  <Slider
                    key={id}
                    label={name}
                    min={-ADJUSTMENT_LIMIT}
                    max={ADJUSTMENT_LIMIT}
                    value={color.adjust[id]}
                    onChange={(value) => setColor({ adjust: { ...color.adjust, [id]: value } }, id)}
                    formatValue={signed}
                    resetTo={0}
                    disabled={disabled}
                  />
                ))}
                <p className="text-xs text-fg-muted">Toque duas vezes num controle para voltar ao zero. Os ajustes valem por cima do filtro.</p>
                {adjusted && (
                  <Button size="sm" variant="ghost" icon={RotateCcw} className="justify-self-start pointer-coarse:h-11" disabled={disabled} onClick={() => setColor({ adjust: NO_ADJUSTMENTS })}>
                    Zerar ajustes
                  </Button>
                )}
              </>
            ),
          },
          {
            value: 'speed',
            label: 'Velocidade',
            content: (
              <>
                <ChoiceGrid
                  label="Velocidade"
                  columns={4}
                  value={String(speed)}
                  onChange={(value) => onChange((current) => ({ ...current, speed: Number(value) }))}
                  optionClassName={CHIP}
                  options={SPEEDS.map((option) => ({ value: String(option), name: speedLabel(option), content: () => speedLabel(option) }))}
                />
                <p className="text-sm text-fg-muted tabular-nums">
                  {speed === 1
                    ? `Na velocidade normal, o vídeo fica com ${formatTime(editedDuration)}.`
                    : `A ${speedLabel(speed)}, o vídeo fica com ${formatTime(editedDuration / speed)} (era ${formatTime(editedDuration)}). O som acompanha sem mudar o tom.`}
                </p>
              </>
            ),
          },
        ]}
      />

      {active && (
        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="danger" size="sm" icon={RotateCcw} className="pointer-coarse:h-11" disabled={disabled} onClick={() => onChange(() => NO_EFFECTS)}>
            Tirar os efeitos
          </Button>
        </div>
      )}
    </section>
  )
}

import { CircleAlert, LayoutGrid, LoaderCircle, Pipette, Plus, Shapes, Shuffle, X } from 'lucide-react'
import { useState } from 'react'
import { FilePickerButton } from '../../../components/tool/FilePickerButton'
import { Button, IconButton } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Slider } from '../../../components/ui/Slider'
import { Tabs } from '../../../components/ui/Tabs'
import {
  COLLAGE_COLORS,
  COLLAGE_LIMITS,
  COLLAGE_RATIOS,
  cellRects,
  frameSize,
  layoutsFor,
  type CollageMode,
  type CollageRatio,
  type GridLayout,
} from '../../../core/image/collage'
import { ACCEPTED_TYPES } from '../shared/constants'
import { ChoiceGrid } from './ChoiceGrid'
import type { Collage } from './useCollage'

type OptionsTab = 'layout' | 'border' | 'photos'

const MODE_OPTIONS = [
  {
    value: 'grid' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={LayoutGrid} size="sm" />
        Grade
      </span>
    ),
  },
  {
    value: 'free' as const,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={Shapes} size="sm" />
        Livre
      </span>
    ),
  },
]

const RATIO_OPTIONS = COLLAGE_RATIOS.map((ratio) => ({ value: ratio.value, label: ratio.value }))

const TILE =
  'grid aspect-square min-h-11 place-items-center rounded-md border p-2 transition-colors duration-(--dur-2) ' +
  'border-border bg-surface-2 text-fg-subtle hover:pointer-fine:border-border-strong hover:pointer-fine:text-fg ' +
  'aria-checked:border-accent aria-checked:bg-accent-soft aria-checked:text-accent forced-colors:aria-checked:outline'

const SWATCH =
  'grid h-11 place-items-center rounded-full transition-shadow duration-(--dur-2) ' +
  'aria-checked:ring-2 aria-checked:ring-accent aria-checked:ring-offset-2 aria-checked:ring-offset-surface-1 forced-colors:aria-checked:outline'

/** Desenho do layout na proporção escolhida: os espaços como blocos, como nos apps de colagem. */
function LayoutThumb({ layout, ratio }: { layout: GridLayout; ratio: CollageRatio }) {
  const frame = frameSize(ratio, 60)
  const rects = cellRects(layout, frame, 4)
  return (
    <svg viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true" className="max-h-full max-w-full">
      {rects.map((rect, index) => (
        <rect key={index} x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={2.5} className="fill-current opacity-70" />
      ))}
    </svg>
  )
}

function Swatch({ color }: { color: string }) {
  return <span className="size-8 rounded-full shadow-1 ring-1 ring-white/25 ring-inset" style={{ backgroundColor: color }} />
}

/** Cores prontas e "Outra cor", que abre o seletor de cores do aparelho. */
function ColorChoice({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const preset = COLLAGE_COLORS.some((color) => color.value === value)
  return (
    <ChoiceGrid
      label={label}
      columns={5}
      value={preset ? value : undefined}
      onChange={onChange}
      optionClassName={SWATCH}
      options={COLLAGE_COLORS.map((color) => ({ value: color.value, name: color.name, content: () => <Swatch color={color.value} /> }))}
      trailing={
        <label
          title="Outra cor"
          className={`${SWATCH} relative cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${preset ? '' : 'ring-2 ring-accent ring-offset-2 ring-offset-surface-1'}`}
        >
          {preset ? (
            <span className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-2 text-fg-muted">
              <Icon icon={Pipette} size="sm" />
            </span>
          ) : (
            <Swatch color={value} />
          )}
          <input
            type="color"
            value={value}
            aria-label="Outra cor"
            onChange={(event) => onChange(event.currentTarget.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      }
    />
  )
}

function LayoutTab({ collage }: { collage: Collage }) {
  const { state, dispatch, photos, layout } = collage
  const count = photos.length
  const layouts = layoutsFor(count)
  const ratio = (
    <SegmentedControl
      label="Proporção"
      options={RATIO_OPTIONS}
      value={state.ratio}
      onChange={(value) => dispatch({ type: 'ratio', ratio: value, photos })}
      compact
    />
  )

  if (state.mode === 'free') {
    return (
      <>
        {ratio}
        <div className="grid gap-2">
          <Button icon={Shuffle} className="justify-self-start" onClick={() => dispatch({ type: 'scatter', photos })}>
            Espalhar de novo
          </Button>
          <p className="text-xs text-fg-muted">Volta as fotos para a disposição inicial, cada uma no seu canto.</p>
        </div>
      </>
    )
  }

  return (
    <>
      {count < COLLAGE_LIMITS.minPhotos ? (
        <p className="text-sm text-fg-muted">Os modelos aparecem quando houver pelo menos 2 fotos.</p>
      ) : (
        <ChoiceGrid
          label={`Modelos para ${count} fotos`}
          columns={4}
          value={layout?.id}
          onChange={(id) => dispatch({ type: 'layout', count, id })}
          optionClassName={TILE}
          options={layouts.map((option) => ({ value: option.id, name: option.name, content: () => <LayoutThumb layout={option} ratio={state.ratio} /> }))}
        />
      )}
      {ratio}
    </>
  )
}

function BorderTab({ collage }: { collage: Collage }) {
  const { state, dispatch } = collage
  const free = state.mode === 'free'
  const percent = (value: number) => `${value}%`
  return (
    <>
      <Slider
        label={free ? 'Moldura das fotos' : 'Espessura da borda'}
        value={state.style.spacing}
        onChange={(spacing) => dispatch({ type: 'style', style: { spacing } })}
        formatValue={percent}
        resetTo={24}
      />
      <Slider
        label="Cantos arredondados"
        value={state.style.radius}
        onChange={(radius) => dispatch({ type: 'style', style: { radius } })}
        formatValue={percent}
        resetTo={16}
      />
      <ColorChoice
        label={free ? 'Cor do fundo' : 'Cor da borda'}
        value={state.style.color}
        onChange={(color) => dispatch({ type: 'style', style: { color } })}
      />
      {free && (
        <SegmentedControl
          label="Sombra nas fotos"
          options={[
            { value: 'on', label: 'Com sombra' },
            { value: 'off', label: 'Sem sombra' },
          ]}
          value={state.style.shadow ? 'on' : 'off'}
          onChange={(value) => dispatch({ type: 'style', style: { shadow: value === 'on' } })}
        />
      )}
    </>
  )
}

function PhotosTab({ collage, onRemove }: { collage: Collage; onRemove: (id: string) => void }) {
  const { batch, phase } = collage
  const items = batch.items
  const full = items.length >= COLLAGE_LIMITS.maxPhotos
  const rejected = items.filter((item) => item.status === 'rejected')
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted tabular-nums">{`${items.length} de ${COLLAGE_LIMITS.maxPhotos} fotos`}</p>
        <FilePickerButton accept={ACCEPTED_TYPES} multiple onFiles={collage.addFiles} icon={Plus} disabled={full || phase !== 'editing'} size="sm" className="pointer-coarse:h-11">
          Adicionar
        </FilePickerButton>
      </div>
      <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4" aria-label="Fotos da colagem">
        {items.map((item, index) => (
          <li key={item.id} className="relative">
            <div
              className={`grid aspect-square place-items-center overflow-hidden rounded-md border bg-surface-2 ${item.status === 'rejected' ? 'border-danger' : 'border-border'}`}
            >
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" className="size-full object-cover" draggable={false} />
              ) : item.status === 'rejected' ? (
                <Icon icon={CircleAlert} className="text-danger" />
              ) : (
                <Icon icon={LoaderCircle} className="animate-spin text-fg-muted" />
              )}
            </div>
            <IconButton
              icon={X}
              label={`Tirar ${item.name}`}
              size="sm"
              variant="secondary"
              tooltipAlign={index % 3 === 2 ? 'end' : 'center'}
              disabled={phase === 'rendering'}
              onClick={() => onRemove(item.id)}
              className="absolute top-1 right-1 size-8! rounded-full border-border-strong bg-surface-3/90 shadow-1 pointer-coarse:size-11!"
            />
          </li>
        ))}
      </ul>
      {batch.notice && <p className="text-sm text-warning">{batch.notice}</p>}
      {rejected.map((item) => (
        <p key={item.id} role="alert" className="flex gap-1.5 text-sm text-danger">
          <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
          <span className="min-w-0 break-words">{`${item.name}: ${item.message ?? 'arquivo recusado.'}`}</span>
        </p>
      ))}
      <p className="text-xs text-fg-muted">JPG, PNG ou WEBP, até 50 MB cada. A ordem na grade se troca tocando nas fotos da colagem.</p>
    </>
  )
}

interface CollageOptionsProps {
  collage: Collage
  onRemove: (id: string) => void
}

/** Painel da colagem: o estilo (grade ou livre) e as abas Layout, Borda e Fotos. */
export function CollageOptions({ collage, onRemove }: CollageOptionsProps) {
  const [tab, setTab] = useState<OptionsTab>('layout')
  const { state, dispatch } = collage
  return (
    <div className="grid gap-5">
      <SegmentedControl<CollageMode>
        label="Estilo"
        options={MODE_OPTIONS}
        value={state.mode}
        onChange={(mode) => dispatch({ type: 'mode', mode })}
      />
      <Tabs<OptionsTab>
        label="Opções da colagem"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'layout', label: 'Layout', content: <LayoutTab collage={collage} /> },
          { value: 'border', label: 'Borda', content: <BorderTab collage={collage} /> },
          {
            value: 'photos',
            label: (
              <>
                Fotos
                <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted tabular-nums">{collage.batch.items.length}</span>
              </>
            ),
            content: <PhotosTab collage={collage} onRemove={onRemove} />,
          },
        ]}
      />
    </div>
  )
}

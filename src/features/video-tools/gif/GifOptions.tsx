import { CircleAlert } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { formatDimensions } from '../../../core/format'
import { GIF_FRAME_RATES, MAX_GIF_SECONDS, type GifFrameRate, type GifSize } from '../../../core/video/gif'
import { formatTime } from '../../../core/video/time'
import type { TrimField, TrimFocusRequest } from '../../../core/video/trim'
import { Note } from '../shared/Note'
import { TimeFields } from '../shared/TimeFields'
import type { GifPlan } from './useGifTool'

const FRAME_RATE_LABELS: Record<GifFrameRate, string> = { 10: 'Normal', 15: 'Suave' }

const FRAME_RATE_DESCRIPTIONS: Record<GifFrameRate, string> = {
  10: '10 quadros por segundo, o comum em GIF.',
  15: '15 quadros por segundo: o movimento fica mais suave, e o GIF, mais pesado.',
}

interface GifOptionsProps {
  plan: GifPlan
  onFieldChange: (field: TrimField, text: string) => void
  onSizeChange: (size: GifSize) => void
  onFpsChange: (fps: GifFrameRate) => void
  focusRequest?: TrimFocusRequest
  disabled?: boolean
}

/** Trecho (no máximo 15 s), tamanho e fluidez do GIF, com as medidas e os quadros que ele terá. */
export function GifOptions({ plan, onFieldChange, onSizeChange, onFpsChange, focusRequest, disabled = false }: GifOptionsProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const hintId = `${id}-dica`
  const inputs = useRef(new Map<TrimField, HTMLInputElement>())
  const { error, range, dimensions } = plan

  // Ao tentar criar com problema, o foco vai ao campo (o leitor de tela lê o aviso junto).
  useEffect(() => {
    if (focusRequest) inputs.current.get(focusRequest.field)?.focus()
  }, [focusRequest])

  const sizes = plan.sizeChoices.map(({ size, available }) => ({ value: String(size), label: `${size} px`, disabled: !available }))
  const selectSize = (value: string) => {
    const choice = plan.sizeChoices.find((item) => String(item.size) === value)
    if (choice) onSizeChange(choice.size)
  }
  const rates = GIF_FRAME_RATES.map((rate) => ({ value: String(rate), label: FRAME_RATE_LABELS[rate] }))
  const selectRate = (value: string) => {
    const rate = GIF_FRAME_RATES.find((item) => String(item) === value)
    if (rate) onFpsChange(rate)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <h3 className="text-sm font-semibold text-fg">Trecho do GIF</h3>
        <TimeFields
          values={plan.fields}
          onChange={onFieldChange}
          invalid={error?.fields ?? []}
          errorId={errorId}
          hintId={hintId}
          inputRef={(field, element) => {
            if (element) inputs.current.set(field, element)
            else inputs.current.delete(field)
          }}
          disabled={disabled}
        />
        {error && (
          // Valor errado aparece enquanto a pessoa digita, sem mudar o foco: é anunciado na hora.
          <p id={errorId} role={error.missing ? undefined : 'alert'} className="flex gap-1.5 text-sm text-danger">
            <Icon icon={CircleAlert} size="sm" className="mt-0.5" />
            <span>{error.message}</span>
          </p>
        )}
        <p id={hintId} className="text-xs text-fg-subtle">
          {`No máximo ${MAX_GIF_SECONDS} segundos. Digite como 0:05,30 ou use os botões abaixo do vídeo.`}
        </p>
      </div>

      {plan.size ? (
        <div className="grid gap-2">
          <SegmentedControl label="Tamanho" options={sizes} value={String(plan.size)} onChange={selectSize} disabled={disabled} />
          <p className="text-xs text-fg-muted">
            Medida do lado maior. Tamanhos maiores que o vídeo ficam desligados: aumentar só deixaria o GIF mais pesado.
          </p>
        </div>
      ) : (
        <Note>{`O vídeo é pequeno: o GIF fica do tamanho dele, ${formatDimensions(dimensions.width, dimensions.height)}.`}</Note>
      )}

      <div className="grid gap-2">
        <SegmentedControl label="Fluidez" options={rates} value={String(plan.fps)} onChange={selectRate} disabled={disabled} />
        <p className="text-xs text-fg-muted">{FRAME_RATE_DESCRIPTIONS[plan.fps]}</p>
      </div>

      <dl className="grid gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Duração</dt>
          <dd className="tabular-nums text-fg">{range ? formatTime(range.end - range.start) : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Medidas</dt>
          <dd className="tabular-nums text-fg">{formatDimensions(dimensions.width, dimensions.height)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Quadros</dt>
          <dd className="tabular-nums text-fg">{plan.frames ?? '—'}</dd>
        </div>
      </dl>

      <Note>O GIF é um formato antigo e pesado. Para mandar por mensagem, um vídeo curto (no Editar vídeo) costuma ficar bem menor.</Note>
      <Note>O GIF não tem som e usa no máximo 256 cores: degradês, como um céu, podem aparecer em faixas.</Note>
    </div>
  )
}

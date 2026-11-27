import { TriangleAlert } from 'lucide-react'
import { ADJUSTMENTS, FILTERS, colorMatrix, speedLabel, type VideoEffects } from '../../../core/video/effects'
import { formatTime } from '../../../core/video/time'
import type { Edit, SavePlan, Selection } from '../../../core/video/timeline'
import { Note } from '../shared/Note'

interface EditOptionsProps {
  edit: Edit
  /** A parte marcada para sair. */
  selection?: Selection
  plan: SavePlan
  /** Quantos textos vão para o arquivo. */
  texts: number
  effects: VideoEffects
  /** Duração do vídeo salvo (o que fica, na velocidade escolhida). */
  finalDuration: number
  /** Por que este navegador não consegue salvar a edição atual. */
  saveBlocker?: string
  extraTracks: boolean
}

/** Com texto, filtro ou ajustes, todo quadro é redesenhado: não há o que copiar. */
const WITH_LOOK = 'Com texto, filtro ou ajustes, o vídeo é refeito para eles entrarem nos quadros, o que pode demorar em vídeos longos.'

const WITH_SPEED = 'Em outra velocidade, o vídeo e o som são refeitos, o que pode demorar em vídeos longos. O som acompanha sem mudar o tom.'

const SAVE_DESCRIPTIONS: Record<SavePlan['kind'], string> = {
  unchanged: 'Marque na barra a parte que quer tirar e toque em Excluir, ponha um texto pelo T ou escolha um efeito, para poder salvar.',
  trim: 'Sobrou um trecho só: quando dá, ele é copiado sem refazer, rápido e sem perder qualidade.',
  join: 'Para juntar os pedaços, o vídeo é refeito, o que pode demorar em vídeos longos. As emendas ficam no ponto exato.',
}

function Row({ term, children, accent = false }: { term: string; children: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{term}</dt>
      <dd className={accent ? 'text-right tabular-nums text-accent' : 'text-right tabular-nums text-fg'}>{children}</dd>
    </div>
  )
}

/** Resumo do vídeo editado, a parte marcada, os efeitos e como ele será salvo. */
export function EditOptions({ edit, selection, plan, texts, effects, finalDuration, saveBlocker, extraTracks }: EditOptionsProps) {
  const { color, speed } = effects
  const filter = color.filter !== 'original' && color.intensity > 0 ? FILTERS.find((item) => item.id === color.filter) : undefined
  const adjustments = ADJUSTMENTS.filter(({ id }) => color.adjust[id] !== 0).map(({ name }) => name)
  const recolored = colorMatrix(color) !== null
  const description = texts > 0 || recolored ? WITH_LOOK : speed !== 1 ? WITH_SPEED : SAVE_DESCRIPTIONS[plan.kind]
  return (
    <div className="grid gap-6">
      <dl className="grid gap-2 text-sm">
        <Row term="Vídeo final">{formatTime(finalDuration)}</Row>
        <Row term="Pedaços">{String(edit.pieces.length)}</Row>
        {texts > 0 && <Row term="Textos">{String(texts)}</Row>}
        {filter && <Row term="Filtro">{color.intensity < 100 ? `${filter.name} (${color.intensity}%)` : filter.name}</Row>}
        {adjustments.length > 0 && <Row term="Ajustes">{adjustments.join(', ')}</Row>}
        {speed !== 1 && <Row term="Velocidade">{speedLabel(speed)}</Row>}
        {selection && (
          <Row term="Parte marcada" accent>
            {`${formatTime(selection.start)} a ${formatTime(selection.end)} · ${formatTime(selection.end - selection.start)}`}
          </Row>
        )}
      </dl>

      {saveBlocker ? (
        <Note icon={TriangleAlert} tone="text-warning">
          {saveBlocker}
        </Note>
      ) : (
        <p className="text-xs text-fg-muted">{description}</p>
      )}

      {extraTracks && <Note>Este vídeo tem mais de uma faixa de vídeo ou de áudio: o resultado fica só com a principal de cada.</Note>}
    </div>
  )
}

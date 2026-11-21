import { ENCODED_AUDIO_CODEC, ENCODED_VIDEO_CODEC, type ConvertPlan } from '../../../core/video/convert'
import { VIDEO_FORMATS, codecLabel } from '../../../core/video/formats'
import type { VideoToolLabels } from '../shared/useVideoTool'

export const CONVERT_LABELS: VideoToolLabels = {
  action: 'Converter',
  progress: 'Convertendo',
  done: 'convertido',
  cancelled: 'Conversão cancelada.',
}

const AUDIO_CODEC_LABELS = { aac: 'AAC', opus: 'Opus' } as const

export const TRY_OTHER_BROWSER = 'Tente no Chrome, no Edge ou no Safari.'

/** O que acontece com o vídeo, em poucas palavras ("Refeito em H.264"). */
export const videoActionLabel = ({ video, target }: ConvertPlan) =>
  video === 'copy' ? 'Copiado, sem perder qualidade' : `Refeito em ${codecLabel(ENCODED_VIDEO_CODEC[target])}`

/** O que acontece com o som; `null` sem som. `audioBitrate`: a taxa do som refeito, em bits por segundo. */
export const audioActionLabel = ({ audio, target }: ConvertPlan, audioBitrate: number) =>
  audio === null
    ? null
    : audio === 'copy'
      ? 'Copiado, sem perder qualidade'
      : `Refeito em ${AUDIO_CODEC_LABELS[ENCODED_AUDIO_CODEC[target]]}, a ${Math.round(audioBitrate / 1000)} kbit/s`

/** Por que este navegador não consegue: o que precisaria ser refeito (só para planos bloqueados). */
function blockedReason({ blocked, target }: ConvertPlan, sourceCodec: string): string {
  if (blocked === 'audio') return `o som precisa ser refeito em ${AUDIO_CODEC_LABELS[ENCODED_AUDIO_CODEC[target]]}, e este navegador não gera esse formato de som`
  return `o vídeo precisa ser refeito em ${codecLabel(ENCODED_VIDEO_CODEC[target])}, e este navegador não consegue refazer vídeos ${codecLabel(sourceCodec)}`
}

/** Observação de um formato desligado: "MOV indisponível: o som precisa ser refeito em AAC...". */
export const unavailableNote = (plan: ConvertPlan, sourceCodec: string) =>
  `${VIDEO_FORMATS[plan.target].label} indisponível: ${blockedReason(plan, sourceCodec)}. ${TRY_OTHER_BROWSER}`

/**
 * Explicação quando nenhum formato funciona: "Para MP4 e MOV, o som precisa ser refeito em AAC...".
 * Formatos com o mesmo motivo ficam juntos.
 */
export function noTargetExplanation(plans: readonly ConvertPlan[], sourceCodec: string): string {
  const groups = new Map<string, string[]>()
  for (const plan of plans) {
    const reason = blockedReason(plan, sourceCodec)
    groups.set(reason, [...(groups.get(reason) ?? []), VIDEO_FORMATS[plan.target].label])
  }
  const sentences = [...groups].map(([reason, labels]) => `Para ${labels.join(' e ')}, ${reason}.`)
  return `${sentences.join(' ')} ${TRY_OTHER_BROWSER}`
}

/**
 * Converter vídeo: para que formatos o vídeo pode ir, o que é copiado e o que é refeito, a taxa do vídeo
 * refeito e o nome do arquivo. Funções puras: sem React nem DOM.
 */
import { REENCODED_AUDIO_BITRATE } from './audio'
import type { VideoFormat } from './formats'
import { videoOutputName } from './output-name'
import { FORMAT_EFFICIENCY, HIGH_QUALITY_FACTOR, originalVideoBitrate, roundBitrate, videoBitrateFor, type OriginalVideo } from './sizing'

const ALL_FORMATS: readonly VideoFormat[] = ['mp4', 'mov', 'webm']

/** Copiar ou refazer uma faixa (vídeo ou som). */
export type TrackAction = 'copy' | 'encode'

/**
 * Como um vídeo HEVC (o dos iPhones) vai para MP4 ou MOV: refeito em H.264, que toca em todo lugar
 * ("compatível"), ou copiado como está, instantâneo e sem perda, mas sem tocar em alguns aparelhos ("rápido").
 */
export type VideoMode = 'compatible' | 'fast'

export const VIDEO_MODES: readonly VideoMode[] = ['compatible', 'fast']

/**
 * Codecs refeitos em cada formato: H.264 e AAC no MP4 e no MOV, que tocam em todo lugar; VP9 e Opus no
 * WEBM. O Worker pode cair para VP8, AV1 ou Vorbis onde o navegador não tiver os primeiros.
 */
export const ENCODED_VIDEO_CODEC: Record<VideoFormat, 'avc' | 'vp9'> = { mp4: 'avc', mov: 'avc', webm: 'vp9' }
export const ENCODED_AUDIO_CODEC: Record<VideoFormat, 'aac' | 'opus'> = { mp4: 'aac', mov: 'aac', webm: 'opus' }

/** O que é copiado sem refazer. MP4 e MOV comportam outros codecs, mas H.264 e AAC são os que tocam em todo lugar. */
const COPYABLE_VIDEO: Record<VideoFormat, readonly string[]> = { mp4: ['avc'], mov: ['avc'], webm: ['vp9', 'vp8', 'av1'] }
const COPYABLE_AUDIO: Record<VideoFormat, readonly string[]> = { mp4: ['aac'], mov: ['aac'], webm: ['opus', 'vorbis'] }

/** O vídeo de origem e o que este navegador consegue refazer com ele, conferidos ao abrir. */
export interface ConvertSource {
  format: VideoFormat
  /** Codec do vídeo como o Mediabunny o nomeia ("avc", "hevc", "vp9"...). */
  codec: string
  /** Codec do som; `null` sem som. */
  audioCodec: string | null
  /** Tem rotação gravada (ex.: celular em pé). O WEBM não guarda rotação: lá o vídeo é refeito, já girado. */
  rotated: boolean
  /** Para cada formato, se o navegador consegue refazer o vídeo e o som nos codecs dele. */
  reencodable: Record<VideoFormat, { video: boolean; audio: boolean }>
}

export interface ConvertPlan {
  target: VideoFormat
  video: TrackAction
  /** `null` sem som. */
  audio: TrackAction | null
  /** O que precisa ser refeito e este navegador não consegue; `null` quando a conversão é possível. */
  blocked: 'video' | 'audio' | null
}

/** Os formatos oferecidos: os dois diferentes do original. */
export const convertTargets = (format: VideoFormat): VideoFormat[] => ALL_FORMATS.filter((target) => target !== format)

/** Só o HEVC indo para MP4 ou MOV tem escolha: os dois formatos o comportam, mas nem todo aparelho o toca. */
export const hasVideoModes = ({ codec }: Pick<ConvertSource, 'codec'>, target: VideoFormat) => codec === 'hevc' && target !== 'webm'

type TrackSource = Pick<ConvertSource, 'codec' | 'audioCodec' | 'rotated'>

function videoAction(source: TrackSource, target: VideoFormat, mode: VideoMode): TrackAction {
  if (target === 'webm' && source.rotated) return 'encode'
  if (COPYABLE_VIDEO[target].includes(source.codec)) return 'copy'
  return hasVideoModes(source, target) && mode === 'fast' ? 'copy' : 'encode'
}

/** O que é copiado e o que é refeito, sem olhar o que o navegador consegue (o Worker descobre ao fazer). */
export function convertActions(source: TrackSource, target: VideoFormat, mode: VideoMode): Pick<ConvertPlan, 'video' | 'audio'> {
  const video = videoAction(source, target, mode)
  const audio = source.audioCodec === null ? null : COPYABLE_AUDIO[target].includes(source.audioCodec) ? 'copy' : 'encode'
  return { video, audio }
}

export function convertPlan(source: ConvertSource, target: VideoFormat, mode: VideoMode): ConvertPlan {
  const { video, audio } = convertActions(source, target, mode)
  const can = source.reencodable[target]
  const blocked = video === 'encode' && !can.video ? 'video' : audio === 'encode' && !can.audio ? 'audio' : null
  return { target, video, audio, blocked }
}

/** Modo já escolhido: "compatível" quando o navegador consegue refazer o vídeo; senão, "rápido". */
export const defaultVideoMode = (source: ConvertSource, target: VideoFormat): VideoMode =>
  convertPlan(source, target, 'compatible').blocked === null ? 'compatible' : 'fast'

export interface TargetChoice {
  target: VideoFormat
  /** Algum modo funciona neste navegador. */
  available: boolean
}

export function targetChoices(source: ConvertSource): TargetChoice[] {
  return convertTargets(source.format).map((target) => ({
    target,
    available: convertPlan(source, target, defaultVideoMode(source, target)).blocked === null,
  }))
}

/** Formato já escolhido ao abrir: o primeiro disponível, na ordem MP4, MOV, WEBM. */
export const defaultTarget = (choices: readonly TargetChoice[]): VideoFormat | undefined => choices.find((choice) => choice.available)?.target

/**
 * Taxa de bits para a mesma qualidade, em relação ao H.264. HEVC e VP9 precisam de cerca de 60%; AV1, de
 * cerca de metade. Codec desconhecido conta como H.264.
 */
const CODEC_EFFICIENCY: Partial<Record<string, number>> = { avc: 1, hevc: 0.6, vp9: 0.6, av1: 0.5 }

/**
 * Taxa do vídeo refeito: qualidade alta nas mesmas medidas, mas nunca acima do que o original tem,
 * convertido para a eficiência do codec novo (o H.264 precisa de mais taxa que o HEVC do iPhone para a
 * mesma imagem; o VP9, de menos). Sem esse limite, um vídeo bem comprimido sairia maior à toa.
 */
export function convertedVideoBitrate(source: OriginalVideo & { codec: string }, target: VideoFormat): number {
  const high = videoBitrateFor(source.original, HIGH_QUALITY_FACTOR, target)
  const ceiling = (originalVideoBitrate(source) * FORMAT_EFFICIENCY[target]) / (CODEC_EFFICIENCY[source.codec] ?? 1)
  return roundBitrate(Math.min(high, ceiling))
}

/**
 * Taxas do som refeito, em ordem. O codificador de AAC do Windows só aceita estas; abaixo de 96 kbit/s o som
 * perde qualidade de forma perceptível.
 */
const AUDIO_BITRATE_STEPS = [96_000, 128_000, 160_000, REENCODED_AUDIO_BITRATE]

/** Margem para a taxa medida do original (ex.: 96,4 kbit/s conta como 96). */
const AUDIO_BITRATE_TOLERANCE = 0.95

/**
 * Taxa do som refeito: a menor da lista que alcança a do original, até 192 kbit/s. Assim um som já comprimido
 * (ex.: AAC a 96 kbit/s) não dobra de tamanho, e um sem compressão (PCM de câmera) sai a 192. Sem a taxa do
 * original, 192.
 */
export function convertedAudioBitrate(originalAudioBitrate: number | null): number {
  if (originalAudioBitrate === null) return REENCODED_AUDIO_BITRATE
  return AUDIO_BITRATE_STEPS.find((step) => step >= originalAudioBitrate * AUDIO_BITRATE_TOLERANCE) ?? REENCODED_AUDIO_BITRATE
}

/** O mesmo nome, com a extensão nova: "praia.MOV" → "praia.mp4". Sempre exibido como texto, nunca como HTML. */
export const convertOutputName = (inputName: string, target: VideoFormat) => videoOutputName(inputName, target, '')

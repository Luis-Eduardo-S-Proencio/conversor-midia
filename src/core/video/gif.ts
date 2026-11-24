/**
 * Criar GIF a partir de um trecho do vídeo: tamanhos, fluidez, duração máxima, os momentos dos quadros e
 * quanto cada um fica na tela. Funções puras: sem React nem DOM.
 */
import type { Dimensions } from '../image/resize'
import { safeBaseName } from '../file-name'
import { formatDuration } from './time'
import { TIME_TOLERANCE, checkRange, checkTimeValues, fieldsOfRange, type TrimFields, type TrimValidation } from './trim'

/** Trecho mais longo aceito, em segundos: o GIF é um formato antigo e pesado, e cresce rápido. */
export const MAX_GIF_SECONDS = 15

/** Trecho já marcado ao abrir um vídeo mais longo que o máximo. */
const DEFAULT_GIF_SECONDS = 5

/** Tamanho pelo lado maior do quadro, em pixels. */
export type GifSize = 320 | 480 | 640

export const GIF_SIZES: readonly GifSize[] = [320, 480, 640]

const DEFAULT_GIF_SIZE: GifSize = 480

/** Quadros por segundo: 10 é o comum em GIF; 15 fica mais suave e mais pesado. */
export type GifFrameRate = 10 | 15

export const GIF_FRAME_RATES: readonly GifFrameRate[] = [10, 15]

export interface GifSizeChoice {
  size: GifSize
  /** Não maior que o vídeo: aumentar só deixaria o GIF mais pesado, sem detalhe novo. */
  available: boolean
}

export function gifSizeChoices(video: Dimensions): GifSizeChoice[] {
  const longest = Math.max(video.width, video.height)
  return GIF_SIZES.map((size) => ({ size, available: size <= longest }))
}

/** Tamanho já escolhido ao abrir: 480 quando dá; senão, o maior disponível. Vídeo pequeno: nenhum (fica do tamanho dele). */
export function defaultGifSize(choices: readonly GifSizeChoice[]): GifSize | undefined {
  if (choices.some((choice) => choice.size === DEFAULT_GIF_SIZE && choice.available)) return DEFAULT_GIF_SIZE
  return choices.filter((choice) => choice.available).at(-1)?.size
}

/**
 * Medidas do GIF: o lado maior vira o tamanho escolhido, com a proporção mantida. Sem tamanho (vídeo
 * menor que todos), as medidas do próprio vídeo. Nunca aumenta.
 */
export function gifDimensions(video: Dimensions, size: GifSize | undefined): Dimensions {
  const longest = Math.max(video.width, video.height)
  const scale = size === undefined ? 1 : Math.min(1, size / longest)
  return { width: Math.max(1, Math.round(video.width * scale)), height: Math.max(1, Math.round(video.height * scale)) }
}

/** Trecho marcado ao abrir: o vídeo inteiro, se couber no máximo; senão, os primeiros segundos. */
export const defaultGifFields = (duration: number): TrimFields =>
  fieldsOfRange({ start: 0, end: duration <= MAX_GIF_SECONDS + TIME_TOLERANCE ? duration : DEFAULT_GIF_SECONDS })

/** Confere os campos de início e fim (formato, dentro do vídeo, ordem) e, além disso, a duração máxima do GIF. */
export function validateGifRange(fields: TrimFields, duration: number): TrimValidation {
  const checked = checkTimeValues(fields, duration)
  if (!checked.ok) return checked
  const validation = checkRange(fields, checked.values, duration, 'O trecho')
  if (!validation.ok) return validation
  const length = validation.range.end - validation.range.start
  if (length > MAX_GIF_SECONDS + TIME_TOLERANCE) {
    return {
      ok: false,
      error: {
        message: `O GIF pode ter no máximo ${MAX_GIF_SECONDS} segundos, para não ficar pesado demais. O trecho marcado tem ${formatDuration(length)}.`,
        fields: ['end'],
        missing: false,
      },
    }
  }
  return validation
}

/** Quantos quadros o trecho terá (ao menos um). */
export const gifFrameCount = (seconds: number, fps: GifFrameRate) => Math.max(1, Math.round(seconds * fps))

/** Momentos (em segundos do vídeo) em que cada quadro é tirado, de `1/fps` em `1/fps`. */
export function gifFrameTimes(start: number, end: number, fps: GifFrameRate): number[] {
  return Array.from({ length: gifFrameCount(end - start, fps) }, (_, index) => start + index / fps)
}

/** Quadros olhados para montar a paleta: espalhados pelo trecho, bastam para as cores principais. */
export const GIF_PALETTE_SAMPLES = 16

/** Até `count` momentos espalhados por igual entre os dos quadros, do primeiro ao último. */
export function gifPaletteTimes(times: readonly number[], count = GIF_PALETTE_SAMPLES): number[] {
  if (times.length <= count) return [...times]
  return Array.from({ length: count }, (_, index) => times[Math.round((index * (times.length - 1)) / (count - 1))] ?? 0)
}

/**
 * Quanto cada quadro fica na tela, em centésimos de segundo (a unidade do GIF). A 15 quadros por segundo
 * não dá conta exata (6,67): os tempos alternam entre 7 e 6, e o GIF não adianta nem atrasa em relação ao vídeo.
 */
export function gifDelays(count: number, fps: GifFrameRate): number[] {
  return Array.from({ length: count }, (_, index) => Math.round(((index + 1) * 100) / fps) - Math.round((index * 100) / fps))
}

/** Nome do GIF: "praia.mp4" → "praia.gif". Sempre exibido como texto, nunca como HTML. */
export const gifOutputName = (inputName: string) => `${safeBaseName(inputName, 'video')}.gif`

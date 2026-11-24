/**
 * Extrair áudio: em que formato o som do vídeo pode sair e o nome do arquivo.
 * Funções puras: sem React nem DOM.
 */
import { safeBaseName } from '../file-name'

/** Formatos do arquivo de som. M4A guarda AAC; WEBM, Opus ou Vorbis; MP3, o próprio MP3. */
export type AudioFormat = 'm4a' | 'webm' | 'mp3'

export interface AudioFormatInfo {
  label: string
  mimeType: string
  extension: string
}

export const AUDIO_FORMATS: Record<AudioFormat, AudioFormatInfo> = {
  m4a: { label: 'M4A', mimeType: 'audio/mp4', extension: 'm4a' },
  webm: { label: 'WEBM', mimeType: 'audio/webm', extension: 'webm' },
  mp3: { label: 'MP3', mimeType: 'audio/mpeg', extension: 'mp3' },
}

/** Taxa do som refeito (M4A ou MP3), em bits por segundo: boa qualidade para música e voz. */
export const REENCODED_AUDIO_BITRATE = 192_000

/**
 * Taxas do som refeito dentro do vídeo, em ordem. O codificador de AAC do Windows só aceita estas; abaixo de
 * 96 kbit/s o som perde qualidade de forma perceptível.
 */
const AUDIO_BITRATE_STEPS = [96_000, 128_000, 160_000, REENCODED_AUDIO_BITRATE]

/** Margem para a taxa medida do original (ex.: 96,4 kbit/s conta como 96). */
const AUDIO_BITRATE_TOLERANCE = 0.95

/**
 * Taxa do som refeito dentro do vídeo (converter, remover partes): a menor da lista que alcança a do original,
 * até 192 kbit/s. Assim um som já comprimido (ex.: AAC a 96 kbit/s) não dobra de tamanho, e um sem compressão
 * (PCM de câmera) sai a 192. Sem a taxa do original, 192.
 */
export function reencodedAudioBitrate(originalAudioBitrate: number | null): number {
  if (originalAudioBitrate === null) return REENCODED_AUDIO_BITRATE
  return AUDIO_BITRATE_STEPS.find((step) => step >= originalAudioBitrate * AUDIO_BITRATE_TOLERANCE) ?? REENCODED_AUDIO_BITRATE
}

/**
 * Formato em que o som pode ser copiado sem refazer, ou `null`. AAC (o som dos celulares) vai para M4A;
 * Opus e Vorbis, para WEBM, que o Safari toca desde a versão 17.4 (o Ogg, só bem depois).
 * Outros sons (PCM, MP3 ou AC-3 dentro do vídeo) são raros em celular e saem refeitos.
 */
export function copyableAudioFormat(codec: string | null): AudioFormat | null {
  if (codec === 'aac') return 'm4a'
  if (codec === 'opus' || codec === 'vorbis') return 'webm'
  return null
}

/** O som do vídeo e o que o navegador consegue fazer com ele. */
export interface AudioCapabilities {
  /** Codec do som como o Mediabunny o nomeia ("aac", "opus"...); `null` sem som. */
  audioCodec: string | null
  canDecodeAudio: boolean
  canEncodeAac: boolean
  canEncodeMp3: boolean
}

export interface AudioChoice {
  format: AudioFormat
  /** O som é copiado como está, sem refazer (rápido e sem perder qualidade). */
  copy: boolean
  /** Este navegador consegue gerar este formato a partir deste vídeo. */
  available: boolean
}

/**
 * Formatos oferecidos, na ordem: a cópia do som original (quando existe), depois M4A e MP3 refeitos.
 * Copiar só lê e grava pacotes: funciona em qualquer navegador. Refazer exige decodificar o som e um
 * codificador: o de AAC é do navegador (o Firefox não tem); o de MP3 vem junto com o site (WebAssembly).
 */
export function audioChoices({ audioCodec, canDecodeAudio, canEncodeAac, canEncodeMp3 }: AudioCapabilities): AudioChoice[] {
  if (audioCodec === null) return []
  const copied = copyableAudioFormat(audioCodec)
  const choices: AudioChoice[] = []
  if (copied) choices.push({ format: copied, copy: true, available: true })
  if (copied !== 'm4a') choices.push({ format: 'm4a', copy: false, available: canDecodeAudio && canEncodeAac })
  choices.push({ format: 'mp3', copy: false, available: canDecodeAudio && canEncodeMp3 })
  return choices
}

/** Formato já escolhido ao abrir: o primeiro disponível (a cópia, quando existe). */
export const defaultAudioFormat = (choices: readonly AudioChoice[]): AudioFormat | undefined => choices.find((choice) => choice.available)?.format

/** Nome do arquivo de som: "praia.MOV" → "praia-audio.m4a". Sempre exibido como texto, nunca como HTML. */
export function audioOutputName(inputName: string, format: AudioFormat): string {
  return `${safeBaseName(inputName, 'audio')}-audio.${AUDIO_FORMATS[format].extension}`
}

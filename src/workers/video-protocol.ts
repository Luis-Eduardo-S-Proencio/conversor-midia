import type { CropRect } from '../core/image/crop'
import type { VideoFormat } from '../core/video/formats'
import type { VideoErrorCode } from '../core/video/messages'
import type { TrimMode, TrimRange } from '../core/video/trim'

/* Tarefas que o Worker de vídeo executa. O resultado sai sempre no mesmo formato do original. */

/** Abre o vídeo: formato, duração, medidas e o que este navegador consegue fazer com ele. */
export interface InspectJob {
  kind: 'inspect'
  file: Blob
}

/** Mantém só o trecho entre `start` e `end`, em segundos. */
export interface TrimJob {
  kind: 'trim'
  file: Blob
  start: number
  end: number
  mode: TrimMode
}

/**
 * Mantém os trechos pedidos (em segundos, em ordem e sem sobreposição) e os junta, um logo depois do
 * outro: é assim que partes do meio são removidas. O vídeo e o som são recodificados.
 */
export interface JoinJob {
  kind: 'join'
  file: Blob
  ranges: TrimRange[]
}

/** Mantém só a área pedida, em pixels do quadro como ele aparece (rotação já aplicada). */
export interface CropJob {
  kind: 'crop'
  file: Blob
  crop: CropRect
}

export type VideoJob = InspectJob | TrimJob | JoinJob | CropJob

/* Resultados, um por tipo de tarefa. */

export interface VideoInfo {
  format: VideoFormat
  /** Em segundos. */
  duration: number
  /** Medidas do quadro como ele aparece: rotação e proporção de pixel já aplicadas. */
  width: number
  height: number
  /** Codec do vídeo como o Mediabunny o nomeia ("avc", "hevc", "vp9"...). */
  codec: string
  hasAudio: boolean
  /** O navegador decodifica o vídeo e codifica o resultado: sem isso, só dá para copiar (corte rápido). */
  canTranscodeVideo: boolean
  /**
   * O navegador decodifica o som e o codifica no formato de som do arquivo (AAC no MP4 e no MOV, Opus
   * no WEBM); sempre verdadeiro sem som. Recodificam o som: remover partes e o corte exato de WEBM.
   */
  canTranscodeAudio: boolean
  /** Há mais de uma faixa de vídeo ou de áudio: o resultado fica só com as principais. */
  extraTracks: boolean
}

export interface InspectOutput {
  kind: 'inspect'
  info: VideoInfo
}

export interface TrimOutput {
  kind: 'trim'
  blob: Blob
  /** O vídeo foi copiado sem recodificar (corte rápido, ou início num quadro-chave). */
  copied: boolean
}

export interface JoinOutput {
  kind: 'join'
  blob: Blob
}

export interface CropOutput {
  kind: 'crop'
  blob: Blob
  width: number
  height: number
}

export type VideoJobOutput = InspectOutput | TrimOutput | JoinOutput | CropOutput

export type VideoOutputFor<J extends VideoJob> = Extract<VideoJobOutput, { kind: J['kind'] }>

/* Mensagens trocadas com o Worker: todo pedido termina com uma resposta de sucesso ou de erro. */

export type VideoWorkerRequest = VideoJob & { id: number }

export type VideoWorkerResponse =
  /** De 0 a 1, enquanto processa. */
  | { id: number; type: 'progress'; value: number }
  | { id: number; type: 'done'; output: VideoJobOutput }
  | { id: number; type: 'error'; code: VideoErrorCode }

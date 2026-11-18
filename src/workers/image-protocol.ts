import type { ImageFormat } from '../core/image/formats'
import type { ProcessingErrorCode } from '../core/image/messages'

/* Tarefas que o Worker de imagens executa. */

export interface ConvertJob {
  kind: 'convert'
  file: Blob
  target: ImageFormat
  /** De 0 a 1; usada só por formatos com perdas. */
  quality: number
  /** Cor que substitui a transparência quando o formato não a suporta (JPG). */
  background: string
}

export interface PreviewJob {
  kind: 'preview'
  file: Blob
  /** Maior lado, em pixels. */
  previewSize: number
  thumbnailSize: number
}

export interface ProbeJob {
  kind: 'probe'
}

export interface ZipJob {
  kind: 'zip'
  entries: Array<{ name: string; blob: Blob }>
}

export type ImageJob = ConvertJob | PreviewJob | ProbeJob | ZipJob

/* Resultados, um por tipo de tarefa. */

export interface ConvertOutput {
  kind: 'convert'
  blob: Blob
  width: number
  height: number
}

export interface PreviewOutput {
  kind: 'preview'
  preview: Blob
  thumbnail: Blob
  /** Dimensões da imagem original, já orientada. */
  width: number
  height: number
}

export interface ProbeOutput {
  kind: 'probe'
  webpEncoding: boolean
}

export interface ZipOutput {
  kind: 'zip'
  blob: Blob
}

export type JobOutput = ConvertOutput | PreviewOutput | ProbeOutput | ZipOutput

export type OutputFor<J extends ImageJob> = Extract<JobOutput, { kind: J['kind'] }>

/* Mensagens trocadas com o Worker: todo pedido recebe uma resposta de sucesso ou de erro. */

export type WorkerRequest = ImageJob & { id: number }

export type WorkerResponse =
  | { id: number; ok: true; output: JobOutput }
  | { id: number; ok: false; code: ProcessingErrorCode }

import type { ImageWorkerClient } from '../../../workers/image-client'
import type { BatchItem } from './batch-state'

/** Resultado de um arquivo. O nome final ainda é tornado único dentro do lote. */
export interface BatchOutput {
  blob: Blob
  name: string
  note?: string
}

/** Como uma ferramenta processa cada arquivo do lote (sempre pelo Worker). */
export type BatchProcess = (
  file: File,
  item: BatchItem,
  context: { client: ImageWorkerClient; signal: AbortSignal },
) => Promise<BatchOutput>

/** Falha prevista pela regra da ferramenta, com mensagem já pronta para o usuário. */
export class BatchItemError extends Error {}

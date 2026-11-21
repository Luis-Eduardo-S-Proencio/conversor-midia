import { safeBaseName } from '../file-name'
import { OUTPUT_FORMAT_INFO, type OutputFormat } from './formats'

/**
 * Nome do arquivo de saída: "foto.png" → "foto.jpg". Sempre exibido como texto, nunca como HTML.
 * `suffix` é gerado pelo app (ex.: "-2560x1440") e entra depois do limite de tamanho do nome.
 */
export function outputFileName(inputName: string, format: OutputFormat, suffix = ''): string {
  return `${safeBaseName(inputName, 'imagem')}${suffix}.${OUTPUT_FORMAT_INFO[format].extension}`
}

function splitExtension(name: string): [base: string, extension: string] {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
}

/**
 * Torna os nomes únicos ("foto (2).jpg"), sem diferenciar maiúsculas: no Windows e no macOS
 * "Foto.jpg" e "foto.jpg" colidem ao salvar ou extrair um ZIP.
 */
export function uniqueFileNames(names: readonly string[], taken: Iterable<string> = []): string[] {
  const used = new Set(Array.from(taken, (name) => name.toLowerCase()))
  return names.map((name) => {
    const [base, extension] = splitExtension(name)
    let candidate = name
    for (let counter = 2; used.has(candidate.toLowerCase()); counter += 1) {
      candidate = `${base} (${counter})${extension}`
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}

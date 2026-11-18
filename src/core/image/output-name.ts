import { IMAGE_FORMATS, type ImageFormat } from './formats'

const MAX_BASE_LENGTH = 120
const FALLBACK_BASE = 'imagem'
// Proibidos em nomes de arquivo no Windows; os de controle (abaixo de 32) também são trocados.
const FORBIDDEN_CHARACTERS = new Set('<>:"/\\|?*')
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

function replaceForbidden(text: string): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0) ?? 0
    return code < 32 || code === 127 || FORBIDDEN_CHARACTERS.has(char) ? '_' : char
  }).join('')
}

const trimEnd = (text: string) => text.replace(/[. ]+$/, '')

/** Nome-base seguro: sem caminho, sem caracteres proibidos, sem extensão e com tamanho limitado. */
function safeBaseName(inputName: string): string {
  const name = inputName.normalize('NFC').split(/[\\/]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  const withoutExtension = dot >= 0 ? name.slice(0, dot) : name
  const cleaned = trimEnd(replaceForbidden(withoutExtension).trim())
  const base = trimEnd(Array.from(cleaned).slice(0, MAX_BASE_LENGTH).join(''))
  if (base === '') return FALLBACK_BASE
  return RESERVED_WINDOWS_NAMES.test(base) ? `${base}_` : base
}

/** Nome do arquivo convertido: "foto.png" → "foto.jpg". Sempre exibido como texto, nunca como HTML. */
export function outputFileName(inputName: string, format: ImageFormat): string {
  return `${safeBaseName(inputName)}.${IMAGE_FORMATS[format].extension}`
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

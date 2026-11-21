/** Nome-base seguro para arquivos de saída, comum às ferramentas de imagem e de vídeo. */

const MAX_BASE_LENGTH = 120
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

/**
 * Nome-base seguro: sem caminho, sem caracteres proibidos, sem extensão e com tamanho limitado.
 * `fallback` entra quando não sobra nome (ex.: ".png" vira "imagem").
 */
export function safeBaseName(inputName: string, fallback: string): string {
  const name = inputName.normalize('NFC').split(/[\\/]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  const withoutExtension = dot >= 0 ? name.slice(0, dot) : name
  const cleaned = trimEnd(replaceForbidden(withoutExtension).trim())
  const base = trimEnd(Array.from(cleaned).slice(0, MAX_BASE_LENGTH).join(''))
  if (base === '') return fallback
  return RESERVED_WINDOWS_NAMES.test(base) ? `${base}_` : base
}

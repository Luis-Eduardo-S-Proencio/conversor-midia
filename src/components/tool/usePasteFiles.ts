import { useEffect } from 'react'

/** Digitando num campo, colar é texto: não abre arquivo. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

/** Fotos e vídeos colados (ex.: um print copiado), com nome quando a área de transferência não dá um. */
export function filesFromClipboard(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
}

/**
 * Colar (Ctrl+V ou ⌘V) abre a imagem copiada, como soltar um arquivo. O arquivo vem da área de
 * transferência do próprio aparelho e não sai dele.
 */
export function usePasteFiles(onFiles: (files: File[]) => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    function handlePaste(event: ClipboardEvent) {
      if (isTextEntry(event.target)) return
      const files = filesFromClipboard(event.clipboardData)
      if (files.length === 0) return
      event.preventDefault()
      onFiles(files)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [onFiles, enabled])
}

/** Mac usa ⌘V; os demais, Ctrl+V. Só para o texto da dica. */
export function pasteShortcut(platform = navigator.platform, userAgent = navigator.userAgent): string {
  return /Mac|iPhone|iPad/.test(platform) || /Macintosh/.test(userAgent) ? '⌘V' : 'Ctrl+V'
}

/**
 * Botão "Colar": lê a imagem da área de transferência pelo navegador (ele pode pedir permissão).
 * Devolve os arquivos, ou `null` quando o navegador não deixa ler (aí vale o Ctrl+V).
 */
export async function readClipboardFiles(): Promise<File[] | null> {
  if (!navigator.clipboard?.read) return null
  try {
    const items = await navigator.clipboard.read()
    const files: File[] = []
    for (const item of items) {
      const type = item.types.find((candidate) => candidate.startsWith('image/'))
      if (!type) continue
      const blob = await item.getType(type)
      const extension = type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      files.push(new File([blob], `imagem-colada.${extension}`, { type }))
    }
    return files
  } catch {
    // Permissão negada ou nada colável: quem chamou orienta a usar o atalho do teclado.
    return null
  }
}

import { useEffect } from 'react'

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/**
 * Aceita arquivos soltos em qualquer ponto da página da ferramenta.
 * Sem isto, soltar fora da área de upload faz o navegador abrir a imagem e sair da página.
 * Quando a área de upload já tratou o evento (`defaultPrevented`), nada é feito aqui.
 */
export function usePageFileDrop(onFiles: (files: File[]) => void, enabled: boolean) {
  useEffect(() => {
    function handleDragOver(event: DragEvent) {
      if (carriesFiles(event)) event.preventDefault()
    }

    function handleDrop(event: DragEvent) {
      if (!carriesFiles(event) || event.defaultPrevented) return
      event.preventDefault()
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (enabled && files.length > 0) onFiles(files)
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onFiles, enabled])
}

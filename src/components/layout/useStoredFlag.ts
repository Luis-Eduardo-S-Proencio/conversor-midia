import { useCallback, useState } from 'react'

function read(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === '1'
  } catch {
    // Armazenamento bloqueado (navegação privada, política do navegador): vale o padrão.
    return fallback
  }
}

/**
 * Preferência de interface guardada no aparelho (ex.: barra lateral recolhida). Só preferências:
 * arquivos e miniaturas nunca são guardados. Sem armazenamento disponível, vale o padrão.
 */
export function useStoredFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => read(key, fallback))

  const update = useCallback(
    (next: boolean) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // Sem armazenamento: a preferência vale só até recarregar a página.
      }
    },
    [key],
  )

  return [value, update]
}

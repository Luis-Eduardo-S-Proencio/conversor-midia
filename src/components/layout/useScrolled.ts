import { useEffect, useState } from 'react'

/** A página já rolou um pouco? Os cabeçalhos ganham fundo com desfoque e borda só depois disso. */
export function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])

  return scrolled
}

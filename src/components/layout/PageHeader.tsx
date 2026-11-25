import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Trilha curta acima do título, como "Imagens / Converter". */
  breadcrumb?: ReactNode
}

export function PageHeader({ title, description, breadcrumb }: PageHeaderProps) {
  return (
    <div className="grid gap-2">
      {breadcrumb && <div className="text-sm text-fg-subtle">{breadcrumb}</div>}
      <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
      {description && <p className="max-w-2xl text-base text-fg-muted">{description}</p>}
    </div>
  )
}

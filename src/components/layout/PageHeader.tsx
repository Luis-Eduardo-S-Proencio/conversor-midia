import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
      {description && <p className="max-w-2xl text-base text-fg-muted">{description}</p>}
    </div>
  )
}

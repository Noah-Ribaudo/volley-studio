import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MinimalCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function MinimalCard({ title, description, children, className }: MinimalCardProps) {
  return (
    <section className={cn('rounded-md border border-border bg-card p-3', className)}>
      <header className="mb-3 min-h-10">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}

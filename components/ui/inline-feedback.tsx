'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type InlineFeedbackTone = 'success' | 'error' | 'info'

export interface InlineFeedbackAction {
  label: string
  onClick: () => void
}

interface InlineFeedbackProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: InlineFeedbackTone
  message: string
  action?: InlineFeedbackAction
  compact?: boolean
}

const toneClassMap: Record<InlineFeedbackTone, string> = {
  success:
    'border-emerald-500/35 bg-emerald-500/12 text-emerald-900 dark:text-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-400/15',
  error:
    'border-destructive/35 bg-destructive/12 text-destructive dark:border-destructive/45 dark:bg-destructive/18',
  info:
    'border-border/70 bg-muted/75 text-muted-foreground',
}

export function InlineFeedback({
  tone = 'info',
  message,
  action,
  compact = false,
  className,
  ...props
}: InlineFeedbackProps) {
  const isError = tone === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'inline-flex max-w-sm items-center gap-2 rounded-md border shadow-sm',
        compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        toneClassMap[tone],
        className
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 leading-snug">{message}</span>
      {action ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

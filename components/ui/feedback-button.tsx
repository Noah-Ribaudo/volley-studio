'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'

type FeedbackButtonState = 'idle' | 'submitting' | 'success'

interface FeedbackButtonProps extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  state: FeedbackButtonState
  idleLabel: string
  submittingLabel: string
  successLabel: string
}

export function FeedbackButton({
  state,
  idleLabel,
  submittingLabel,
  successLabel,
  ...props
}: FeedbackButtonProps) {
  const currentLabel =
    state === 'submitting' ? submittingLabel : state === 'success' ? successLabel : idleLabel

  const widthAnchorLabel = React.useMemo(() => {
    return [idleLabel, submittingLabel, successLabel].sort((a, b) => b.length - a.length)[0] ?? idleLabel
  }, [idleLabel, submittingLabel, successLabel])

  return (
    <Button {...props}>
      <span className="relative inline-grid place-items-center">
        <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {widthAnchorLabel}
        </span>
        <span className="col-start-1 row-start-1 whitespace-nowrap">{currentLabel}</span>
      </span>
    </Button>
  )
}

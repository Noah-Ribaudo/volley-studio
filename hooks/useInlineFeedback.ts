'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { InlineFeedbackAction, InlineFeedbackTone } from '@/components/ui/inline-feedback'

export interface InlineFeedbackState {
  tone: InlineFeedbackTone
  message: string
  action?: InlineFeedbackAction
}

interface InlineFeedbackOptions {
  action?: InlineFeedbackAction
  durationMs?: number
}

const DEFAULT_SUCCESS_DURATION_MS = 2200

export function useInlineFeedback() {
  const [feedback, setFeedback] = useState<InlineFeedbackState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (!timeoutRef.current) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  const clearFeedback = useCallback(() => {
    clearTimer()
    setFeedback(null)
  }, [clearTimer])

  const showFeedback = useCallback(
    (tone: InlineFeedbackTone, message: string, options?: InlineFeedbackOptions) => {
      clearTimer()

      setFeedback({
        tone,
        message,
        action: options?.action,
      })

      const durationMs = options?.durationMs
      if (!durationMs || durationMs <= 0) return

      timeoutRef.current = setTimeout(() => {
        setFeedback((current) => {
          if (!current) return null
          if (current.tone !== tone || current.message !== message) return current
          return null
        })
        timeoutRef.current = null
      }, durationMs)
    },
    [clearTimer]
  )

  const showSuccess = useCallback(
    (message: string, durationMs: number = DEFAULT_SUCCESS_DURATION_MS) => {
      showFeedback('success', message, { durationMs })
    },
    [showFeedback]
  )

  const showError = useCallback(
    (message: string, action?: InlineFeedbackAction) => {
      showFeedback('error', message, { action })
    },
    [showFeedback]
  )

  const showInfo = useCallback(
    (message: string, durationMs?: number) => {
      showFeedback('info', message, { durationMs })
    },
    [showFeedback]
  )

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return {
    feedback,
    clearFeedback,
    showFeedback,
    showSuccess,
    showError,
    showInfo,
  }
}

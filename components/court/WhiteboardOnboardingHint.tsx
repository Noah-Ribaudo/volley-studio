'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface WhiteboardOnboardingHintProps {
  show: boolean
  message: string
  className?: string
  autoHideMs?: number
  reappearDelayMs?: number
}

export function WhiteboardOnboardingHint({
  show,
  message,
  className,
  autoHideMs = 5000,
  reappearDelayMs = 1500,
}: WhiteboardOnboardingHintProps) {
  const [visible, setVisible] = useState(false)
  const hideTimerRef = useRef<number | null>(null)
  const showTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }

    if (!show) {
      setVisible(false)
      return
    }

    if (!visible) {
      showTimerRef.current = window.setTimeout(() => {
        setVisible(true)
      }, 0)
      return
    }

    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
    }, autoHideMs)

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [show, visible, autoHideMs])

  useEffect(() => {
    if (!show || visible) return

    showTimerRef.current = window.setTimeout(() => {
      setVisible(true)
    }, reappearDelayMs)

    return () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
    }
  }, [show, visible, reappearDelayMs])

  if (!show || !visible) return null

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-24 flex items-center justify-center pointer-events-none z-30',
        'animate-in fade-in duration-300',
        className
      )}
    >
      <div className="px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg">
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}

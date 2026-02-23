'use client'

import { createContext, useContext, useMemo } from 'react'
import { useWhiteboardDialStore, DIAL_DEFAULTS, type WhiteboardDialValues } from '@/store/useWhiteboardDialStore'
import { SPRING } from '@/lib/motion-utils'
import type { SpringOptions } from 'motion'

export type WhiteboardDialContext = WhiteboardDialValues & {
  /** Resolved spring config based on preset + overrides */
  resolvedSpring: SpringOptions
}

const Ctx = createContext<WhiteboardDialContext | null>(null)

export function WhiteboardDialProvider({ children }: { children: React.ReactNode }) {
  const store = useWhiteboardDialStore()

  const value = useMemo<WhiteboardDialContext>(() => {
    const vals: WhiteboardDialValues = { ...DIAL_DEFAULTS }
    for (const key of Object.keys(DIAL_DEFAULTS) as (keyof WhiteboardDialValues)[]) {
      ;(vals as Record<string, unknown>)[key] = store[key]
    }

    const presetSpring = SPRING[vals.springPreset]
    const resolvedSpring: SpringOptions = {
      stiffness: vals.springStiffness !== presetSpring.stiffness ? vals.springStiffness : presetSpring.stiffness,
      damping: vals.springDamping !== presetSpring.damping ? vals.springDamping : presetSpring.damping,
    }

    return { ...vals, resolvedSpring }
  }, [store])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Read whiteboard dial values from context.
 * Falls back to defaults if used outside the provider — safe for use
 * when the DialKit panel is toggled off.
 */
export function useWhiteboardDials(): WhiteboardDialContext {
  const ctx = useContext(Ctx)
  if (ctx) return ctx
  return {
    ...DIAL_DEFAULTS,
    resolvedSpring: SPRING[DIAL_DEFAULTS.springPreset],
  }
}

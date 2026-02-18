'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SpotlightOverlayProps {
  show: boolean
  message: string
  step?: number
  totalSteps?: number
  targetSelector: string
  /** Extra padding around the spotlight circle (px) */
  spotlightPadding?: number
}

export function SpotlightOverlay({
  show,
  message,
  step,
  totalSteps,
  targetSelector,
  spotlightPadding = 12,
}: SpotlightOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })
  const rafRef = useRef<number>(0)

  // Measure the target element
  const measure = useCallback(() => {
    const el = document.querySelector(targetSelector)
    if (!el) {
      setTargetRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)
    setViewportSize({ w: window.innerWidth, h: window.innerHeight })
  }, [targetSelector])

  // Mount portal target
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Continuous RAF loop — re-measures every frame so the spotlight
  // tracks moving targets (e.g. a token being dragged).
  useEffect(() => {
    if (!show) return

    let running = true
    const loop = () => {
      if (!running) return
      measure()
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [show, measure])

  if (!show || !mounted || !targetRect || viewportSize.w === 0) return null

  // Compute spotlight circle geometry
  const diameter = Math.max(targetRect.width, targetRect.height) + spotlightPadding * 2
  const r = diameter / 2
  const cx = targetRect.left + targetRect.width / 2
  const cy = targetRect.top + targetRect.height / 2

  // Decide if tooltip goes above or below the spotlight
  const spaceBelow = viewportSize.h - (cy + r)
  const spaceAbove = cy - r
  const tooltipGap = 16
  const placeBelow = spaceBelow > spaceAbove

  const isGuided = step != null && totalSteps != null

  // SVG path: full viewport rectangle with a circular hole (evenodd fill-rule)
  const vw = viewportSize.w
  const vh = viewportSize.h
  const spotlightPath = [
    // Outer rectangle (viewport)
    `M0,0 H${vw} V${vh} H0 Z`,
    // Inner circle (cutout) — drawn as two arcs
    `M${cx - r},${cy}`,
    `a${r},${r} 0 1,0 ${r * 2},0`,
    `a${r},${r} 0 1,0 ${-r * 2},0`,
  ].join(' ')

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ animation: 'spotlightFadeIn 300ms ease-out both' }}
    >
      {/* SVG overlay with evenodd path to create spotlight cutout */}
      <svg
        width={vw}
        height={vh}
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d={spotlightPath}
          fill="rgba(0,0,0,0.6)"
          fillRule="evenodd"
        />
      </svg>

      {/* Tooltip — outer div handles positioning, inner div animates */}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: placeBelow ? cy + r + tooltipGap : cy - r - tooltipGap,
          transform: placeBelow ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
        }}
      >
        <div style={{ animation: 'spotlightTooltipIn 250ms ease-out 100ms both' }}>
          <div className="flex items-stretch rounded-lg bg-gray-900 dark:bg-gray-800 shadow-xl overflow-hidden">
            {/* Orange accent bar */}
            <div className="w-1 shrink-0 bg-orange-500" />

            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="text-sm font-medium text-gray-50 leading-snug whitespace-nowrap">
                {message}
              </span>

              {isGuided && (
                <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums">
                  {step}/{totalSteps}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spotlightFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spotlightTooltipIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )

  return createPortal(overlay, document.body)
}

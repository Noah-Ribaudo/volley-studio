'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SCROLL_KEY = 'scroll-positions'

export default function ScrollRestoration() {
  const pathname = usePathname()

  useEffect(() => {
    // Restore scroll position on mount
    const savedPositions = sessionStorage.getItem(SCROLL_KEY)
    if (savedPositions) {
      let positions: Record<string, number> = {}
      try {
        positions = JSON.parse(savedPositions)
      } catch {
        // Corrupted session storage, start fresh
      }
      const savedY = positions[pathname]
      if (savedY !== undefined) {
        // Small delay to ensure content is rendered
        requestAnimationFrame(() => {
          window.scrollTo(0, savedY)
        })
      }
    }

    // Save scroll position before navigating away
    const handleBeforeUnload = () => {
      saveScrollPosition()
    }

    const saveScrollPosition = () => {
      const savedPositions = sessionStorage.getItem(SCROLL_KEY)
      let positions: Record<string, number> = {}
      try {
        positions = savedPositions ? JSON.parse(savedPositions) : {}
      } catch {
        // Corrupted session storage, start fresh
      }
      positions[pathname] = window.scrollY
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions))
    }

    // Save on scroll (debounced)
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(saveScrollPosition, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      // Save position when navigating to a new page
      saveScrollPosition()
      clearTimeout(scrollTimeout)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname])

  return null
}

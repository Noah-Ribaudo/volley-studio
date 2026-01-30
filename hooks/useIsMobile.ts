import { useEffect, useState, useSyncExternalStore, useCallback } from 'react'

const MOBILE_BREAKPOINT_PX = 768

// Server snapshot always returns false for SSR consistency
const getServerSnapshot = () => false

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT_PX): boolean {
  // Use useSyncExternalStore for proper SSR handling and avoiding setState in effects
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return () => {}
    }
    
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    
    // Support older browsers
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', callback)
      return () => mediaQuery.removeEventListener('change', callback)
    }

    mediaQuery.addListener(callback)
    return () => mediaQuery.removeListener(callback)
  }, [breakpoint])
  
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return false
    }
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches
  }, [breakpoint])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}












export type TextureMode = "low" | "hi"

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
  downlink?: number
}

const TEXTURE_PREF_KEY = "texture-mode"
const SLOW_TYPES = new Set(["slow-2g", "2g", "3g"])

export const hiTextureSources = [
  // Keep empty until high-fidelity textures are shipped in /public/textures.
]

const getConnection = () => {
  if (typeof navigator === "undefined") return undefined
  return (navigator as unknown as { connection?: NetworkInformation }).connection
}

export const readStoredTextureMode = (): TextureMode | null => {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(TEXTURE_PREF_KEY)
  return stored === "hi" || stored === "low" ? stored : null
}

const storeTextureMode = (mode: TextureMode) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TEXTURE_PREF_KEY, mode)
}

const requestIdle =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? window.requestIdleCallback
    : (cb: () => void) => window.setTimeout(cb, 500)

export const shouldStayLowFi = () => {
  const connection = getConnection()
  if (!connection) return false
  return Boolean(
    connection.saveData ||
      (connection as unknown as { effectiveType?: string }).effectiveType &&
        SLOW_TYPES.has(
          (connection as unknown as { effectiveType?: string }).effectiveType!
        )
  )
}

export const preloadTextures = (sources: string[]) => {
  const tasks = sources.map(
    (src) =>
      new Promise<boolean>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = src
      })
  )
  return Promise.all(tasks).then((results) => results.every(Boolean))
}

export const ensureTextureMode = () => {
  if (typeof document === "undefined") return
  const html = document.documentElement
  const stored = readStoredTextureMode()
  const startsLow = stored !== "hi"
  const stickToLow = shouldStayLowFi()

  if (!startsLow) {
    html.setAttribute("data-texture", "hi")
    return
  }

  html.setAttribute("data-texture", "low")
  if (stickToLow) {
    storeTextureMode("low")
    return
  }
  if (hiTextureSources.length === 0) {
    storeTextureMode("low")
    return
  }

  requestIdle(() => {
    preloadTextures(hiTextureSources).then((ready) => {
      if (!ready) return
      html.setAttribute("data-texture", "hi")
      storeTextureMode("hi")
    })
  })
}











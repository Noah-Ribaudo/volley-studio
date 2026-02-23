/**
 * Session breadcrumbs — tracks pages visited in this browser tab.
 *
 * Every function is wrapped in try/catch and returns a safe default on failure.
 * sessionStorage clears when the tab closes, which is exactly the lifecycle we want.
 */

const STORAGE_KEY = 'volley-breadcrumbs'
const MAX_BREADCRUMBS = 10

export interface Breadcrumb {
  path: string
  label: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Route label mapping
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Whiteboard',
  '/teams': 'Teams',
  '/gametime': 'Game Time',
  '/settings': 'Settings',
  '/learn': 'Learn',
  '/privacy': 'Privacy',
}

/**
 * Returns a human-friendly label for a pathname.
 * Falls back to "Page" for anything unrecognised.
 */
export function getRouteLabel(pathname: string): string {
  try {
    if (!pathname) return 'Page'

    // Exact match first
    if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]

    // Pattern matches
    if (pathname.startsWith('/teams/')) return 'Team Details'
    if (pathname.startsWith('/gametime/')) return 'Game Time'
    if (pathname.startsWith('/settings/')) return 'Settings'
    if (pathname.startsWith('/learn/')) return 'Learn'
    if (pathname.startsWith('/developer/')) return 'Developer'

    return 'Page'
  } catch {
    return 'Page'
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Records a breadcrumb. Deduplicates by path (updates existing entry).
 * Caps at MAX_BREADCRUMBS. Silently no-ops on any failure.
 */
export function recordBreadcrumb(path: string, label: string): void {
  try {
    if (typeof window === 'undefined') return

    const crumbs = readBreadcrumbs()

    // Remove existing entry for this path (dedup)
    const filtered = crumbs.filter((c) => c.path !== path)

    // Push new entry
    filtered.push({ path, label, timestamp: Date.now() })

    // Cap length
    const trimmed = filtered.slice(-MAX_BREADCRUMBS)

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // sessionStorage unavailable or quota exceeded — silently no-op
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Reads and validates breadcrumbs from sessionStorage.
 * Returns [] on any failure.
 */
export function readBreadcrumbs(): Breadcrumb[] {
  try {
    if (typeof window === 'undefined') return []

    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Validate each entry
    return parsed.filter(
      (entry: unknown): entry is Breadcrumb =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Breadcrumb).path === 'string' &&
        typeof (entry as Breadcrumb).label === 'string' &&
        typeof (entry as Breadcrumb).timestamp === 'number'
    )
  } catch {
    return []
  }
}

/**
 * Returns the most recent breadcrumb that isn't `excludePath`.
 * Returns null if nothing qualifies.
 */
export function getLastVisited(excludePath?: string): Breadcrumb | null {
  try {
    const crumbs = readBreadcrumbs()
    if (crumbs.length === 0) return null

    // Walk backwards for the most recent non-excluded entry
    for (let i = crumbs.length - 1; i >= 0; i--) {
      if (crumbs[i].path !== excludePath) return crumbs[i]
    }
    return null
  } catch {
    return null
  }
}

/**
 * Returns the last `limit` pages excluding `excludePath`, most recent first.
 * Returns [] on failure.
 */
export function getRecentPages(excludePath?: string, limit = 3): Breadcrumb[] {
  try {
    const crumbs = readBreadcrumbs()
    const filtered = crumbs
      .filter((c) => c.path !== excludePath)
      .reverse() // most recent first
      .slice(0, limit)
    return filtered
  } catch {
    return []
  }
}

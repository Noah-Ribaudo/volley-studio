/**
 * Admin Authentication Utilities
 *
 * Simple password-based admin authentication stored in localStorage.
 * The admin secret is validated client-side against an environment variable.
 */

const ADMIN_STORAGE_KEY = 'volleyball-admin-authenticated'

/**
 * Check if the provided password matches the admin secret
 */
export function validateAdminPassword(password: string): boolean {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET
  if (!adminSecret) {
    console.warn('NEXT_PUBLIC_ADMIN_SECRET not configured')
    return false
  }
  return password === adminSecret
}

/**
 * Check if admin mode is currently authenticated (stored in localStorage)
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true'
}

/**
 * Authenticate admin mode (stores in localStorage)
 * Returns true if password is valid
 */
export function authenticateAdmin(password: string): boolean {
  if (validateAdminPassword(password)) {
    localStorage.setItem(ADMIN_STORAGE_KEY, 'true')
    return true
  }
  return false
}

/**
 * Clear admin authentication
 */
export function clearAdminAuth(): void {
  localStorage.removeItem(ADMIN_STORAGE_KEY)
}

/**
 * Check if admin mode is available (secret is configured)
 */
export function isAdminModeAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ADMIN_SECRET)
}

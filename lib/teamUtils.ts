/**
 * Team utility functions - pure functions with no database dependencies
 */

/**
 * Generate a URL-safe slug from a team name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace hyphens with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

/**
 * Get the shareable URL for a team
 */
export function getTeamShareUrl(teamSlug: string): string {
  if (typeof window === 'undefined') {
    return `/teams/${teamSlug}`
  }
  return `${window.location.origin}/teams/${teamSlug}`
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

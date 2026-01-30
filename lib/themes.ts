export type ThemeId = 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  swatch: string[]
}

export const DEFAULT_THEME: ThemeId = 'dark'
export const THEME_STORAGE_KEY = 'volleyball-theme'

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Light theme with off-white background',
    swatch: ['oklch(97% 0 0)', 'oklch(15% 0 0)'],
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Dark theme with near-black background',
    swatch: ['oklch(15% 0 0)', 'oklch(97% 0 0)'],
  },
]

const isThemeId = (value: string | null): value is ThemeId =>
  Boolean(value && THEME_OPTIONS.some((option) => option.id === value))

export const applyTheme = (theme: ThemeId) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export const readStoredTheme = (): ThemeId | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeId(stored) ? stored : null
}

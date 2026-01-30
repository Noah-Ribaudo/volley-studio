export type ThemeId = 'white' | 'dark' | 'pink' | 'blue' | 'green'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  swatch: string[]
}

export const DEFAULT_THEME: ThemeId = 'blue'
export const THEME_STORAGE_KEY = 'volleyball-theme'

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'white',
    label: 'White',
    description: 'Clean white theme',
    swatch: ['#fafafa', '#ffffff', '#2563eb'],
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Dark gray and black',
    swatch: ['#0a0a0a', '#171717', '#3b82f6'],
  },
  {
    id: 'pink',
    label: 'Pink',
    description: 'Light pink theme',
    swatch: ['#fdf2f8', '#ffffff', '#db2777'],
  },
  {
    id: 'blue',
    label: 'Blue',
    description: 'Dark blue theme',
    swatch: ['#0f172a', '#1e293b', '#3b82f6'],
  },
  {
    id: 'green',
    label: 'Green',
    description: 'Dark green theme',
    swatch: ['#064e3b', '#065f46', '#10b981'],
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




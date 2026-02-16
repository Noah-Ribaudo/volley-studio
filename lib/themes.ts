export type ThemeId = 'light' | 'dark'
export type ThemePreference = ThemeId | 'auto'

export interface ThemeOption {
  id: ThemePreference
  label: string
  description: string
  swatch: string[]
}

export const DEFAULT_THEME: ThemeId = 'dark'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'auto'
export const DEFAULT_AUTO_TIMEZONE = 'America/Chicago'
export const THEME_STORAGE_KEY = 'volleyball-theme'

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Follows your device setting',
    swatch: ['oklch(97% 0 0)', 'oklch(15% 0 0)'],
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Light theme with a bone-white background',
    swatch: ['oklch(95% 0.015 95)', 'oklch(15% 0 0)'],
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Dark theme with near-black background',
    swatch: ['oklch(15% 0 0)', 'oklch(97% 0 0)'],
  },
]

export const isThemeId = (value: string | null): value is ThemeId =>
  value === 'light' || value === 'dark'

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'auto' || isThemeId(value)

export const applyTheme = (theme: ThemeId) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export const readStoredTheme = (): ThemeId | null => {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeId(stored) ? stored : null
}

export const resolveThemeFromDaylight = (isDaylight: boolean): ThemeId =>
  isDaylight ? 'light' : 'dark'

export const resolveThemeByHour = (hour: number): ThemeId =>
  hour >= 6 && hour < 18 ? 'light' : 'dark'

export const getHourInTimeZone = (timeZone: string, date: Date = new Date()): number => {
  const hour = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone,
  }).format(date)
  const parsedHour = Number(hour)
  return Number.isFinite(parsedHour) ? parsedHour : 12
}

export const resolveThemeByTimeZone = (timeZone: string, date: Date = new Date()): ThemeId => {
  try {
    return resolveThemeByHour(getHourInTimeZone(timeZone, date))
  } catch {
    return resolveThemeByHour(getHourInTimeZone(DEFAULT_AUTO_TIMEZONE, date))
  }
}

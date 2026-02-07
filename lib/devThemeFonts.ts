export type FontCategory = 'sans' | 'mono' | 'pixel'

export interface FontOption {
  id: string
  label: string
  cssValue: string
  category: FontCategory
}

export const FONT_OPTIONS: FontOption[] = [
  // Sans
  {
    id: 'barlow',
    label: 'Barlow',
    cssValue: 'var(--font-barlow), -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    category: 'sans',
  },
  {
    id: 'geist-sans',
    label: 'Geist Sans',
    cssValue: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    category: 'sans',
  },
  // Mono
  {
    id: 'geist-mono',
    label: 'Geist Mono',
    cssValue: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Monaco, monospace',
    category: 'mono',
  },
  // Pixel
  {
    id: 'geist-pixel-square',
    label: 'Pixel Square',
    cssValue: 'var(--font-geist-pixel-square), var(--font-geist-mono), monospace',
    category: 'pixel',
  },
  {
    id: 'geist-pixel-grid',
    label: 'Pixel Grid',
    cssValue: 'var(--font-geist-pixel-grid), var(--font-geist-mono), monospace',
    category: 'pixel',
  },
  {
    id: 'geist-pixel-circle',
    label: 'Pixel Circle',
    cssValue: 'var(--font-geist-pixel-circle), var(--font-geist-mono), monospace',
    category: 'pixel',
  },
  {
    id: 'geist-pixel-triangle',
    label: 'Pixel Triangle',
    cssValue: 'var(--font-geist-pixel-triangle), var(--font-geist-mono), monospace',
    category: 'pixel',
  },
  {
    id: 'geist-pixel-line',
    label: 'Pixel Line',
    cssValue: 'var(--font-geist-pixel-line), var(--font-geist-mono), monospace',
    category: 'pixel',
  },
]

export const DISPLAY_FONT_OPTIONS: FontOption[] = [
  {
    id: 'barlow-condensed',
    label: 'Barlow Condensed',
    cssValue: 'var(--font-barlow-condensed), var(--font-barlow), sans-serif',
    category: 'sans',
  },
  ...FONT_OPTIONS,
]

export function getFontOption(id: string, options: FontOption[]): FontOption | undefined {
  return options.find((f) => f.id === id)
}

export type FontCategory = 'sans' | 'mono' | 'pixel'

export interface FontOption {
  id: string
  label: string
  cssValue: string
  category: FontCategory
}

const SANS_FALLBACK = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO_FALLBACK = 'ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Monaco, monospace'

function createSansOption(id: string, label: string, families: string[]): FontOption {
  return {
    id,
    label,
    cssValue: `${families.join(', ')}, ${SANS_FALLBACK}`,
    category: 'sans',
  }
}

const NEUVE_GROTESK_OPTIONS: FontOption[] = [
  createSansOption('neuve-grotesk-thin', 'Neuve Grotesk Thin', ['"Neuve Grotesk Thin"', '"Neuve Grotesqu Thin"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-thin-italic', 'Neuve Grotesk Thin Italic', ['"Neuve Grotesk Thin Italic"', '"Neuve Grotesqu Thin Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-light', 'Neuve Grotesk Light', ['"Neuve Grotesk Light"', '"Neuve Grotesqu Light"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-light-italic', 'Neuve Grotesk Light Italic', ['"Neuve Grotesk Light Italic"', '"Neuve Grotesqu Light Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-regular', 'Neuve Grotesk Regular', ['"Neuve Grotesk Regular"', '"Neuve Grotesqu Regular"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-italic', 'Neuve Grotesk Italic', ['"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-medium', 'Neuve Grotesk Medium', ['"Neuve Grotesk Medium"', '"Neuve Grotesqu Medium"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-medium-italic', 'Neuve Grotesk Medium Italic', ['"Neuve Grotesk Medium Italic"', '"Neuve Grotesqu Medium Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-semibold', 'Neuve Grotesk Semibold', ['"Neuve Grotesk Semibold"', '"Neuve Grotesqu Semibold"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-semibold-italic', 'Neuve Grotesk Semibold Italic', ['"Neuve Grotesk Semibold Italic"', '"Neuve Grotesqu Semibold Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-bold', 'Neuve Grotesk Bold', ['"Neuve Grotesk Bold"', '"Neuve Grotesqu Bold"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-bold-italic', 'Neuve Grotesk Bold Italic', ['"Neuve Grotesk Bold Italic"', '"Neuve Grotesqu Bold Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-black', 'Neuve Grotesk Black', ['"Neuve Grotesk Black"', '"Neuve Grotesqu Black"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
  createSansOption('neuve-grotesk-black-italic', 'Neuve Grotesk Black Italic', ['"Neuve Grotesk Black Italic"', '"Neuve Grotesqu Black Italic"', '"Neuve Grotesk Italic"', '"Neuve Grotesqu Italic"', '"Neuve Grotesk"', '"Neuve Grotesqu"']),
]

const MAISON_NEUE_OPTIONS: FontOption[] = [
  createSansOption('maison-neue-thin', 'Maison Neue Thin', ['"Maison Neue Thin"', '"Maison Neue"']),
  createSansOption('maison-neue-thin-italic', 'Maison Neue Thin Italic', ['"Maison Neue Thin Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-light', 'Maison Neue Light', ['"Maison Neue Light"', '"Maison Neue"']),
  createSansOption('maison-neue-light-italic', 'Maison Neue Light Italic', ['"Maison Neue Light Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-book', 'Maison Neue Book', ['"Maison Neue Book"', '"Maison Neue"']),
  createSansOption('maison-neue-book-italic', 'Maison Neue Book Italic', ['"Maison Neue Book Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-regular', 'Maison Neue Regular', ['"Maison Neue Regular"', '"Maison Neue"']),
  createSansOption('maison-neue-italic', 'Maison Neue Italic', ['"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-medium', 'Maison Neue Medium', ['"Maison Neue Medium"', '"Maison Neue"']),
  createSansOption('maison-neue-medium-italic', 'Maison Neue Medium Italic', ['"Maison Neue Medium Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-demi', 'Maison Neue Demi', ['"Maison Neue Demi"', '"Maison Neue Demibold"', '"Maison Neue"']),
  createSansOption('maison-neue-demi-italic', 'Maison Neue Demi Italic', ['"Maison Neue Demi Italic"', '"Maison Neue Demibold Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-bold', 'Maison Neue Bold', ['"Maison Neue Bold"', '"Maison Neue"']),
  createSansOption('maison-neue-bold-italic', 'Maison Neue Bold Italic', ['"Maison Neue Bold Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
  createSansOption('maison-neue-black', 'Maison Neue Black', ['"Maison Neue Black"', '"Maison Neue"']),
  createSansOption('maison-neue-black-italic', 'Maison Neue Black Italic', ['"Maison Neue Black Italic"', '"Maison Neue Italic"', '"Maison Neue"']),
]

const RESIDENZ_GROTESK_OPTIONS: FontOption[] = [
  createSansOption('residenz-grotesk-light', 'Residenz Grotesk Light', ['"Residenz Grotesk Light"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-light-italic', 'Residenz Grotesk Light Italic', ['"Residenz Grotesk Light Italic"', '"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-regular', 'Residenz Grotesk Regular', ['"Residenz Grotesk Regular"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-italic', 'Residenz Grotesk Italic', ['"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-medium', 'Residenz Grotesk Medium', ['"Residenz Grotesk Medium"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-medium-italic', 'Residenz Grotesk Medium Italic', ['"Residenz Grotesk Medium Italic"', '"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-semibold', 'Residenz Grotesk Semibold', ['"Residenz Grotesk Semibold"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-semibold-italic', 'Residenz Grotesk Semibold Italic', ['"Residenz Grotesk Semibold Italic"', '"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-bold', 'Residenz Grotesk Bold', ['"Residenz Grotesk Bold"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-bold-italic', 'Residenz Grotesk Bold Italic', ['"Residenz Grotesk Bold Italic"', '"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-black', 'Residenz Grotesk Black', ['"Residenz Grotesk Black"', '"Residenz Grotesk"']),
  createSansOption('residenz-grotesk-black-italic', 'Residenz Grotesk Black Italic', ['"Residenz Grotesk Black Italic"', '"Residenz Grotesk Italic"', '"Residenz Grotesk"']),
]

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
  ...NEUVE_GROTESK_OPTIONS,
  ...MAISON_NEUE_OPTIONS,
  ...RESIDENZ_GROTESK_OPTIONS,
  // Mono
  {
    id: 'geist-mono',
    label: 'Geist Mono',
    cssValue: `var(--font-geist-mono), ${MONO_FALLBACK}`,
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

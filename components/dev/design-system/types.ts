export interface UsageNote {
  id: string
  text: string
  href: string
  openLabel: string
}

export interface PrincipleCard {
  id: string
  title: string
  rule: string
  why: string
  doExample: string
  dontExample: string
  numericGuideline: string
  usage: UsageNote[]
}

export type GlossaryCategory = 'Foundation' | 'Shared UI' | 'Volleyball'

export interface GlossaryItem {
  id: string
  name: string
  category: GlossaryCategory
  purpose: string
  defaults: string[]
  usage: UsageNote[]
}

export type TweakControlType = 'range' | 'color' | 'select'

export interface TweakControlOption {
  label: string
  value: string
}

export interface TweakControl {
  id: string
  label: string
  type: TweakControlType
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: TweakControlOption[]
  helpText: string
}

export interface SectionCheck {
  id: string
  label: string
  helpText: string
}

export interface SectionCopyPayload {
  sectionId: string
  sectionTitle: string
  values: Record<string, string | number>
  prompt: string
}

export interface PlaygroundSection {
  id: string
  title: string
  description: string
  stockComparable: boolean
  baselineNote?: string
  controls: TweakControl[]
  checks: SectionCheck[]
  copyHeading: string
}

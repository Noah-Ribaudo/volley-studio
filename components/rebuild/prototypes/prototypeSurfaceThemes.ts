import type { PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'

export interface PrototypeCourtPalette {
  stageBackground: string
  stageGlow?: string
  paddingBackground: string
  courtFill: string
  courtVignetteEdge: string
  courtBorder: string
  courtInnerBorder: string
  divider: string
  attackLine: string
  centerLine: string
  lineLabel: string
  netCore: string
  netDash: string
  neutralZoneFill: string
  neutralZoneStroke: string
}

export interface PrototypeSurfaceTheme {
  mode: 'light' | 'dark'
  canvasBackground: string
  desktopShellBackground: string
  desktopShellBorder: string
  desktopShellShadow: string
  phoneScreenBackground: string
  sidebarCardBackground: string
  sidebarCardBorder: string
  sidebarCardShadow: string
  court: PrototypeCourtPalette
}

const DARK_RUBBER_COURT: PrototypeCourtPalette = {
  stageBackground:
    'radial-gradient(circle at 50% 16%, oklch(0.29 0.015 260) 0%, oklch(0.22 0.012 260) 42%, oklch(0.15 0.01 260) 100%)',
  stageGlow:
    'inset 0 1px 0 oklch(0.48 0.01 260 / 0.1), inset 0 -24px 40px oklch(0.08 0.01 260 / 0.34)',
  paddingBackground: 'oklch(0.22 0.012 260 / 0.68)',
  courtFill: 'oklch(0.27 0.01 260)',
  courtVignetteEdge: 'oklch(0.18 0.008 260)',
  courtBorder: 'oklch(0.34 0.012 255)',
  courtInnerBorder: 'oklch(0.88 0.01 95 / 0.9)',
  divider: 'oklch(0.58 0.01 250 / 0.34)',
  attackLine: 'oklch(0.72 0.012 95 / 0.55)',
  centerLine: 'oklch(0.58 0.012 250 / 0.26)',
  lineLabel: 'oklch(0.78 0.012 95 / 0.52)',
  netCore: 'oklch(0.2 0.008 260)',
  netDash: 'oklch(0.86 0.008 95 / 0.78)',
  neutralZoneFill: 'oklch(0.42 0.01 250 / 0.4)',
  neutralZoneStroke: 'oklch(0.84 0.008 95 / 0.22)',
}

const LIGHT_RUBBER_COURT: PrototypeCourtPalette = {
  stageBackground:
    'radial-gradient(circle at 50% 12%, oklch(0.97 0.01 95) 0%, oklch(0.92 0.012 95) 44%, oklch(0.86 0.012 95) 100%)',
  stageGlow:
    'inset 0 1px 0 oklch(1 0 0 / 0.88), inset 0 -24px 40px oklch(0.72 0.012 95 / 0.14)',
  paddingBackground: 'oklch(0.84 0.012 95 / 0.52)',
  courtFill: 'oklch(0.93 0.008 95)',
  courtVignetteEdge: 'oklch(0.84 0.01 95)',
  courtBorder: 'oklch(0.36 0.012 250)',
  courtInnerBorder: 'oklch(0.24 0.008 260 / 0.92)',
  divider: 'oklch(0.48 0.008 250 / 0.28)',
  attackLine: 'oklch(0.42 0.01 250 / 0.52)',
  centerLine: 'oklch(0.58 0.01 250 / 0.22)',
  lineLabel: 'oklch(0.38 0.008 250 / 0.48)',
  netCore: 'oklch(0.18 0.008 260)',
  netDash: 'oklch(0.34 0.008 250 / 0.82)',
  neutralZoneFill: 'oklch(0.72 0.01 250 / 0.34)',
  neutralZoneStroke: 'oklch(1 0 0 / 0.42)',
}

export const PROTOTYPE_SURFACE_THEMES: Record<PrototypeVariantId, PrototypeSurfaceTheme> = {
  rubber: {
    mode: 'dark',
    canvasBackground: 'radial-gradient(circle at 50% 0%, oklch(0.24 0.012 260) 0%, oklch(0.16 0.01 260) 38%, oklch(0.1 0.008 260) 100%)',
    desktopShellBackground: 'linear-gradient(180deg, oklch(0.16 0.008 260) 0%, oklch(0.07 0.008 260) 100%)',
    desktopShellBorder: 'oklch(1 0 0 / 0.1)',
    desktopShellShadow: '0 32px 60px oklch(0 0 0 / 0.42), inset 0 1px 0 oklch(1 0 0 / 0.04)',
    phoneScreenBackground: DARK_RUBBER_COURT.stageBackground,
    sidebarCardBackground: 'oklch(0.18 0.008 260 / 0.9)',
    sidebarCardBorder: 'oklch(0.3 0.01 250 / 0.38)',
    sidebarCardShadow: '0 18px 40px oklch(0 0 0 / 0.24)',
    court: DARK_RUBBER_COURT,
  },
  soft: {
    mode: 'light',
    canvasBackground: 'radial-gradient(circle at 50% 0%, oklch(0.98 0.012 95) 0%, oklch(0.93 0.012 95) 42%, oklch(0.88 0.012 95) 100%)',
    desktopShellBackground: 'linear-gradient(180deg, oklch(0.18 0.008 260) 0%, oklch(0.08 0.008 260) 100%)',
    desktopShellBorder: 'oklch(1 0 0 / 0.12)',
    desktopShellShadow: '0 32px 60px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.06)',
    phoneScreenBackground: LIGHT_RUBBER_COURT.stageBackground,
    sidebarCardBackground: 'oklch(0.97 0.01 95 / 0.94)',
    sidebarCardBorder: 'oklch(0.84 0.012 95 / 0.56)',
    sidebarCardShadow: '0 18px 40px oklch(0 0 0 / 0.1)',
    court: LIGHT_RUBBER_COURT,
  },
}

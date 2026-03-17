'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState, type ComponentType } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { CorePhase, PrototypePhase, PrototypeVariantId } from '@/lib/rebuild/prototypeFlow'
import type { PrototypeControlProps } from './types'
import {
  PHASE_PAD_LAYOUT,
  PhasePadHardwareLane,
  PhasePadJoystick,
  PhasePadRotationRail,
  useQuarterTrackTravelState,
} from './PhasePadShared'

const C8_PHASE_ORDER: CorePhase[] = ['DEFENSE', 'OFFENSE', 'RECEIVE', 'SERVE']
const PHASE_PAD_JOYSTICK_FRAME_SIZE = 92

type SurfaceShaderId = 'fluted-glass' | 'neuro-noise' | 'dithering' | 'voronoi' | 'waves' | 'warp' | 'none'

type PhasePadVisualTheme = {
  panelBackground: string
  panelBorder: string
  panelShadow: string
  frameBackground: string
  frameBorder: string
  dividerColor: string
  dividerInset?: string
  cutoutBackground: string
  cutoutShadow: string
  tileInactiveBackground: string
  tileActiveBackground: string
  tileInactiveBorder: string
  tileActiveBorder: string
  tileInactiveText: string
  tileActiveText: string
  tileInactiveShadow: string
  tileActiveShadow: string
  labelShadow: string
  backlightInactive: string
  backlightActive: string
  topGloss: string
  panelRadius: string
  frameRadius: string
  tileRadius: string
  tileClipPath?: string
  tileInsetStroke?: string
  shader: SurfaceShaderId
  rotationRailBg: string
  rotationRailBorder: string
  rotationRailShadow: string
  rotationRailItemBg: string
  rotationRailItemActiveBg: string
  rotationRailItemText: string
  rotationRailItemActiveText: string
  panelTexture?: string
  panelReflection?: string
  tileSpecularHighlight?: string
  tileEdgeLight?: string
  activeGlow?: string
}

function lazyShader(name: string): ComponentType<any> {
  return dynamic(
    () =>
      import('@paper-design/shaders-react').then((m) => ({
        default: (m as unknown as Record<string, ComponentType<any>>)[name],
      })),
    { ssr: false }
  )
}

const LazyFlutedGlass = lazyShader('FlutedGlass')
const LazyNeuroNoise = lazyShader('NeuroNoise')
const LazyDithering = lazyShader('Dithering')
const LazyVoronoi = lazyShader('Voronoi')
const LazyWaves = lazyShader('Waves')
const LazyWarp = lazyShader('Warp')

/* ═══════════════════════════════════════════════════════════════════
   THEME DEFINITIONS — each theme is a completely different material
   ═══════════════════════════════════════════════════════════════════ */

const PHASE_PAD_VARIANT_THEMES: Record<PrototypeVariantId, PhasePadVisualTheme> = {
  /* ── CLEAN: Anodized aluminum console ─────────────────────────── */
  clean: {
    panelBackground: 'linear-gradient(180deg, #c4cad2 0%, #9da5af 100%)',
    panelBorder: 'rgba(128,136,150,0.52)',
    panelShadow: '0 18px 36px rgba(50,58,72,0.24), inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -1px 0 rgba(0,0,0,0.1)',
    frameBackground: 'linear-gradient(180deg, rgba(170,178,188,0.3) 0%, rgba(140,148,160,0.16) 100%)',
    frameBorder: 'rgba(150,158,170,0.38)',
    dividerColor: 'rgba(110,118,132,0.42)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(148,156,168,0.9) 0%, rgba(172,180,192,0.96) 52%, rgba(204,210,218,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.54), inset 0 -10px 14px rgba(70,78,92,0.16), 0 1px 0 rgba(255,255,255,0.32)',
    tileInactiveBackground: 'linear-gradient(180deg, #d8dde4 0%, #b4bcc6 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #bec5ce 0%, #96a0ab 100%)',
    tileInactiveBorder: 'rgba(140,148,162,0.4)',
    tileActiveBorder: 'rgba(108,118,134,0.64)',
    tileInactiveText: 'rgba(24,28,36,0.92)',
    tileActiveText: 'rgba(10,14,22,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -2px 0 rgba(70,78,92,0.14), 0 6px 14px rgba(40,48,64,0.2), 0 14px 22px -16px rgba(20,26,38,0.36)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 8px 14px rgba(70,78,92,0.14), inset 0 -4px 6px rgba(40,48,62,0.16), 0 3px 6px rgba(30,38,52,0.18)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.52)',
    backlightInactive: 'radial-gradient(circle at 50% 90%, rgba(160,188,255,0.06) 0%, transparent 58%)',
    backlightActive: 'radial-gradient(circle at 50% 90%, rgba(160,188,255,0.2) 0%, rgba(130,166,255,0.08) 38%, transparent 72%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.1) 40%, transparent 100%)',
    panelRadius: '18px',
    frameRadius: '14px',
    tileRadius: '12px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.16)',
    shader: 'none',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 30%, rgba(255,255,255,0.16) 46%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.16) 54%, transparent 70%)',
    tileEdgeLight: 'inset 1px -1px 3px rgba(255,255,255,0.2), inset -1px 1px 3px rgba(0,0,0,0.06)',
    panelTexture: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px)',
    panelReflection: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 20%, rgba(255,255,255,0.06) 44%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 56%, transparent 80%)',
    rotationRailBg: 'linear-gradient(180deg, rgba(180,188,198,0.98) 0%, rgba(156,164,176,0.98) 100%)',
    rotationRailBorder: 'rgba(128,136,150,0.34)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,255,255,0.52)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #cdd3da 0%, #b0b8c2 100%)',
    rotationRailItemText: 'rgba(44,52,66,0.68)',
    rotationRailItemActiveText: 'rgba(16,22,32,0.94)',
  },

  /* ── MACHINED: CNC milled steel ───────────────────────────────── */
  machined: {
    panelBackground: 'linear-gradient(180deg, #3c4248 0%, #1a1e22 100%)',
    panelBorder: 'rgba(100,110,120,0.38)',
    panelShadow: '0 24px 44px rgba(0,0,0,0.42), inset 0 1px 0 rgba(200,210,220,0.22), inset 0 -20px 30px rgba(0,0,0,0.3)',
    frameBackground: 'linear-gradient(180deg, rgba(100,110,120,0.24) 0%, rgba(16,20,24,0.42) 100%)',
    frameBorder: 'rgba(130,140,150,0.26)',
    dividerColor: 'rgba(72,80,88,0.76)',
    dividerInset: '0 0 0 1px rgba(200,210,220,0.06)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(58,66,74,0.96) 0%, rgba(80,88,96,0.98) 52%, rgba(116,124,132,0.96) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(200,210,220,0.16), inset 0 -16px 22px rgba(0,0,0,0.36), 0 1px 0 rgba(255,255,255,0.04)',
    tileInactiveBackground: 'linear-gradient(180deg, #b4bac0 0%, #6e767e 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #8e969e 0%, #4a5258 100%)',
    tileInactiveBorder: 'rgba(200,210,220,0.2)',
    tileActiveBorder: 'rgba(255,170,70,0.72)',
    tileInactiveText: 'rgba(240,244,248,0.94)',
    tileActiveText: 'rgba(255,244,230,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -5px 0 rgba(0,0,0,0.32), 0 14px 20px rgba(0,0,0,0.3), 0 20px 28px -22px rgba(0,0,0,0.64)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 14px 20px rgba(255,255,255,0.04), inset 0 -6px 10px rgba(0,0,0,0.38), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,176,80,0.2), 0 0 26px rgba(255,160,60,0.14)',
    labelShadow: '0 1px 0 rgba(0,0,0,0.34)',
    backlightInactive: 'radial-gradient(circle at 50% 100%, rgba(255,176,72,0.06) 0%, transparent 64%)',
    backlightActive: 'radial-gradient(circle at 50% 100%, rgba(255,160,50,0.28) 0%, rgba(255,136,30,0.14) 42%, transparent 76%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 30%, transparent 100%)',
    panelRadius: '14px',
    frameRadius: '10px',
    tileRadius: '6px',
    tileClipPath: 'polygon(9% 0%, 91% 0%, 100% 14%, 100% 86%, 91% 100%, 9% 100%, 0% 86%, 0% 14%)',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
    shader: 'dithering',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 36%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 52%, transparent 64%)',
    tileEdgeLight: 'inset 1px -1px 4px rgba(255,255,255,0.14), inset -1px 1px 4px rgba(0,0,0,0.18)',
    activeGlow: '0 0 32px rgba(255,160,50,0.22), 0 0 8px rgba(255,180,80,0.18)',
    panelTexture: 'repeating-linear-gradient(45deg, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
    rotationRailBg: 'linear-gradient(180deg, rgba(56,62,68,0.98) 0%, rgba(36,40,46,0.98) 100%)',
    rotationRailBorder: 'rgba(100,110,120,0.3)',
    rotationRailShadow: 'inset 0 1px 0 rgba(200,210,220,0.12)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #5a6268 0%, #3e444a 100%)',
    rotationRailItemText: 'rgba(200,210,220,0.56)',
    rotationRailItemActiveText: 'rgba(240,244,248,0.94)',
  },

  /* ── BACKLIT: Nixie tube display ──────────────────────────────── */
  backlit: {
    panelBackground: 'linear-gradient(180deg, #1e1208 0%, #0a0604 100%)',
    panelBorder: 'rgba(255,160,60,0.18)',
    panelShadow: '0 26px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,120,0.12), inset 0 -24px 32px rgba(0,0,0,0.32), 0 0 60px rgba(255,140,30,0.08)',
    frameBackground: 'linear-gradient(180deg, rgba(100,55,12,0.16) 0%, rgba(14,8,4,0.48) 100%)',
    frameBorder: 'rgba(255,160,60,0.12)',
    dividerColor: 'rgba(70,38,12,0.78)',
    dividerInset: '0 0 0 1px rgba(255,170,70,0.06)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(80,44,12,0.96) 0%, rgba(120,68,20,0.98) 50%, rgba(160,100,36,0.86) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,190,110,0.14), inset 0 -18px 24px rgba(0,0,0,0.28), 0 0 36px rgba(255,140,30,0.22)',
    tileInactiveBackground: 'linear-gradient(180deg, rgba(255,190,110,0.12) 0%, rgba(255,140,40,0.04) 100%)',
    tileActiveBackground: 'linear-gradient(180deg, rgba(255,215,160,0.3) 0%, rgba(255,160,50,0.18) 100%)',
    tileInactiveBorder: 'rgba(255,175,80,0.16)',
    tileActiveBorder: 'rgba(255,200,120,0.52)',
    tileInactiveText: 'rgba(255,210,160,0.88)',
    tileActiveText: 'rgba(255,240,215,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,220,180,0.14), inset 0 -1px 0 rgba(0,0,0,0.24), 0 12px 24px rgba(0,0,0,0.22), 0 0 20px rgba(255,140,36,0.06)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,235,200,0.2), inset 0 0 0 1px rgba(255,200,130,0.14), 0 12px 28px rgba(0,0,0,0.22), 0 0 48px rgba(255,150,40,0.32), 0 0 16px rgba(255,200,120,0.28)',
    labelShadow: '0 0 20px rgba(255,175,80,0.4)',
    backlightInactive: 'radial-gradient(circle at 50% 50%, rgba(255,175,80,0.2) 0%, rgba(255,130,30,0.06) 44%, transparent 76%)',
    backlightActive: 'radial-gradient(circle at 50% 50%, rgba(255,200,120,0.64) 0%, rgba(255,155,45,0.32) 44%, transparent 78%)',
    topGloss: 'linear-gradient(180deg, rgba(255,230,190,0.1) 0%, rgba(255,230,190,0.01) 28%, transparent 100%)',
    panelRadius: '24px',
    frameRadius: '20px',
    tileRadius: '999px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,195,120,0.06)',
    shader: 'neuro-noise',
    activeGlow: '0 0 40px rgba(255,155,40,0.36), 0 0 12px rgba(255,200,120,0.24), 0 0 80px rgba(255,120,20,0.16)',
    panelReflection: 'radial-gradient(ellipse at 50% 30%, rgba(255,160,50,0.04) 0%, transparent 60%)',
    rotationRailBg: 'linear-gradient(180deg, rgba(40,24,10,0.98) 0%, rgba(24,14,6,0.98) 100%)',
    rotationRailBorder: 'rgba(255,160,60,0.14)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,190,100,0.08), 0 0 16px rgba(255,140,30,0.06)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, rgba(255,180,90,0.16) 0%, rgba(255,140,40,0.08) 100%)',
    rotationRailItemText: 'rgba(255,195,130,0.5)',
    rotationRailItemActiveText: 'rgba(255,225,180,0.94)',
  },

  /* ── GLASS: Frosted lab glass ─────────────────────────────────── */
  glass: {
    panelBackground: 'linear-gradient(180deg, rgba(220,230,240,0.92) 0%, rgba(165,180,195,0.92) 100%)',
    panelBorder: 'rgba(95,120,148,0.42)',
    panelShadow: '0 22px 38px rgba(40,58,82,0.22), inset 0 1px 0 rgba(255,255,255,0.74), inset 0 -20px 28px rgba(75,100,128,0.16)',
    frameBackground: 'linear-gradient(180deg, rgba(88,108,132,0.26) 0%, rgba(210,225,240,0.06) 100%)',
    frameBorder: 'rgba(112,136,164,0.3)',
    dividerColor: 'rgba(132,156,180,0.32)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(168,188,210,0.68) 0%, rgba(190,206,224,0.86) 52%, rgba(224,234,246,0.94) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -14px 20px rgba(68,95,125,0.16), 0 0 24px rgba(170,210,255,0.16)',
    tileInactiveBackground: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(228,240,252,0.18) 100%)',
    tileActiveBackground: 'linear-gradient(180deg, rgba(255,255,255,0.44) 0%, rgba(208,228,248,0.28) 100%)',
    tileInactiveBorder: 'rgba(132,162,196,0.42)',
    tileActiveBorder: 'rgba(160,204,240,0.72)',
    tileInactiveText: 'rgba(24,44,68,0.94)',
    tileActiveText: 'rgba(8,24,42,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.46), inset 0 -2px 0 rgba(72,100,132,0.14), 0 12px 20px rgba(62,86,114,0.16), 0 0 22px rgba(172,220,255,0.1)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), inset 0 12px 20px rgba(180,220,255,0.14), inset 0 -6px 10px rgba(50,76,104,0.18), 0 4px 12px rgba(34,58,84,0.16), 0 0 36px rgba(160,216,255,0.26)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.46)',
    backlightInactive: 'radial-gradient(circle at 50% 88%, rgba(144,216,255,0.1) 0%, transparent 72%)',
    backlightActive: 'radial-gradient(circle at 50% 88%, rgba(160,228,255,0.26) 0%, rgba(130,204,255,0.12) 42%, transparent 78%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 36%, transparent 100%)',
    panelRadius: '30px',
    frameRadius: '26px',
    tileRadius: '26px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    shader: 'fluted-glass',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 25%, rgba(255,255,255,0.1) 42%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.1) 58%, transparent 75%)',
    tileEdgeLight: 'inset 1px -1px 6px rgba(180,220,255,0.16), inset -1px 1px 6px rgba(80,110,145,0.12)',
    activeGlow: '0 0 28px rgba(160,216,255,0.24), 0 0 6px rgba(200,235,255,0.14)',
    panelReflection: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 15%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 58%, transparent 85%)',
    rotationRailBg: 'linear-gradient(180deg, rgba(200,215,230,0.92) 0%, rgba(175,192,210,0.92) 100%)',
    rotationRailBorder: 'rgba(112,136,164,0.28)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,255,255,0.54)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, rgba(255,255,255,0.36) 0%, rgba(224,238,250,0.22) 100%)',
    rotationRailItemText: 'rgba(50,72,98,0.6)',
    rotationRailItemActiveText: 'rgba(16,36,58,0.94)',
  },

  /* ── CERAMIC: Porcelain toggle array ──────────────────────────── */
  ceramic: {
    panelBackground: 'linear-gradient(180deg, #f6f4ee 0%, #d2c8b4 100%)',
    panelBorder: 'rgba(168,152,124,0.32)',
    panelShadow: '0 20px 38px rgba(100,84,58,0.16), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -18px 24px rgba(152,136,108,0.12)',
    frameBackground: 'linear-gradient(180deg, rgba(185,174,154,0.16) 0%, rgba(240,236,228,0.44) 100%)',
    frameBorder: 'rgba(176,160,130,0.2)',
    dividerColor: 'rgba(200,188,166,0.48)',
    dividerInset: '0 0 0 1px rgba(255,255,255,0.2)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(214,206,192,0.88) 0%, rgba(230,224,214,0.98) 52%, rgba(246,242,236,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -12px 16px rgba(148,132,106,0.1), 0 1px 0 rgba(255,255,255,0.56)',
    tileInactiveBackground: 'linear-gradient(180deg, #ffffff 0%, #f0eadf 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #f0eadf 0%, #ddd3c0 100%)',
    tileInactiveBorder: 'rgba(178,164,136,0.26)',
    tileActiveBorder: 'rgba(156,136,98,0.42)',
    tileInactiveText: 'rgba(72,60,42,0.92)',
    tileActiveText: 'rgba(50,40,26,0.96)',
    tileInactiveShadow: 'inset 0 2px 0 rgba(255,255,255,0.94), inset 0 -3px 0 rgba(162,144,112,0.16), 0 10px 18px rgba(132,112,76,0.14), 0 18px 28px -18px rgba(80,64,38,0.28)',
    tileActiveShadow: 'inset 0 2px 0 rgba(255,255,255,0.72), inset 0 10px 16px rgba(255,255,255,0.2), inset 0 -5px 8px rgba(156,136,100,0.16), 0 5px 10px rgba(116,96,62,0.16)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.82)',
    backlightInactive: 'radial-gradient(circle at 50% 90%, rgba(255,195,110,0.06) 0%, transparent 64%)',
    backlightActive: 'radial-gradient(circle at 50% 90%, rgba(255,195,110,0.2) 0%, rgba(255,170,88,0.08) 42%, transparent 74%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.28) 44%, transparent 100%)',
    panelRadius: '28px',
    frameRadius: '24px',
    tileRadius: '22px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.32)',
    shader: 'none',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 26%, rgba(255,255,255,0.22) 44%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0.22) 56%, transparent 74%)',
    tileEdgeLight: 'inset 1px -2px 5px rgba(255,255,255,0.36), inset -1px 2px 5px rgba(120,100,68,0.08)',
    panelReflection: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 18%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 58%, transparent 82%)',
    rotationRailBg: 'linear-gradient(180deg, rgba(238,234,226,0.98) 0%, rgba(220,212,198,0.98) 100%)',
    rotationRailBorder: 'rgba(176,160,130,0.26)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,255,255,0.86)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #faf8f4 0%, #ece6dc 100%)',
    rotationRailItemText: 'rgba(100,84,58,0.6)',
    rotationRailItemActiveText: 'rgba(50,40,26,0.94)',
  },

  /* ── RUBBER: Industrial silicone keypad ───────────────────────── */
  rubber: {
    panelBackground: 'linear-gradient(180deg, #2e2e32 0%, #141416 100%)',
    panelBorder: 'rgba(80,80,86,0.36)',
    panelShadow: '0 26px 46px rgba(0,0,0,0.44), inset 0 1px 0 rgba(140,140,148,0.08), inset 0 -20px 26px rgba(0,0,0,0.32)',
    frameBackground: 'linear-gradient(180deg, rgba(72,72,78,0.14) 0%, rgba(18,18,20,0.48) 100%)',
    frameBorder: 'rgba(96,96,104,0.14)',
    dividerColor: 'rgba(40,40,44,0.86)',
    dividerInset: '0 0 0 1px rgba(180,180,190,0.03)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(48,48,52,0.96) 0%, rgba(66,66,72,0.98) 48%, rgba(96,96,104,0.84) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(140,140,148,0.08), inset 0 -16px 20px rgba(0,0,0,0.38), 0 0 16px rgba(0,0,0,0.2)',
    tileInactiveBackground: 'linear-gradient(180deg, #48484e 0%, #2a2a2e 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #3a3a3e 0%, #1e1e22 100%)',
    tileInactiveBorder: 'rgba(100,100,108,0.14)',
    tileActiveBorder: 'rgba(200,155,90,0.22)',
    tileInactiveText: 'rgba(220,220,228,0.88)',
    tileActiveText: 'rgba(240,236,228,0.96)',
    tileInactiveShadow: 'inset 0 2px 0 rgba(120,120,128,0.1), inset 0 -8px 0 rgba(0,0,0,0.32), 0 14px 22px rgba(0,0,0,0.28)',
    tileActiveShadow: 'inset 0 2px 0 rgba(120,120,128,0.06), inset 0 14px 22px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(0,0,0,0.48), 0 2px 4px rgba(0,0,0,0.22)',
    labelShadow: '0 1px 0 rgba(0,0,0,0.32)',
    backlightInactive: 'radial-gradient(circle at 50% 85%, rgba(255,155,70,0.06) 0%, transparent 60%)',
    backlightActive: 'radial-gradient(circle at 50% 85%, rgba(255,155,70,0.14) 0%, rgba(255,120,40,0.05) 38%, transparent 72%)',
    topGloss: 'linear-gradient(180deg, rgba(200,200,210,0.06) 0%, rgba(200,200,210,0.01) 24%, transparent 100%)',
    panelRadius: '20px',
    frameRadius: '16px',
    tileRadius: '14px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(160,160,168,0.04)',
    shader: 'voronoi',
    rotationRailBg: 'linear-gradient(180deg, rgba(42,42,46,0.98) 0%, rgba(26,26,28,0.98) 100%)',
    rotationRailBorder: 'rgba(80,80,86,0.22)',
    rotationRailShadow: 'inset 0 1px 0 rgba(140,140,148,0.06)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #3e3e42 0%, #2a2a2e 100%)',
    rotationRailItemText: 'rgba(180,180,188,0.48)',
    rotationRailItemActiveText: 'rgba(228,228,234,0.92)',
  },

  /* ── INSTRUMENT: Scientific instrument panel ──────────────────── */
  instrument: {
    panelBackground: 'linear-gradient(180deg, #e0e8ee 0%, #bcc8d4 100%)',
    panelBorder: 'rgba(118,138,160,0.36)',
    panelShadow: '0 18px 34px rgba(60,82,110,0.18), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -18px 24px rgba(110,134,162,0.1)',
    frameBackground: 'linear-gradient(180deg, rgba(138,160,184,0.18) 0%, rgba(232,240,248,0.48) 100%)',
    frameBorder: 'rgba(142,164,188,0.22)',
    dividerColor: 'rgba(158,180,204,0.46)',
    dividerInset: '0 0 0 1px rgba(255,255,255,0.14)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(184,198,214,0.88) 0%, rgba(206,218,230,0.96) 52%, rgba(240,246,250,0.98) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -12px 16px rgba(132,154,178,0.12), 0 1px 0 rgba(255,255,255,0.44)',
    tileInactiveBackground: 'linear-gradient(180deg, #f4f7fa 0%, #d4dde6 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #dce6ee 0%, #b4c2ce 100%)',
    tileInactiveBorder: 'rgba(144,166,190,0.3)',
    tileActiveBorder: 'rgba(92,138,186,0.44)',
    tileInactiveText: 'rgba(44,62,82,0.92)',
    tileActiveText: 'rgba(26,44,64,0.96)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(146,168,190,0.12), 0 8px 14px rgba(98,122,150,0.14)',
    tileActiveShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 0 1px rgba(142,192,232,0.16), 0 7px 12px rgba(90,118,148,0.18), 0 0 22px rgba(154,210,255,0.12)',
    labelShadow: '0 1px 0 rgba(255,255,255,0.7)',
    backlightInactive: 'radial-gradient(circle at 50% 88%, rgba(154,214,255,0.08) 0%, transparent 66%)',
    backlightActive: 'radial-gradient(circle at 50% 88%, rgba(154,214,255,0.22) 0%, rgba(100,182,255,0.08) 40%, transparent 74%)',
    topGloss: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.16) 34%, transparent 100%)',
    panelRadius: '16px',
    frameRadius: '12px',
    tileRadius: '8px',
    tileInsetStroke: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
    shader: 'waves',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 34%, rgba(255,255,255,0.12) 47%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 53%, transparent 66%)',
    tileEdgeLight: 'inset 1px -1px 2px rgba(255,255,255,0.18), inset -1px 1px 2px rgba(80,100,125,0.06)',
    panelTexture: 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(120,140,165,0.03) 1px, rgba(120,140,165,0.03) 2px)',
    rotationRailBg: 'linear-gradient(180deg, rgba(216,226,236,0.98) 0%, rgba(192,204,216,0.98) 100%)',
    rotationRailBorder: 'rgba(142,164,188,0.26)',
    rotationRailShadow: 'inset 0 1px 0 rgba(255,255,255,0.74)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, #eaf0f6 0%, #ced8e2 100%)',
    rotationRailItemText: 'rgba(68,88,112,0.6)',
    rotationRailItemActiveText: 'rgba(26,44,64,0.94)',
  },

  /* ── MIDNIGHT: Deep space console ─────────────────────────────── */
  midnight: {
    panelBackground: 'linear-gradient(180deg, #181c30 0%, #06080e 100%)',
    panelBorder: 'rgba(80,100,180,0.18)',
    panelShadow: '0 28px 52px rgba(0,0,0,0.52), inset 0 1px 0 rgba(120,150,255,0.06), inset 0 -22px 30px rgba(0,0,0,0.36), 0 0 56px rgba(80,120,255,0.06)',
    frameBackground: 'linear-gradient(180deg, rgba(46,54,100,0.12) 0%, rgba(6,8,16,0.54) 100%)',
    frameBorder: 'rgba(86,106,186,0.12)',
    dividerColor: 'rgba(14,18,32,0.94)',
    dividerInset: '0 0 0 1px rgba(120,148,255,0.04)',
    cutoutBackground: 'radial-gradient(circle at 50% 50%, rgba(20,26,50,0.96) 0%, rgba(36,44,80,0.98) 48%, rgba(62,76,140,0.76) 100%)',
    cutoutShadow: 'inset 0 1px 0 rgba(146,172,255,0.1), inset 0 -18px 22px rgba(0,0,0,0.42), 0 0 28px rgba(68,114,255,0.14)',
    tileInactiveBackground: 'linear-gradient(180deg, #3a4270 0%, #141828 100%)',
    tileActiveBackground: 'linear-gradient(180deg, #4e5c9e 0%, #181e38 100%)',
    tileInactiveBorder: 'rgba(110,136,240,0.1)',
    tileActiveBorder: 'rgba(120,188,255,0.38)',
    tileInactiveText: 'rgba(220,228,255,0.88)',
    tileActiveText: 'rgba(240,246,255,0.98)',
    tileInactiveShadow: 'inset 0 1px 0 rgba(134,156,255,0.06), inset 0 -5px 0 rgba(0,0,0,0.34), 0 16px 24px rgba(0,0,0,0.3)',
    tileActiveShadow: 'inset 0 1px 0 rgba(160,184,255,0.1), inset 0 0 0 1px rgba(120,204,255,0.16), 0 16px 28px rgba(0,0,0,0.3), 0 0 36px rgba(80,164,255,0.18), 0 0 10px rgba(130,200,255,0.12)',
    labelShadow: '0 0 22px rgba(125,185,255,0.28)',
    backlightInactive: 'radial-gradient(circle at 50% 88%, rgba(110,168,255,0.1) 0%, transparent 68%)',
    backlightActive: 'radial-gradient(circle at 50% 88%, rgba(110,168,255,0.26) 0%, rgba(70,230,255,0.1) 42%, transparent 74%)',
    topGloss: 'linear-gradient(180deg, rgba(148,172,255,0.1) 0%, rgba(148,172,255,0.01) 28%, transparent 100%)',
    panelRadius: '20px',
    frameRadius: '18px',
    tileRadius: '12px',
    tileClipPath: 'polygon(6% 0%, 94% 0%, 100% 16%, 100% 84%, 94% 100%, 6% 100%, 0% 84%, 0% 16%)',
    tileInsetStroke: 'inset 0 0 0 1px rgba(106,158,255,0.05)',
    shader: 'warp',
    tileSpecularHighlight: 'linear-gradient(var(--lab-light-angle, 35deg), transparent 32%, rgba(140,170,255,0.06) 46%, rgba(140,170,255,0.12) 50%, rgba(140,170,255,0.06) 54%, transparent 68%)',
    tileEdgeLight: 'inset 1px -1px 4px rgba(100,160,255,0.1), inset -1px 1px 4px rgba(0,0,0,0.12)',
    activeGlow: '0 0 36px rgba(80,164,255,0.2), 0 0 8px rgba(120,200,255,0.14), 0 0 72px rgba(60,120,255,0.1)',
    panelReflection: 'radial-gradient(ellipse at 50% 25%, rgba(100,140,255,0.03) 0%, transparent 55%)',
    rotationRailBg: 'linear-gradient(180deg, rgba(24,28,48,0.98) 0%, rgba(12,14,26,0.98) 100%)',
    rotationRailBorder: 'rgba(80,100,180,0.14)',
    rotationRailShadow: 'inset 0 1px 0 rgba(120,148,255,0.06), 0 0 14px rgba(70,110,255,0.04)',
    rotationRailItemBg: 'transparent',
    rotationRailItemActiveBg: 'linear-gradient(180deg, rgba(60,72,130,0.6) 0%, rgba(28,34,62,0.6) 100%)',
    rotationRailItemText: 'rgba(170,186,240,0.44)',
    rotationRailItemActiveText: 'rgba(220,230,255,0.94)',
  },
}

/* ═══════════════════════════════════════════════════════════════════
   RENDERING HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function getInnerCornerPosition(row: 'top' | 'bottom', column: 'left' | 'right', cutoutDiameter: number) {
  return {
    top: row === 'top' ? 'auto' : `${cutoutDiameter / -2}px`,
    bottom: row === 'top' ? `${cutoutDiameter / -2}px` : 'auto',
    left: column === 'left' ? 'auto' : `${cutoutDiameter / -2}px`,
    right: column === 'left' ? `${cutoutDiameter / -2}px` : 'auto',
  }
}

function PhaseTileShader({
  shader,
  isActive,
  row,
  column,
}: {
  shader: SurfaceShaderId
  isActive: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
}) {
  // Per-tile offset so the 2×2 grid doesn't look like four clones
  const ri = row === 'bottom' ? 1 : 0
  const ci = column === 'right' ? 1 : 0
  const ox = ci * 0.31 + ri * 0.13
  const oy = ri * 0.47 + ci * 0.17

  if (shader === 'dithering') {
    // Machined steel — each button milled at a slightly different angle
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-60 mix-blend-multiply">
        <LazyDithering
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorBack={isActive ? '#7a828a' : '#c0c6cc'}
          colorFront={isActive ? '#4a5258' : '#8a929a'}
          shape="warp"
          type="4x4"
          size={1.5}
          scale={2.4}
          speed={0.08}
          offsetX={ox}
          offsetY={oy}
          rotation={ci * 4 + ri * -3}
        />
      </div>
    )
  }

  if (shader === 'neuro-noise') {
    // Nixie tube glow — each tile is a window into the same glowing field
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-80 mix-blend-screen">
        <LazyNeuroNoise
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorFront={isActive ? '#ffcc88' : '#ff9e44'}
          colorMid={isActive ? '#cc6600' : '#884400'}
          colorBack="#1a0e04"
          brightness={isActive ? 0.7 : 0.35}
          contrast={0.6}
          scale={1.6}
          speed={0.18}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'fluted-glass') {
    // Lab glass — refraction shifted per pane
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-90 mix-blend-screen">
        <LazyFlutedGlass
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorHighlight={isActive ? '#dff8ff' : '#f0faff'}
          colorShadow={isActive ? '#4a6e8a' : '#7a9eb8'}
          speed={0.14}
          distortion={0.22}
          scale={1.3}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'voronoi') {
    // Silicone — each button is its own piece with different cell pattern
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-30 mix-blend-overlay">
        <LazyVoronoi
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colors={isActive ? ['#2e2e32', '#3a3a3e', '#444448'] : ['#48484e', '#54545a', '#606066']}
          colorGap={isActive ? '#1a1a1e' : '#2a2a2e'}
          scale={3.2 + (ci + ri * 2) * 0.12}
          gap={0.02}
          glow={0.15}
          speed={0.04}
          distortion={0.08}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'waves') {
    // Scan-lines — offset vertically so lines don't align across tiles
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-40 mix-blend-multiply">
        <LazyWaves
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colorFront={isActive ? '#8a9eb8' : '#a4b8d0'}
          colorBack={isActive ? '#dce6ee' : '#f0f6fa'}
          shape={0}
          frequency={1.8}
          amplitude={0.06}
          spacing={0.15}
          proportion={0.4}
          softness={0.35}
          scale={4.0}
          rotation={0}
          offsetX={ox * 0.5}
          offsetY={oy}
        />
      </div>
    )
  }

  if (shader === 'warp') {
    // Nebula — each tile reveals a different part of the same cosmic field
    return (
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[inherit] opacity-65 mix-blend-screen">
        <LazyWarp
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          colors={
            isActive
              ? ['#1a2050', '#2a3878', '#4060b0', '#2244aa', '#183060']
              : ['#101830', '#1a2448', '#2a3870', '#1a2e60', '#121e40']
          }
          shape="stripes"
          shapeScale={0.3}
          distortion={0.4}
          swirl={0.2}
          swirlIterations={6}
          softness={0.7}
          proportion={0.5}
          speed={0.06}
          scale={1.2}
          offsetX={ox}
          offsetY={oy}
        />
      </div>
    )
  }

  return null
}

function PhaseAreaTile({
  phase,
  label,
  isActive,
  row,
  column,
  cutoutDiameter,
  variantId,
  switchMotion,
  onManualPhaseSelect,
}: {
  phase: CorePhase
  label: string
  isActive: boolean
  row: 'top' | 'bottom'
  column: 'left' | 'right'
  cutoutDiameter: number
  variantId: PrototypeVariantId
  switchMotion: PrototypeControlProps['switchMotion']
  onManualPhaseSelect: (phase: PrototypePhase) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const [isPressed, setIsPressed] = useState(false)
  const theme = PHASE_PAD_VARIANT_THEMES[variantId]
  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: switchMotion.spring.stiffness,
        damping: switchMotion.spring.damping,
        mass: switchMotion.spring.mass,
      }

  const activeShadow = isActive && theme.activeGlow
    ? `${theme.tileActiveShadow}, ${theme.activeGlow}`
    : theme.tileActiveShadow

  return (
    <button
      type="button"
      onClick={() => onManualPhaseSelect(phase)}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      aria-pressed={isActive}
      className="relative rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <motion.div
        animate={{
          scale: isPressed && !isActive ? 0.988 : isActive ? 0.982 : 1,
          y: isPressed || isActive ? switchMotion.pressTravel : 0,
        }}
        transition={transition}
        className="relative flex min-h-[5.2rem] items-center justify-center border px-3 py-3 text-center transition-colors"
        style={{
          ['--lab-switch-knob-glow' as string]: switchMotion.knobGlow,
          background: isActive ? theme.tileActiveBackground : theme.tileInactiveBackground,
          borderColor: isActive ? theme.tileActiveBorder : theme.tileInactiveBorder,
          boxShadow: isActive ? activeShadow : theme.tileInactiveShadow,
          color: isActive ? theme.tileActiveText : theme.tileInactiveText,
          backdropFilter: variantId === 'glass' ? 'blur(10px) saturate(1.08)' : variantId === 'backlit' ? 'blur(8px)' : undefined,
          borderRadius: theme.tileRadius,
          clipPath: theme.tileClipPath,
        }}
      >
        {/* Backlight layer */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: isActive ? theme.backlightActive : theme.backlightInactive,
            opacity: isActive ? 1 : 0.9,
            boxShadow: theme.tileInsetStroke,
          }}
        />
        {/* Top gloss layer */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[10px] top-0 h-[38%] rounded-t-[inherit]"
          style={{ background: theme.topGloss }}
        />
        {/* Shader layer */}
        <PhaseTileShader shader={theme.shader} isActive={isActive} row={row} column={column} />
        {/* Specular highlight — one continuous sweep across the 2×2 grid */}
        {theme.tileSpecularHighlight && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background: theme.tileSpecularHighlight,
              backgroundSize: '200% 200%',
              backgroundPosition: `${column === 'left' ? '0%' : '100%'} ${row === 'top' ? '0%' : '100%'}`,
            }}
          />
        )}
        {/* Edge light — rim lighting */}
        {theme.tileEdgeLight && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: theme.tileEdgeLight }}
          />
        )}
        {/* Cutout corner mask */}
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: `${cutoutDiameter}px`,
            height: `${cutoutDiameter}px`,
            ...getInnerCornerPosition(row, column, cutoutDiameter),
            background: theme.cutoutBackground,
            boxShadow: theme.cutoutShadow,
          }}
        />
        {/* Label */}
        <span
          className="relative z-[1] text-[1.02rem] font-semibold tracking-[-0.02em]"
          style={{
            textShadow: theme.labelShadow,
            opacity: isActive ? 1 : 0.96,
          }}
        >
          {label}
        </span>
      </motion.div>
    </button>
  )
}

export function Concept8FullLedPerimeter(props: PrototypeControlProps) {
  const hardwareTuning = props.tactileTuning.phasePadHardware
  const theme = PHASE_PAD_VARIANT_THEMES[props.variantId]
  const lanePadding = Math.max(8, hardwareTuning.channelWidth + 4.5)
  const horizontalLong = hardwareTuning.trackWidth >= hardwareTuning.trackHeight
  const horizontalPieces = horizontalLong ? hardwareTuning.piecesPerLongSide : hardwareTuning.piecesPerShortSide
  const verticalPieces = horizontalLong ? hardwareTuning.piecesPerShortSide : hardwareTuning.piecesPerLongSide
  const piecesPerEdge = useMemo(
    () => [
      verticalPieces,
      horizontalPieces,
      verticalPieces,
      horizontalPieces,
    ],
    [horizontalPieces, verticalPieces]
  )
  const perimeterState = useQuarterTrackTravelState({
    currentCorePhase: props.displayCurrentCorePhase,
    targetCorePhase: props.displayTargetCorePhase,
    isPhaseTraveling: props.isPhaseTraveling,
    piecesPerEdge,
    phaseOrder: C8_PHASE_ORDER,
    travelDurationMs: props.tactileTuning.c4Literal.connectorMotion.playDurationMs,
  })
  const activeDisplayPhase = props.isPhaseTraveling ? props.displayTargetCorePhase : props.displayCurrentCorePhase
  const offenseLabel = props.currentCorePhase === 'FIRST_ATTACK' ? '1st Attack' : 'Attack'
  const baseRadius = (PHASE_PAD_JOYSTICK_FRAME_SIZE / 2) * props.tactileTuning.joystick.baseScale
  const cutoutRadius = Math.max(0, baseRadius + props.tactileTuning.joystick.shellCutoutPadding)
  const cutoutDiameter = cutoutRadius * 2

  return (
    <div className="flex w-full flex-col justify-end">
      <div
        className="relative overflow-hidden border p-2"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
          borderRadius: theme.panelRadius,
        }}
      >
        {/* Panel texture overlay */}
        {theme.panelTexture && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] rounded-[inherit]"
            style={{ background: theme.panelTexture }}
          />
        )}
        {/* Panel reflection/sheen overlay */}
        {theme.panelReflection && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[0] rounded-[inherit]"
            style={{ background: theme.panelReflection }}
          />
        )}

        <div className="relative z-[1]">
          <PhasePadRotationRail
            {...props}
            railStyle={{
              background: theme.rotationRailBg,
              borderColor: theme.rotationRailBorder,
              boxShadow: theme.rotationRailShadow,
            }}
            railItemColors={{
              bg: theme.rotationRailItemBg,
              activeBg: theme.rotationRailItemActiveBg,
              text: theme.rotationRailItemText,
              activeText: theme.rotationRailItemActiveText,
            }}
          />

          <div className="relative overflow-visible rounded-[18px] p-[10px]">
            <div
              className="relative z-[1]"
              style={{ padding: `${lanePadding}px` }}
            >
              <PhasePadHardwareLane
                tuning={hardwareTuning}
                segmentStart={perimeterState.segmentStart}
                segmentLength={perimeterState.segmentLength}
                totalLights={perimeterState.totalLights}
              />

              <div
                className="relative z-[1] grid grid-cols-2 gap-px overflow-visible"
                style={{ background: theme.dividerColor, borderRadius: theme.frameRadius, boxShadow: theme.dividerInset }}
              >
                {PHASE_PAD_LAYOUT.map((item) => (
                  <PhaseAreaTile
                    key={item.phase}
                    phase={item.phase}
                    label={item.phase === 'OFFENSE' ? offenseLabel : item.label}
                    isActive={item.phase === activeDisplayPhase}
                    row={item.row}
                    column={item.column}
                    cutoutDiameter={cutoutDiameter}
                    variantId={props.variantId}
                    switchMotion={props.switchMotion}
                    onManualPhaseSelect={props.onManualPhaseSelect}
                  />
                ))}
              </div>
            </div>

            <PhasePadJoystick props={props} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Phase Icons and Utilities
// Shared resources for all phase-related components

import type { RallyPhase } from '@/lib/types'
import { RALLY_PHASES, RALLY_PHASE_INFO, PHASE_INFO, Phase } from '@/lib/types'

// Icons for all RallyPhases - used across PhaseSelector, ControlRail, and PhaseControl
export const RALLY_PHASE_ICONS: Record<RallyPhase, React.ReactNode> = {
  'PRE_SERVE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 0 0 0 20"/>
      <path d="M12 2c-2.4 4.3-2.4 9.7 0 14"/>
    </svg>
  ),
  'SERVE_IN_AIR': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M12 2l4 4M12 2L8 6M12 22l4-4M12 22l-4-4"/>
    </svg>
  ),
  'SERVE_RECEIVE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  'TRANSITION_TO_OFFENSE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  'SET_PHASE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  'ATTACK_PHASE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  'TRANSITION_TO_DEFENSE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  'DEFENSE_PHASE': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  ),
  'BALL_DEAD': (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
}

// Legacy phase icons (smaller, 14px) for compact displays
export const LEGACY_PHASE_ICONS: Record<string, React.ReactNode> = {
  serve: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0 0 20" />
      <path d="M12 2c-2.4 4.3-2.4 9.7 0 14" />
    </svg>
  ),
  receive: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  attack: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  defense: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  ),
}

// Simplified icon mapping for compact views (maps RallyPhase to legacy icon categories)
export const RALLY_TO_LEGACY_ICON: Record<RallyPhase, keyof typeof LEGACY_PHASE_ICONS> = {
  'PRE_SERVE': 'serve',
  'SERVE_IN_AIR': 'serve',
  'SERVE_RECEIVE': 'receive',
  'TRANSITION_TO_OFFENSE': 'attack',
  'SET_PHASE': 'attack',
  'ATTACK_PHASE': 'attack',
  'TRANSITION_TO_DEFENSE': 'defense',
  'DEFENSE_PHASE': 'defense',
  'BALL_DEAD': 'defense',
}

// Color coding for different phase types (used in PhaseControl)
export const PHASE_COLORS: Record<RallyPhase, string> = {
  'PRE_SERVE': 'bg-yellow-500',
  'SERVE_IN_AIR': 'bg-orange-500',
  'SERVE_RECEIVE': 'bg-blue-500',
  'TRANSITION_TO_OFFENSE': 'bg-cyan-500',
  'SET_PHASE': 'bg-teal-500',
  'ATTACK_PHASE': 'bg-red-500',
  'TRANSITION_TO_DEFENSE': 'bg-purple-500',
  'DEFENSE_PHASE': 'bg-indigo-500',
  'BALL_DEAD': 'bg-gray-500',
}

/**
 * Get phase info (name, description, etc.) for any phase type
 */
export const getPhaseInfo = (phase: Phase) => {
  if (RALLY_PHASES.includes(phase as RallyPhase)) {
    return RALLY_PHASE_INFO[phase as RallyPhase]
  }
  return PHASE_INFO[phase] || { name: phase, description: '', isIntermediate: false }
}

/**
 * Get the appropriate icon for a phase (supports both RallyPhase and legacy phases)
 */
export const getPhaseIcon = (phase: Phase): React.ReactNode => {
  if (RALLY_PHASES.includes(phase as RallyPhase)) {
    return RALLY_PHASE_ICONS[phase as RallyPhase]
  }
  return LEGACY_PHASE_ICONS[phase] || RALLY_PHASE_ICONS['PRE_SERVE']
}

/**
 * Get the compact/legacy icon for a phase (14px icons for compact displays)
 */
export const getCompactPhaseIcon = (phase: Phase): React.ReactNode => {
  if (RALLY_PHASES.includes(phase as RallyPhase)) {
    const legacyKey = RALLY_TO_LEGACY_ICON[phase as RallyPhase]
    return LEGACY_PHASE_ICONS[legacyKey] || LEGACY_PHASE_ICONS.serve
  }
  return LEGACY_PHASE_ICONS[phase] || LEGACY_PHASE_ICONS.serve
}

/**
 * Check if a phase is a RallyPhase
 */
export const isRallyPhase = (phase: Phase): phase is RallyPhase => {
  return RALLY_PHASES.includes(phase as RallyPhase)
}






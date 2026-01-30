import type { BTNodeTrace } from '@/lib/sim/trace'
import type { BTContext } from '@/lib/sim/bt'
import type { Blackboard, PlayerState, SimRole, SimRoleCategory } from '@/lib/sim/types'
import type { PlayerRole } from '@/store/useBTEditorStore'
import type { PresetId } from '@/lib/bt-editor/presets'
import { createTreeFromPreset, getDefaultPresetId, getPresetById } from '@/lib/bt-editor/presets'

// Map PlayerRole to SimRole and SimRoleCategory
function getRoleInfo(role: PlayerRole): { simRole: SimRole; category: SimRoleCategory } {
  switch (role) {
    case 'setter':
      return { simRole: 'S', category: 'SETTER' }
    case 'outside':
      return { simRole: 'OH1', category: 'OUTSIDE' }
    case 'opposite':
      return { simRole: 'OPP', category: 'OPPOSITE' }
    case 'middle':
      return { simRole: 'MB1', category: 'MIDDLE' }
    case 'libero':
      return { simRole: 'L', category: 'LIBERO' }
  }
}

// Create minimal mock data for running a tree once
function createMockContext(role: PlayerRole): BTContext {
  const { simRole, category } = getRoleInfo(role)

  const mockPlayer: PlayerState = {
    id: `home-${role}`,
    team: 'HOME',
    role: simRole,
    category: category,
    priority: 1,
    position: { x: 0.5, y: 0.7 },
    velocity: { x: 0, y: 0 },
    maxSpeed: 4,
    requestedGoal: null,
    baseGoal: { type: 'MaintainBaseResponsibility' },
    override: { active: false },
    active: true,
    skills: {
      passing: { accuracy: 0.7, power: 0.6 },
      setting: { accuracy: role === 'setter' ? 0.9 : 0.5, tempo: 0.6 },
      attacking: { accuracy: role === 'setter' ? 0.5 : 0.7, power: 0.7 },
      blocking: { timing: role === 'middle' ? 0.8 : 0.6, reach: 0.5 },
      serving: { accuracy: 0.6, power: 0.6 },
      movement: { speed: 0.7, agility: 0.6 },
    },
  }

  const mockBlackboard: Blackboard = {
    fsm: {
      phase: 'SERVE_RECEIVE',
    },
    ball: {
      position: { x: 0.3, y: 0.4 },
      velocity: { x: 0, y: 0.5 },
      predicted_landing: { x: 0.4, y: 0.6 },
      touch_count: 0,
      on_our_side: true,
    },
    rotation: {
      index: 1,
      front_row_players: ['home-outside', 'home-middle', 'home-opposite'],
      hitterMode: '3-hitter',
    },
    team: {
      setter_id: 'home-setter',
    },
    opponent: {
      attack_lane: 'left',
    },
    override: { active: false },
    serving: {
      isOurServe: false,
      serverId: 'away-outside',
    },
  }

  return {
    blackboard: mockBlackboard,
    self: mockPlayer,
    allPlayers: [mockPlayer],
    simTimeMs: 5000,
  }
}

/**
 * Get the tree for a given role using the default preset
 */
function getTreeForRole(role: PlayerRole) {
  const presetId = getDefaultPresetId(role)
  return createTreeFromPreset(presetId)
}

/**
 * Generate a sample trace by running a tree with mock context
 * @deprecated Use generateTraceFromPreset instead
 */
export function generateSampleTrace(role: PlayerRole): BTNodeTrace {
  const tree = getTreeForRole(role)
  if (!tree) {
    throw new Error(`No tree found for role: ${role}`)
  }
  const context = createMockContext(role)
  const result = tree.tick(context)
  return result.trace
}

/**
 * Generate a sample trace from a specific preset
 */
export function generateTraceFromPreset(presetId: PresetId): BTNodeTrace {
  const preset = getPresetById(presetId)
  if (!preset) {
    throw new Error(`Preset not found: ${presetId}`)
  }

  const tree = preset.createTree()
  const context = createMockContext(preset.role)
  const result = tree.tick(context)
  return result.trace
}

/**
 * Role display names for UI
 */
export const roleDisplayNames: Record<PlayerRole, string> = {
  setter: 'Setter',
  outside: 'Outside Hitter',
  opposite: 'Opposite',
  middle: 'Middle Blocker',
  libero: 'Libero',
}

// Canonical volleyball model types
// Normalized coordinate system (0-1), net at y=0

export type NormalizedPosition = { x: number; y: number }

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6'

export type PlayerRole = 'S' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'OPP' | 'L'

export type RotationIndex = 1 | 2 | 3 | 4 | 5 | 6

export type PlayerSlot = {
  slot: Zone
  pos: NormalizedPosition
}

export type RotationState = {
  rotation: RotationIndex
  description?: string
  players: Record<PlayerRole, PlayerSlot>
}

export type MovementIntent =
  | 'reach_setting_window'
  | 'left_pin_approach'
  | 'right_pin_approach'
  | 'first_tempo_or_decoy'
  | 'quick_attack_or_hold'
  | 'left_pin_primary'
  | 'right_pin_primary'
  | 'right_pin_secondary'
  | 'right_pin_out_of_system'
  | 'gap_or_31'
  | 'quick'
  | 'quick_or_slide'
  | 'front_row_set'
  | 'pipe_or_decoy'

export type MovementTiming = 'immediate' | 'post_pass' | 'on_set'

export type TransitionMovement = {
  player: PlayerRole
  to: NormalizedPosition
  intent: MovementIntent
  timing: MovementTiming
}

export type TransitionTrigger = 'ServeContact' | 'BallCrossedNet' | 'TouchComplete'

export type Transition = {
  rotation: RotationIndex
  trigger: TransitionTrigger
  movements: TransitionMovement[]
}

export type CourtGeometry = {
  width: number
  depth: number
  net_y: number
  zones: Record<Zone, {
    x: [number, number]
    y: [number, number]
  }>
}

export type LegalityRules = {
  horizontal_pairs: [Zone, Zone][]
  vertical_pairs: [Zone, Zone][]
}

export type LegalityViolation = {
  type: 'horizontal_overlap' | 'vertical_overlap'
  zones: [Zone, Zone]
  roles?: [PlayerRole, PlayerRole]
}










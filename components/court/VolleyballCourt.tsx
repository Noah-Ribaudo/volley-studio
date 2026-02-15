'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { PlayerToken } from './PlayerToken'
import { markArrowDeleted } from './ArrowHandle'
// ArrowTip removed - now using MovementArrow for preview
import { DropZoneOverlay } from './DropZoneOverlay'
import { DragTooltip } from './DragTooltip'
import { LongPressTooltip } from './LongPressTooltip'
import { ArrowPreviewOverlay } from './ArrowPreviewOverlay'
import { CourtBaseLayer } from './CourtBaseLayer'
import { MovementArrowLayer, CurveHandleLayer } from './ArrowLayers'
import { LegalityViolationLayer } from './LegalityViolationLayer'
import { SimulationBallLayer, AttackBallLayer } from './CourtBallLayers'
import { useHintStore } from '@/store/useHintStore'
import {
  Role,
  ROLES,
  PositionCoordinates,
  Position,
  RosterPlayer,
  PositionAssignments,
  Rotation,
  ArrowPositions,
  ROLE_INFO,
  ROLE_PRIORITY,
  COURT_ZONES,
  PlayerStatus,
  ArrowCurveConfig,
  TokenTag,
} from '@/lib/types'
import { useThemeStore } from '@/store/useThemeStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { PlayerPicker } from './PlayerPicker'
import { TagPicker } from './TagPicker'
import { MotionDebugPanel } from './MotionDebugPanel'
import {
  computeSteering,
  clampPosition,
} from '@/lib/animation'
import { validateRotationLegality } from '@/lib/model/legality'
import {
  DEFAULT_WHITEBOARD_MOTION_TUNING,
  createWhiteboardPlayEngine,
  computeDefaultControlPoint,
  sanitizeMotionTuning,
  type LockedPathDefinition,
  type WhiteboardMotionTuning,
  type WhiteboardPlayEngine,
  type WhiteboardPlaySnapshot,
} from '@/lib/whiteboard-motion'
import {
  animate,
  SPRING,
  stopAnimation,
  type AnimationPlaybackControls,
} from '@/lib/motion-utils'
import { DEFAULT_BASE_ORDER, normalizeBaseOrder, getBackRowMiddle, getActiveRoles } from '@/lib/rotations'
import { PlayerContextUI } from '@/components/player-context'

interface VolleyballCourtProps {
  positions: PositionCoordinates
  awayPositions?: PositionCoordinates
  hideAwayTeam?: boolean
  awayTeamHidePercent?: number
  highlightedRole?: Role | null
  /** The role with context UI open, or null if closed */
  contextPlayer?: Role | null
  /** Callback when context player changes */
  onContextPlayerChange?: (role: Role | null) => void
  roster?: RosterPlayer[]
  assignments?: PositionAssignments
  showZones?: boolean
  rotation?: Rotation
  onPositionChange?: (role: Role, position: Position) => void
  onAwayPositionChange?: (role: Role, position: Position) => void
  onRoleClick?: (role: Role | null) => void
  /** Callback to set highlighted role (accepts null to clear) */
  onHighlightChange?: (role: Role | null) => void
  editable?: boolean
  animationMode?: 'css' | 'raf'
  animationConfig?: {
    durationMs?: number
    easingCss?: string
    easingFn?: 'cubic' | 'quad'
    collisionRadius?: number
    separationStrength?: number
    maxSeparation?: number
  }
  arrows?: ArrowPositions
  onArrowChange?: (role: Role, position: Position | null) => void
  arrowCurves?: Partial<Record<Role, ArrowCurveConfig>>
  onArrowCurveChange?: (role: Role, curve: ArrowCurveConfig | null) => void
  baseOrder?: Role[]
  showPosition?: boolean
  showPlayer?: boolean
  circleTokens?: boolean
  tokenScaleDesktop?: number
  tokenScaleMobile?: number
  // Unified mode support
  mode?: 'whiteboard' | 'simulation'
  // Simulation mode props
  ballPosition?: { x: number; y: number } // Normalized coordinates (0-1)
  ballHeight?: number // Normalized ball height for shadow effect (0-1)
  ballContactFlash?: boolean // Whether to show contact flash effect
  fsmPhase?: string
  // Legality violations (for whiteboard mode)
  legalityViolations?: Array<{ type: string; zones: [string, string]; roles?: [Role, Role] }>
  // Libero support
  showLibero?: boolean // Show libero token when enabled
  // Attack ball (for whiteboard defense phase)
  attackBallPosition?: Position | null // Normalized coordinates (0-1), on opponent side
  onAttackBallChange?: (position: Position | null) => void
  currentPhase?: string // Current phase to determine if attack ball should be shown
  // Token size variant
  tokenSize?: 'big' | 'small'
  // Debug dimension offsets for PlayerToken (in pixels)
  tokenWidthOffset?: number
  tokenHeightOffset?: number
  // Player status flags per role (multiple per player)
  statusFlags?: Partial<Record<Role, PlayerStatus[]>>
  // Callback when status is toggled (add/remove)
  onStatusToggle?: (role: Role, status: PlayerStatus) => void
  // Show full words on status badges instead of first letter
  fullStatusLabels?: boolean
  // Whether a team is currently selected (for player context integration)
  hasTeam?: boolean
  // Callback to open roster management from player context
  onManageRoster?: () => void
  // Debug mode: show hit boxes with neon green highlight
  debugHitboxes?: boolean
  // Debug overlay (developer HUD)
  debugOverlay?: boolean
  // Animation trigger - incrementing counter to trigger bezier path animation
  animationTrigger?: number
  // Whether we're in preview mode (showing players at arrow endpoints after animation)
  isPreviewingMovement?: boolean
  // Token tags per role (for radial menu system)
  tagFlags?: Partial<Record<Role, TokenTag[]>>
  // Callback when tags are changed
  onTagsChange?: (role: Role, tags: TokenTag[]) => void
  // Callback to assign a player to a role (for radial menu player picker)
  onPlayerAssign?: (role: Role, playerId: string) => void
}

type PlayAnimState = {
  role: Role
  length: number
  distance: number
  currentSpeed: number
  targetSpeed: number
  lateralOffset: number
  done: boolean
}

type LockedPath = {
  start: Position
  end: Position
  control: Position | null
}

export function VolleyballCourt({
  positions,
  awayPositions,
  hideAwayTeam = false,
  awayTeamHidePercent = 0,
  highlightedRole = null,
  contextPlayer = null,
  onContextPlayerChange,
  roster = [],
  assignments = {},
  showZones = true,
  rotation,
  onPositionChange,
  onAwayPositionChange,
  onRoleClick,
  onHighlightChange,
  editable = true,
  animationMode = 'css',
  animationConfig,
  arrows = {},
  onArrowChange,
  arrowCurves = {},
  onArrowCurveChange,
  baseOrder = DEFAULT_BASE_ORDER,
  showPosition = true,
  showPlayer = true,
  circleTokens = false,
  tokenScaleDesktop = 1.5,
  tokenScaleMobile = 1.5,
  mode = 'whiteboard',
  ballPosition,
  ballHeight = 0,
  ballContactFlash = false,
  fsmPhase,
  legalityViolations = [],
  showLibero = false,
  attackBallPosition = null,
  onAttackBallChange,
  currentPhase,
  tokenSize = 'big',
  tokenWidthOffset = 0,
  tokenHeightOffset = 0,
  statusFlags = {},
  onStatusToggle,
  fullStatusLabels = true,
  hasTeam,
  onManageRoster,
  debugHitboxes = false,
  debugOverlay = false,
  animationTrigger = 0,
  isPreviewingMovement = false,
  tagFlags = {},
  onTagsChange,
  onPlayerAssign,
}: VolleyballCourtProps) {
  // In simulation mode, disable editing
  const isEditable = mode === 'whiteboard' && editable
  // Arrows are always available in whiteboard mode (no special mode needed)

  // Hint store for teaching UI
  const incrementDragCount = useHintStore((state) => state.incrementDragCount)
  const shouldShowDeleteHint = useHintStore((state) => state.shouldShowDeleteHint)
  const incrementNextStepHintHoverCount = useHintStore((state) => state.incrementNextStepHintHoverCount)
  const shouldShowNextStepHint = useHintStore((state) => state.shouldShowNextStepHint)
  const markNextStepDragLearned = useHintStore((state) => state.markNextStepDragLearned)
  const markFirstDragCompleted = useHintStore((state) => state.markFirstDragCompleted)

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingRole, setDraggingRole] = useState<Role | null>(null)
  const [dragPosition, setDragPosition] = useState<Position | null>(null) // Local visual position during drag
  const draggingRoleRef = useRef<Role | null>(null)
  const dragPositionRef = useRef<Position | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const didDragRef = useRef(false) // Track if actual drag movement occurred (to suppress click)
  const rafRef = useRef<number | null>(null)
  const arrowRafRef = useRef<number | null>(null)
  const curveRafRef = useRef<number | null>(null)
  const arrowDragPositionRef = useRef<Position | null>(null)
  const curveControlRef = useRef<Position | null>(null)
  const positionAnimationRef = useRef<AnimationPlaybackControls | null>(null)
  const onPositionChangeRef = useRef(onPositionChange)
  const onAwayPositionChangeRef = useRef(onAwayPositionChange)

  // Away player dragging state (separate from home team)
  const [draggingAwayRole, setDraggingAwayRole] = useState<Role | null>(null)
  const [dragAwayPosition, setDragAwayPosition] = useState<Position | null>(null)
  const draggingAwayRoleRef = useRef<Role | null>(null)
  const dragAwayPositionRef = useRef<Position | null>(null)
  const awayDragOffsetRef = useRef({ x: 0, y: 0 })
  const awayRafRef = useRef<number | null>(null)

  // Attack ball dragging state (for whiteboard defense phase)
  const [draggingAttackBall, setDraggingAttackBall] = useState(false)
  const [attackBallDragPosition, setAttackBallDragPosition] = useState<Position | null>(null)
  const draggingAttackBallRef = useRef(false)
  const attackBallDragPositionRef = useRef<Position | null>(null)
  const attackBallRafRef = useRef<number | null>(null)
  const onAttackBallChangeRef = useRef(onAttackBallChange)

  // Keep refs in sync
  useEffect(() => {
    onAttackBallChangeRef.current = onAttackBallChange
  }, [onAttackBallChange])

  // Normalize base order once for consistent use throughout the component
  const resolvedBaseOrder = useMemo(() => normalizeBaseOrder(baseOrder), [baseOrder])

  // Determine which MB is being replaced by libero (if enabled)
  const replacedMB = useMemo(
    () => (showLibero && rotation ? getBackRowMiddle(rotation, resolvedBaseOrder) : null),
    [showLibero, rotation, resolvedBaseOrder]
  )

  // Get the active roles (excludes libero when disabled, excludes replaced MB when libero is enabled)
  const activeRoles = useMemo(
    () => getActiveRoles(showLibero, rotation, resolvedBaseOrder),
    [showLibero, rotation, resolvedBaseOrder]
  )

  // Ensure all roles have positions (except in simulation mode where missing = inactive)
  const ensureCompletePositions = (pos: PositionCoordinates): PositionCoordinates => {
    const complete: PositionCoordinates = {} as PositionCoordinates
    for (const role of activeRoles) {
      // In simulation mode, don't fill in defaults - missing means inactive/substituted
      if (mode === 'simulation') {
        if (pos[role]) {
          complete[role] = pos[role]
        }
        // Intentionally don't set a default - keep it undefined
      } else if (role === 'L') {
        // Libero takes the position of the replaced MB if not explicitly set
        if (pos[role]) {
          complete[role] = pos[role]
        } else if (replacedMB && pos[replacedMB]) {
          // Use the replaced MB's position for the libero
          complete[role] = pos[replacedMB]
        }
      } else {
        complete[role] = pos[role] || { x: 0.5, y: 0.5 } // Default to center if missing
      }
    }
    return complete
  }

  // Initialize with positions to match SSR, will update after mount if needed
  const [animatedPositions, setAnimatedPositions] = useState<PositionCoordinates>(() => ensureCompletePositions(positions))
  const currentPositionsRef = useRef<PositionCoordinates>(ensureCompletePositions(positions))
  const animatedPositionsRef = useRef<PositionCoordinates>(ensureCompletePositions(positions))

  // Sync animatedPositions with positions prop when positions change
  useEffect(() => {
    const complete = ensureCompletePositions(positions)
    // Only update if positions actually changed to avoid unnecessary re-renders
    const hasChanged = activeRoles.some(role => {
      const current = animatedPositions[role]
      const newPos = complete[role]
      // Handle undefined positions (inactive players in simulation mode)
      if (!newPos && !current) return false // Both undefined, no change
      if (!newPos || !current) return true // One is undefined, other isn't - changed
      return current.x !== newPos.x || current.y !== newPos.y
    })
    if (hasChanged) {
      setAnimatedPositions(complete)
      currentPositionsRef.current = complete
    }
  }, [positions, showLibero, activeRoles]) // Update when positions, showLibero, or activeRoles change

  useEffect(() => {
    animatedPositionsRef.current = animatedPositions
  }, [animatedPositions])
  const [draggingArrowRole, setDraggingArrowRole] = useState<Role | null>(null)
  const [arrowDragPosition, setArrowDragPosition] = useState<Position | null>(null)
  const [isDraggingOffCourt, setIsDraggingOffCourt] = useState<Record<Role, boolean>>({} as Record<Role, boolean>)
  const isDraggingOffCourtRef = useRef<Record<Role, boolean>>({} as Record<Role, boolean>)
  // Curve dragging state
  const [draggingCurveRole, setDraggingCurveRole] = useState<Role | null>(null)
  const [curveDragPosition, setCurveDragPosition] = useState<Position | null>(null) // Current drag position in normalized coords
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null) // Hovered player token (for arrow tip)
  const [nextStepTooltipRole, setNextStepTooltipRole] = useState<Role | null>(null)
  const [hoveredArrowRole, setHoveredArrowRole] = useState<Role | null>(null) // Hovered arrow (for curve handle)
  const [tappedRole, setTappedRole] = useState<Role | null>(null) // For mobile tap-to-reveal arrow tip
  // Arrow preview hover state (boolean to avoid per-frame rerenders)
  const [previewVisible, setPreviewVisible] = useState<Partial<Record<Role, boolean>>>({})
  const hoverDelayRef = useRef<Partial<Record<Role, NodeJS.Timeout>>>({})
  const hoveredZonesRef = useRef<Partial<Record<Role, Set<string>>>>({})
  const [showArrows, setShowArrows] = useState<boolean>(true)
  const arrowTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const suppressNextArrowFadeRef = useRef<boolean>(false)
  const suppressArrowFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const POSITION_EPSILON = 0.00075
  const hasMeaningfulPositionDelta = (previous: Position | null, next: Position) => {
    if (!previous) return true
    return Math.abs(next.x - previous.x) > POSITION_EPSILON ||
      Math.abs(next.y - previous.y) > POSITION_EPSILON
  }

  // Long-press state for mobile arrow drawing
  const [longPressRole, setLongPressRole] = useState<Role | null>(null)
  const [longPressSvgPos, setLongPressSvgPos] = useState<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTouchStartRef = useRef<{ x: number; y: number; role: Role } | null>(null)
  const ignoreNextPrimedTapRef = useRef(false)
  const lastTapTimeRef = useRef<Partial<Record<Role, number>>>({})

  // Primed state for hold-to-prime arrow creation (mobile)
  const [primedRole, setPrimedRole] = useState<Role | null>(null)
  const primeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track recent touch to prevent touch+click dual firing on mobile
  const recentTouchRef = useRef<boolean>(false)
  const recentTouchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Context UI anchor position (screen coordinates)
  const [contextAnchorPosition, setContextAnchorPosition] = useState<{ x: number; y: number } | null>(null)

  // Picker state
  const [showPlayerPicker, setShowPlayerPicker] = useState<Role | null>(null)
  const [showTagPicker, setShowTagPicker] = useState<Role | null>(null)

  // Note: handleContextPlayerToggle is defined after getTokenScreenPosition (line ~425)

  // Get theme for line color
  const theme = useThemeStore((state) => state.theme)
  const isLightTheme = theme === 'light'
  const lineColor = isLightTheme ? '#9ca3af' : '#6b7280'

  // Determine token scale based on device
  const isMobile = useIsMobile()
  const tokenScale = isMobile ? tokenScaleMobile : tokenScaleDesktop

  // Detect reduced motion preference
  const prefersReducedMotion = useReducedMotion()

  const cfg = {
    durationMs: prefersReducedMotion ? 0 : (animationConfig?.durationMs ?? 500),
    easingCss: animationConfig?.easingCss ?? 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingFn: animationConfig?.easingFn ?? 'cubic',
    collisionRadius: animationConfig?.collisionRadius ?? 0.12, // Normalized (was 12 in percentage)
    separationStrength: animationConfig?.separationStrength ?? 6,
    maxSeparation: animationConfig?.maxSeparation ?? 3,
  }

  const [playTuning, setPlayTuning] = useState<WhiteboardMotionTuning>(() =>
    sanitizeMotionTuning(DEFAULT_WHITEBOARD_MOTION_TUNING)
  )

  const updatePlayTuning = useCallback(
    <K extends keyof WhiteboardMotionTuning>(key: K, value: number) => {
      setPlayTuning((prev) => sanitizeMotionTuning({ ...prev, [key]: value }))
    },
    []
  )
  const playTuningRef = useRef(playTuning)

  useEffect(() => {
    playTuningRef.current = playTuning
  }, [playTuning])

  // Keep refs updated
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

  useEffect(() => {
    onAwayPositionChangeRef.current = onAwayPositionChange
  }, [onAwayPositionChange])

  // Keep ref in sync with animated positions
  useEffect(() => {
    currentPositionsRef.current = animatedPositions
  }, [animatedPositions])

  // Arrow preview show/hide with zone-aware hover tracking.
  // The arrow stays extended as long as the cursor is on ANY zone (token or arrow).
  // It only retracts once the cursor has left ALL zones.
  const handlePreviewHover = useCallback((role: Role, zone: 'token' | 'arrow', isEntering: boolean) => {
    // Update zone tracking
    if (!hoveredZonesRef.current[role]) {
      hoveredZonesRef.current[role] = new Set()
    }
    if (isEntering) {
      hoveredZonesRef.current[role]!.add(zone)
    } else {
      hoveredZonesRef.current[role]!.delete(zone)
    }

    const anyZoneHovered = hoveredZonesRef.current[role]!.size > 0

    // Always cancel pending timers — a new event supersedes them
    if (hoverDelayRef.current[role]) {
      clearTimeout(hoverDelayRef.current[role])
      delete hoverDelayRef.current[role]
    }

    if (anyZoneHovered && isEntering) {
      if (zone === 'arrow') {
        // Arrow zone: show immediately to keep drag/start interactions responsive.
        setHoveredRole(role)
        setPreviewVisible(prev => (prev[role] ? prev : { ...prev, [role]: true }))
      } else {
        // Token zone: short delay to avoid flicker from quick cursor passes.
        hoverDelayRef.current[role] = setTimeout(() => {
          delete hoverDelayRef.current[role]
          if ((hoveredZonesRef.current[role]?.size ?? 0) === 0) return
          setHoveredRole(role)
          setPreviewVisible(prev => (prev[role] ? prev : { ...prev, [role]: true }))
          if (shouldShowNextStepHint()) {
            setNextStepTooltipRole(role)
            incrementNextStepHintHoverCount()
          } else {
            setNextStepTooltipRole(null)
          }
        }, 60)
      }
    } else if (!anyZoneHovered) {
      // All zones left — retract after a short grace period
      // (covers the gap when cursor moves between token and arrow)
      hoverDelayRef.current[role] = setTimeout(() => {
        delete hoverDelayRef.current[role]
        if ((hoveredZonesRef.current[role]?.size ?? 0) > 0) return
        setHoveredRole(current => (current === role ? null : current))
        setNextStepTooltipRole(current => (current === role ? null : current))
        setPreviewVisible(prev => {
          if (!prev[role]) return prev
          const next = { ...prev }
          delete next[role]
          return next
        })
      }, 90)
    }
    // else: leaving one zone while another is still hovered → do nothing, arrow stays
  }, [incrementNextStepHintHoverCount, shouldShowNextStepHint])

  // Cleanup animation refs on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverDelayRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  // Priority order for collision avoidance (stable)
  const resolveCollisionOnce = useCallback((current: PositionCoordinates, original: PositionCoordinates): PositionCoordinates => {
    const result: PositionCoordinates = { ...current }
    const radius = cfg.collisionRadius // normalized units (0-1)

    activeRoles.forEach(role => {
      // If we're dragging this role, it must stay at its original (dragged) position
      if (role === draggingRole) {
        const origPos = original[role]
        if (origPos) result[role] = origPos
        return
      }

      const pos = current[role]
      if (!pos) return

      const adjust: Position = { x: 0, y: 0 }
      activeRoles.forEach(otherRole => {
        if (otherRole === role) return
        const other = current[otherRole]
        if (!other) return

        const dx = pos.x - other.x
        const dy = pos.y - other.y
        const distSq = dx * dx + dy * dy
        const minDist = radius

        if (distSq < 0.00001 || distSq > minDist * minDist) return

        const dist = Math.sqrt(distSq)
        // Overlap is the distance needed to clear the collision
        const overlap = minDist - dist

        let weight = 0.5
        if (otherRole === draggingRole) {
          // Dragged token is an "immovable object", non-dragged token takes all the push
          weight = 1.0
        } else {
          const pSelf = ROLE_PRIORITY[role] ?? 99
          const pOther = ROLE_PRIORITY[otherRole] ?? 99
          // If self has lower priority (higher number), it should move more
          if (pSelf > pOther) weight = 0.75
          else if (pSelf === pOther) weight = 0.5
          else weight = 0.25
        }

        adjust.x += (dx / dist) * overlap * weight
        adjust.y += (dy / dist) * overlap * weight
      })

      // Add restoring force back to home position to prevent unnecessary drift
      // Equilibrium is reached when restoring force equals collision push
      const homePos = original[role]
      if (homePos) {
        const dxHome = homePos.x - pos.x
        const dyHome = homePos.y - pos.y
        // Apply restoring force - 20% back to home in each iteration
        adjust.x += dxHome * 0.2
        adjust.y += dyHome * 0.2
      }

      const newPos = clampPosition({ x: pos.x + adjust.x, y: pos.y + adjust.y })
      result[role] = newPos
    })
    return result
  }, [cfg.collisionRadius, draggingRole])

  const resolveCollisions = useCallback((targets: PositionCoordinates): PositionCoordinates => {
    let current = targets
    // Use slightly more iterations for better stability with restoring forces
    const iterations = 8
    for (let i = 0; i < iterations; i++) {
      current = resolveCollisionOnce(current, targets)
    }
    return current
  }, [resolveCollisionOnce])

  const collisionFreePositions = useMemo(() => {
    // Ensure all roles have positions before collision resolution
    return resolveCollisions(ensureCompletePositions(positions))
  }, [positions, resolveCollisions])

  // Track whether bezier animation is currently running
  const [isBezierAnimating, setIsBezierAnimating] = useState(false)
  const [playedPositions, setPlayedPositions] = useState<PositionCoordinates | null>(null)
  const playLockedPathsRef = useRef<Partial<Record<Role, LockedPath>>>({})
  const playAnimRef = useRef<Partial<Record<Role, PlayAnimState>>>({})
  const playEngineRef = useRef<WhiteboardPlayEngine | null>(null)
  const playPrevSnapshotRef = useRef<WhiteboardPlaySnapshot | null>(null)
  const playCurrentSnapshotRef = useRef<WhiteboardPlaySnapshot | null>(null)
  const playAccumulatorRef = useRef(0)
  const playLastFrameRef = useRef<number | null>(null)
  const debugOverlayHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPreviewingMovement) {
      setPlayedPositions(null)
      playLockedPathsRef.current = {}
      playEngineRef.current = null
      playPrevSnapshotRef.current = null
      playCurrentSnapshotRef.current = null
      playAccumulatorRef.current = 0
      if (bezierRafRef.current) {
        cancelAnimationFrame(bezierRafRef.current)
        bezierRafRef.current = null
      }
      playLastFrameRef.current = null
      setIsBezierAnimating(false)
    }
  }, [isPreviewingMovement])

  // Display positions: during animation use animatedPositions,
  // in preview mode use played positions, otherwise use collisionFreePositions
  const displayPositions = useMemo(() => {
    if (isBezierAnimating) {
      return animatedPositions
    }
    if (isPreviewingMovement) {
      return playedPositions ?? animatedPositions
    }
    if (animationMode === 'raf') {
      return animatedPositions
    }
    return collisionFreePositions
  }, [isBezierAnimating, isPreviewingMovement, animationMode, animatedPositions, collisionFreePositions, playedPositions])

  const showDebugOverlay = debugOverlay
  const displaySource = isBezierAnimating
    ? 'bezier'
    : (isPreviewingMovement ? (playedPositions ? 'played' : 'animated') : (animationMode === 'raf' ? 'animated' : 'collision'))
  const legalityDisplayPositions = useMemo(() => {
    if (!draggingRole || !dragPosition) return displayPositions
    return {
      ...displayPositions,
      [draggingRole]: dragPosition,
    } as PositionCoordinates
  }, [displayPositions, draggingRole, dragPosition])

  const effectiveLegalityViolations = useMemo(() => {
    if (isPreviewingMovement) {
      return []
    }

    const canComputeLive =
      mode === 'whiteboard' &&
      Boolean(rotation) &&
      (currentPhase === 'PRE_SERVE' || currentPhase === 'SERVE_RECEIVE')

    if (!canComputeLive) {
      return legalityViolations
    }

    const validPositions: Record<Role, Position> = {} as Record<Role, Position>
    for (const role of ROLES) {
      if (role === 'L' && !showLibero) {
        validPositions[role] = { x: 0.5, y: 0.5 }
      } else if (showLibero && role === replacedMB) {
        validPositions[role] = legalityDisplayPositions.L || legalityDisplayPositions[replacedMB] || { x: 0.5, y: 0.5 }
      } else {
        validPositions[role] = legalityDisplayPositions[role] || { x: 0.5, y: 0.5 }
      }
    }

    return validateRotationLegality(
      rotation as 1 | 2 | 3 | 4 | 5 | 6,
      validPositions,
      undefined,
      resolvedBaseOrder
    )
  }, [
    isPreviewingMovement,
    mode,
    rotation,
    currentPhase,
    legalityViolations,
    showLibero,
    replacedMB,
    legalityDisplayPositions,
    resolvedBaseOrder,
  ])

  // Calculate screen position for a player token based on their displayed (collision-resolved) position
  // Uses hardcoded court dimensions (400x800, padding 40) since they're constants
  const getTokenScreenPosition = useCallback((role: Role): { x: number; y: number } | null => {
    if (!svgRef.current) return null

    // Use displayPositions (collision-resolved) not raw positions
    const pos = displayPositions[role]
    if (!pos) return null

    // Get SVG's bounding rect on screen
    const svgRect = svgRef.current.getBoundingClientRect()

    // Court constants (must match values defined later in component)
    const cWidth = 400
    const cHeight = 800
    const pad = 40
    const vbWidth = cWidth + pad * 2 // 480
    const vbHeight = cHeight + pad * 2 // 880

    // Token position in viewBox coordinates
    const tokenViewBoxX = pad + pos.x * cWidth
    const tokenViewBoxY = pad + pos.y * cHeight

    // Scale from viewBox to screen coordinates
    const scaleX = svgRect.width / vbWidth
    const scaleY = svgRect.height / vbHeight

    // Screen position
    const screenX = svgRect.left + tokenViewBoxX * scaleX
    const screenY = svgRect.top + tokenViewBoxY * scaleY

    return { x: screenX, y: screenY }
  }, [displayPositions])

  // Handle context player toggle (tap to open, tap again to close)
  const handleContextPlayerToggle = useCallback((role: Role, _event: React.MouseEvent | React.TouchEvent) => {
    if (!onContextPlayerChange) return

    // If same player, close the context UI
    if (contextPlayer === role) {
      onContextPlayerChange(null)
      setContextAnchorPosition(null)
      return
    }

    // Calculate anchor position from token's actual screen position
    const tokenPos = getTokenScreenPosition(role)
    if (tokenPos) {
      setContextAnchorPosition(tokenPos)
    }

    // Open context UI for this player
    onContextPlayerChange(role)
  }, [contextPlayer, onContextPlayerChange, getTokenScreenPosition])

  // Handle animations when positions change - using Motion springs
  useEffect(() => {
    // Stop any existing animation
    stopAnimation(positionAnimationRef.current)

    if (animationMode === 'css') {
      // CSS transitions: render from derived positions; keep refs aligned
      currentPositionsRef.current = collisionFreePositions
      return
    }

    // Motion spring animation with collision avoidance
    const startPositions = { ...currentPositionsRef.current }
    const adjustedTargets = collisionFreePositions

    // Filter to animatable roles
    const animatableRoles = activeRoles.filter(role => {
      if (mode === 'simulation' && !adjustedTargets[role]) return false
      return true
    })

    // Animate using Motion's spring
    positionAnimationRef.current = animate(0, 1, {
      type: 'spring',
      ...SPRING.player,
      onUpdate: (progress) => {
        const next: PositionCoordinates = { ...startPositions }

        // Build agents for collision avoidance
        const agents = animatableRoles.map(role => {
          const startPos = startPositions[role] || { x: 0.5, y: 0.5 }
          const targetPos = adjustedTargets[role] || { x: 0.5, y: 0.5 }
          // Interpolate based on spring progress
          const interpolated = {
            x: startPos.x + (targetPos.x - startPos.x) * progress,
            y: startPos.y + (targetPos.y - startPos.y) * progress,
          }
          return {
            role,
            position: interpolated,
            target: targetPos
          }
        })

        // Apply collision steering
        animatableRoles.forEach((role, idx) => {
          const agent = agents[idx]
          const steering = computeSteering(agent, agents, {
            collisionRadius: cfg.collisionRadius,
            separationStrength: cfg.separationStrength,
            maxSeparation: cfg.maxSeparation
          })
          // Apply small steering offset
          const steered = clampPosition({
            x: agent.position.x + steering.x * (cfg.collisionRadius * 0.2),
            y: agent.position.y + steering.y * (cfg.collisionRadius * 0.2)
          })
          next[role] = steered
        })

        setAnimatedPositions(next)
        currentPositionsRef.current = next
      },
    })

    return () => {
      stopAnimation(positionAnimationRef.current)
    }
  }, [collisionFreePositions, animationMode, cfg.collisionRadius, cfg.separationStrength, cfg.maxSeparation, activeRoles, mode])

  // Tracks the last trigger consumed while preview mode was active.
  const consumedAnimationTriggerRef = useRef<number>(animationTrigger)

  // Ref for RAF animation
  const bezierRafRef = useRef<number | null>(null)

  const applyPlaySnapshot = useCallback(
    (snapshot: WhiteboardPlaySnapshot) => {
      const nextPositions = snapshot.positions as PositionCoordinates
      setAnimatedPositions(nextPositions)
      animatedPositionsRef.current = nextPositions

      const nextAnim: Partial<Record<Role, PlayAnimState>> = {}
      activeRoles.forEach((role) => {
        const agent = snapshot.agents[role]
        if (!agent) return
        nextAnim[role] = {
          role,
          length: agent.length,
          distance: agent.distance,
          currentSpeed: agent.currentSpeed,
          targetSpeed: agent.targetSpeed,
          lateralOffset: agent.lateralOffset,
          done: agent.done,
        }
      })
      playAnimRef.current = nextAnim
    },
    [activeRoles]
  )

  // Speed-based movement along locked paths (Play button)
  useEffect(() => {
    const FIXED_STEP_SECONDS = 1 / 120
    const MAX_SUB_STEPS_PER_FRAME = 6
    const REDUCED_MOTION_MAX_STEPS = 15_000

    if (!isPreviewingMovement || animationTrigger === 0) {
      return
    }

    if (animationTrigger === consumedAnimationTriggerRef.current) {
      return
    }
    consumedAnimationTriggerRef.current = animationTrigger

    if (bezierRafRef.current) {
      cancelAnimationFrame(bezierRafRef.current)
      bezierRafRef.current = null
    }

    playLastFrameRef.current = null
    playAccumulatorRef.current = 0
    playEngineRef.current = null
    playPrevSnapshotRef.current = null
    playCurrentSnapshotRef.current = null
    playAnimRef.current = {}
    playLockedPathsRef.current = {}
    setPlayedPositions(null)
    const tuning = playTuningRef.current

    const startPositions = { ...collisionFreePositions } as PositionCoordinates
    const locked: Partial<Record<Role, LockedPath>> = {}
    const lockedDefinitions: LockedPathDefinition[] = []

    activeRoles.forEach(role => {
      const arrowEnd = arrows[role]
      if (!arrowEnd) return

      const start = startPositions[role] || { x: 0.5, y: 0.5 }
      const controlFromCurve = arrowCurves[role]
      const control = controlFromCurve
        ? { x: controlFromCurve.x, y: controlFromCurve.y }
        : computeDefaultControlPoint(start, arrowEnd, tuning.curveStrength)

      locked[role] = { start, end: arrowEnd, control }
      lockedDefinitions.push({ role, start, end: arrowEnd, control })
    })

    if (lockedDefinitions.length === 0) {
      return
    }

    playLockedPathsRef.current = locked
    setAnimatedPositions(startPositions)
    animatedPositionsRef.current = startPositions

    const engine = createWhiteboardPlayEngine({
      activeRoles,
      initialPositions: startPositions,
      lockedPaths: lockedDefinitions,
      tuning,
    })
    playEngineRef.current = engine
    const initialSnapshot = engine.getSnapshot()
    playPrevSnapshotRef.current = initialSnapshot
    playCurrentSnapshotRef.current = initialSnapshot

    const runToCompletion = () => {
      let snapshot = engine.getSnapshot()
      let steps = 0
      while (!snapshot.done && steps < REDUCED_MOTION_MAX_STEPS) {
        snapshot = engine.step(FIXED_STEP_SECONDS)
        steps += 1
      }
      applyPlaySnapshot(snapshot)
      const finalPositions = snapshot.positions as PositionCoordinates
      setPlayedPositions(finalPositions)
      setIsBezierAnimating(false)
      playLastFrameRef.current = null
      playAccumulatorRef.current = 0
      playEngineRef.current = null
    }

    if (prefersReducedMotion) {
      runToCompletion()
      return
    }

    setIsBezierAnimating(true)

    const tick = (now: number) => {
      const activeEngine = playEngineRef.current
      if (!activeEngine) {
        bezierRafRef.current = null
        return
      }

      if (playLastFrameRef.current === null) {
        playLastFrameRef.current = now
      }
      const dt = Math.min((now - playLastFrameRef.current) / 1000, 0.1)
      playLastFrameRef.current = now

      playAccumulatorRef.current += dt
      let prevSnapshot = playPrevSnapshotRef.current ?? activeEngine.getSnapshot()
      let currentSnapshot = playCurrentSnapshotRef.current ?? prevSnapshot
      let subSteps = 0
      while (playAccumulatorRef.current >= FIXED_STEP_SECONDS && subSteps < MAX_SUB_STEPS_PER_FRAME) {
        prevSnapshot = currentSnapshot
        currentSnapshot = activeEngine.step(FIXED_STEP_SECONDS)
        playAccumulatorRef.current -= FIXED_STEP_SECONDS
        subSteps += 1
      }
      playPrevSnapshotRef.current = prevSnapshot
      playCurrentSnapshotRef.current = currentSnapshot

      const interpolationAlpha = Math.max(0, Math.min(1, playAccumulatorRef.current / FIXED_STEP_SECONDS))
      let renderedSnapshot: WhiteboardPlaySnapshot = currentSnapshot
      if (!currentSnapshot.done && interpolationAlpha > 0 && prevSnapshot !== currentSnapshot) {
        const interpolatedPositions: Partial<Record<Role, Position>> = {}
        activeRoles.forEach((role) => {
          const from = prevSnapshot.positions[role]
          const to = currentSnapshot.positions[role]
          if (from && to) {
            interpolatedPositions[role] = {
              x: from.x + (to.x - from.x) * interpolationAlpha,
              y: from.y + (to.y - from.y) * interpolationAlpha,
            }
          } else if (to) {
            interpolatedPositions[role] = to
          } else if (from) {
            interpolatedPositions[role] = from
          }
        })
        renderedSnapshot = {
          ...currentSnapshot,
          positions: {
            ...currentSnapshot.positions,
            ...interpolatedPositions,
          },
        }
      }

      applyPlaySnapshot(renderedSnapshot)

      if (currentSnapshot.done) {
        const finalPositions = currentSnapshot.positions as PositionCoordinates
        setIsBezierAnimating(false)
        setPlayedPositions(finalPositions)
        setAnimatedPositions(finalPositions)
        animatedPositionsRef.current = finalPositions
        playLastFrameRef.current = null
        playAccumulatorRef.current = 0
        playEngineRef.current = null
        playPrevSnapshotRef.current = null
        playCurrentSnapshotRef.current = null
        bezierRafRef.current = null
        return
      }

      bezierRafRef.current = requestAnimationFrame(tick)
    }

    bezierRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (bezierRafRef.current) {
        cancelAnimationFrame(bezierRafRef.current)
        bezierRafRef.current = null
      }
      playEngineRef.current = null
      playPrevSnapshotRef.current = null
      playCurrentSnapshotRef.current = null
      playAccumulatorRef.current = 0
      setIsBezierAnimating(false)
    }
  }, [
    animationTrigger,
    isPreviewingMovement,
    collisionFreePositions,
    arrows,
    arrowCurves,
    activeRoles,
    applyPlaySnapshot,
    prefersReducedMotion,
  ])

  // Track previous positions for detecting phase changes
  const prevPositionsRef = useRef<PositionCoordinates>(positions)

  // Handle arrow visibility on POSITION changes (phase transitions only)
  // NOTE: We hide arrows when players animate to new positions, not during manual drags
  useEffect(() => {
    // Skip if actively dragging a player or arrow - don't hide arrows during manual edits
    if (draggingRole || draggingArrowRole) {
      prevPositionsRef.current = positions
      return
    }

    // Compare current positions with previous positions using JSON comparison
    const currentPositionsStr = JSON.stringify(positions)
    const prevPositionsStr = JSON.stringify(prevPositionsRef.current)
    const positionsChanged = currentPositionsStr !== prevPositionsStr

    // Manual drag commits should not be treated like phase-transition animations.
    if (positionsChanged && suppressNextArrowFadeRef.current) {
      suppressNextArrowFadeRef.current = false
      if (suppressArrowFadeTimeoutRef.current) {
        clearTimeout(suppressArrowFadeTimeoutRef.current)
        suppressArrowFadeTimeoutRef.current = null
      }
      prevPositionsRef.current = positions
      return
    }

    if (positionsChanged) {
      // Clear any existing timeout
      if (arrowTimeoutRef.current) {
        clearTimeout(arrowTimeoutRef.current)
        arrowTimeoutRef.current = null
      }

      // Hide arrows immediately (players are animating)
      setShowArrows(false)

      // Update previous positions reference
      prevPositionsRef.current = positions

      // Show arrows after animation duration
      arrowTimeoutRef.current = setTimeout(() => {
        setShowArrows(true)
        arrowTimeoutRef.current = null
      }, cfg.durationMs)
    }
  }, [positions, cfg.durationMs, draggingRole, draggingArrowRole])

  // Separate cleanup effect for unmount only (prevents memory leak)
  useEffect(() => {
    return () => {
      if (arrowTimeoutRef.current) {
        clearTimeout(arrowTimeoutRef.current)
        arrowTimeoutRef.current = null
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      if (primeTimerRef.current) {
        clearTimeout(primeTimerRef.current)
        primeTimerRef.current = null
      }
      if (recentTouchTimeoutRef.current) {
        clearTimeout(recentTouchTimeoutRef.current)
        recentTouchTimeoutRef.current = null
      }
      if (suppressArrowFadeTimeoutRef.current) {
        clearTimeout(suppressArrowFadeTimeoutRef.current)
        suppressArrowFadeTimeoutRef.current = null
      }
    }
  }, [])

  // Court dimensions (in pixels, matching 18m x 9m ratio)
  const courtWidth = 400
  const courtHeight = 800
  const padding = 40

  // Calculate viewBox dimensions - optionally crop when away team is hidden
  const viewBoxWidth = courtWidth + padding * 2
  const viewBoxHeight = courtHeight + padding * 2
  const hideFraction = hideAwayTeam ? Math.min(Math.max(awayTeamHidePercent / 100, 0), 0.5) : 0
  // Hide percentage should apply to the full rendered view (court + padding),
  // so the "hide opponent" crop removes more of the opponent side above the net.
  const hideAmount = viewBoxHeight * hideFraction
  const vbY = hideAmount
  const vbH = viewBoxHeight - hideAmount

  // Get player info from roster/assignments
  const getPlayerInfo = (role: Role) => {
    const playerId = assignments[role]
    if (!playerId) return { name: undefined, number: undefined }
    const player = roster.find(p => p.id === playerId)
    return { name: player?.name, number: player?.number }
  }

  // Get role for a zone in current rotation (inverse of getRoleZone)
  const getRoleForZone = useCallback((zone: string, rotation: Rotation | undefined, baseOrder: Role[]) => {
    if (!rotation) return null
    const zoneNum = parseInt(zone.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6
    const zoneOrder = [1, 6, 5, 4, 3, 2] as const

    // Find which position in zoneOrder this zone is at for the current rotation
    const currentZoneIndex = zoneOrder.indexOf(zoneNum)
    if (currentZoneIndex === -1) return null

    // Rotate backwards to find the base zone index
    const baseZoneIndex = (currentZoneIndex - (rotation - 1) + zoneOrder.length) % zoneOrder.length
    const baseZone = zoneOrder[baseZoneIndex]

    // Map baseZone (1-6) to the role index in baseOrder
    const roleIndex = baseZone - 1

    if (roleIndex < 0 || roleIndex >= baseOrder.length) return null

    return baseOrder[roleIndex] || null
  }, [])

  // Convert normalized position (0-1) to SVG coordinates
  const toSvgCoords = (pos: Position): { x: number; y: number } => ({
    x: padding + pos.x * courtWidth,
    y: padding + pos.y * courtHeight
  })

  // Convert SVG coordinates to normalized position
  // Allows positions slightly outside the court bounds (for off-court positioning)
  const toNormalizedCoords = (svgX: number, svgY: number): Position => {
    // Allow some margin outside the court (e.g., for serving positions)
    const margin = 0.15 // 15% margin outside court bounds
    return {
      x: Math.max(-margin, Math.min(1 + margin, (svgX - padding) / courtWidth)),
      y: Math.max(-margin, Math.min(1 + margin, (svgY - padding) / courtHeight))
    }
  }

  // Constrain position for home team: can go anywhere EXCEPT opponent's in-bounds area
  // Home team must stay on their side (y >= 0.5) when within the court bounds
  const constrainHomePosition = (pos: Position): Position => {
    const { x, y } = pos
    // Check if position is within the court's lateral bounds (sidelines)
    const isWithinSidelines = x >= 0 && x <= 1
    // Check if position is trying to enter opponent's in-bounds area
    const inOpponentInBounds = isWithinSidelines && y >= 0 && y < 0.5

    if (inOpponentInBounds) {
      // Push back to the net line (y = 0.5) - the boundary between sides
      return { x, y: 0.5 }
    }
    return pos
  }

  // Constrain position for away team: can go anywhere EXCEPT home team's in-bounds area
  // Away team must stay on their side (y <= 0.5) when within the court bounds
  const constrainAwayPosition = (pos: Position): Position => {
    const { x, y } = pos
    // Check if position is within the court's lateral bounds (sidelines)
    const isWithinSidelines = x >= 0 && x <= 1
    // Check if position is trying to enter home team's in-bounds area
    const inHomeInBounds = isWithinSidelines && y > 0.5 && y <= 1

    if (inHomeInBounds) {
      // Push back to the net line (y = 0.5) - the boundary between sides
      return { x, y: 0.5 }
    }
    return pos
  }

  // Get mouse/touch position in SVG coordinates
  // Uses getScreenCTM() to correctly handle preserveAspectRatio scaling
  const getEventPosition = useCallback((e: MouseEvent | TouchEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const svg = svgRef.current

    let clientX: number, clientY: number
    if ('touches' in e) {
      // `touchend` events have an empty `touches` list; use `changedTouches`.
      const touchPoint = e.touches[0] ?? e.changedTouches[0]
      if (!touchPoint) return { x: 0, y: 0 }
      clientX = touchPoint.clientX
      clientY = touchPoint.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Use SVG's coordinate transformation for accurate conversion
    // This properly handles preserveAspectRatio centering/letterboxing
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const svgPoint = point.matrixTransform(ctm.inverse())

    return { x: svgPoint.x, y: svgPoint.y }
  }, [])

  // Clear long-press state and timer
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTouchStartRef.current = null
    setLongPressRole(null)
    setLongPressSvgPos(null)
  }, [])

  // Clear prime state and timer
  const clearPrime = useCallback(() => {
    if (primeTimerRef.current) {
      clearTimeout(primeTimerRef.current)
      primeTimerRef.current = null
    }
    setPrimedRole(null)
    clearLongPress()
  }, [clearLongPress])

  // Handle court tap when primed - creates arrow to tap location
  const handlePrimedCourtTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!primedRole || !onArrowChange) return
    if (ignoreNextPrimedTapRef.current) {
      ignoreNextPrimedTapRef.current = false
      return
    }

    // Get event coordinates
    const pos = getEventPosition(e.nativeEvent as MouseEvent | TouchEvent)
    const normalizedPos = toNormalizedCoords(pos.x, pos.y)

    // Get the primed player's position
    const primedPlayerPos = displayPositions[primedRole]
    if (primedPlayerPos) {
      // Check if tap is too close to the primed player (within ~0.12 normalized distance)
      // This creates a deadzone slightly bigger than the token to prevent accidental arrows
      const dx = normalizedPos.x - primedPlayerPos.x
      const dy = normalizedPos.y - primedPlayerPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 0.12) {
        // Too close to the player - just cancel prime, don't create arrow
        clearPrime()
        return
      }
    }

    // Check if tap is within court bounds
    const isOnCourt = normalizedPos.x >= 0 && normalizedPos.x <= 1 &&
                      normalizedPos.y >= 0 && normalizedPos.y <= 1

    if (isOnCourt) {
      // Create arrow from primed player to tap location
      onArrowChange(primedRole, normalizedPos)
      // Vibrate to confirm (short pulse)
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
    }

    // Clear prime state
    clearPrime()
  }, [primedRole, onArrowChange, getEventPosition, clearPrime, displayPositions])

  // Handle long-press activation (after ~1s hold without movement)
  const activateLongPress = useCallback((role: Role, svgPos: { x: number; y: number }) => {
    // Vibrate if supported (short pulse)
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    setLongPressRole(role)
    setLongPressSvgPos(svgPos)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const role = draggingRoleRef.current
    const finalPos = dragPositionRef.current
    if (role && finalPos && onPositionChangeRef.current) {
      suppressNextArrowFadeRef.current = true
      if (suppressArrowFadeTimeoutRef.current) {
        clearTimeout(suppressArrowFadeTimeoutRef.current)
      }
      suppressArrowFadeTimeoutRef.current = setTimeout(() => {
        suppressNextArrowFadeRef.current = false
        suppressArrowFadeTimeoutRef.current = null
      }, 350)
      onPositionChangeRef.current(role, finalPos)
      markFirstDragCompleted()
    }

    draggingRoleRef.current = null
    dragPositionRef.current = null
    setDraggingRole(null)
    setDragPosition(null)
  }, [markFirstDragCompleted])

  // Handle drag start
  const handleDragStart = useCallback((role: Role, e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditable || isPreviewingMovement || !onPositionChangeRef.current) return

    // Note: Don't call preventDefault on touch events here - it causes passive event listener warnings
    // The touchmove handler already uses { passive: false } to prevent scrolling during drag
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    const pos = getEventPosition(e.nativeEvent as MouseEvent | TouchEvent)
    const currentPos = toSvgCoords(positions[role] || { x: 0.5, y: 0.5 })

    draggingRoleRef.current = role
    setDraggingRole(role)

    // Immediately hide any arrow preview when drag starts
    setHoveredRole(null)
    setNextStepTooltipRole(null)
    setPreviewVisible({})

    dragOffsetRef.current = {
      x: currentPos.x - pos.x,
      y: currentPos.y - pos.y
    }
    dragPositionRef.current = null
    setDragPosition(null) // Reset drag position
    didDragRef.current = false // Reset drag tracking

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Smooth drag handler using requestAnimationFrame
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault() // Prevent scrolling on mobile

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        const pos = getEventPosition(e)
        const newX = pos.x + dragOffsetRef.current.x
        const newY = pos.y + dragOffsetRef.current.y

        // Constrain home team: can't enter opponent's in-bounds area
        const normalizedPos = constrainHomePosition(toNormalizedCoords(newX, newY))

        // Update visual position immediately (smooth)
        if (!hasMeaningfulPositionDelta(dragPositionRef.current, normalizedPos)) {
          return
        }
        didDragRef.current = true // Mark that actual drag movement occurred
        dragPositionRef.current = normalizedPos
        setDragPosition(normalizedPos)
      })
    }

    const handleEnd = () => {
      // Re-enable page scroll
      document.body.style.overflow = ''
      document.body.style.touchAction = ''

      handleDragEnd()
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
    }, [isEditable, isPreviewingMovement, positions, getEventPosition, handleDragEnd])

  // Handle arrow drag (create, reposition, or delete movement arrows)
  const handleArrowDragStart = useCallback((
    role: Role,
    e: React.MouseEvent | React.TouchEvent,
    initialEndSvg?: { x: number; y: number },
    initialControlSvg?: { x: number; y: number }
  ) => {
    if (!onArrowChange || isPreviewingMovement) return

    // Note: Don't call preventDefault on touch events here - it causes passive event listener warnings
    // The touchmove handler already uses { passive: false } to prevent scrolling during drag
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()
    setDraggingArrowRole(role)

    // Track drag count for hint dismissal
    incrementDragCount()
    markNextStepDragLearned()
    setNextStepTooltipRole(null)

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Initialize with preview position for seamless transition (no visual jump)
    if (initialEndSvg) {
      const normalizedEnd = toNormalizedCoords(initialEndSvg.x, initialEndSvg.y)
      arrowDragPositionRef.current = normalizedEnd
      curveControlRef.current = arrowCurves[role] ?? null
      setArrowDragPosition(normalizedEnd)
    } else if (arrows[role]) {
      const currentArrow = arrows[role]
      arrowDragPositionRef.current = currentArrow
      curveControlRef.current = arrowCurves[role] ?? null
      setArrowDragPosition(currentArrow)
    } else {
      arrowDragPositionRef.current = null
      curveControlRef.current = null
      setArrowDragPosition(null)
    }

    // Initialize curve to match preview
    if (initialControlSvg && onArrowCurveChange) {
      const normalizedControl = toNormalizedCoords(initialControlSvg.x, initialControlSvg.y)
      curveControlRef.current = normalizedControl
      onArrowCurveChange(role, normalizedControl)
    }

    const handleMove = (event: MouseEvent | TouchEvent) => {
      event.preventDefault() // Prevent scrolling on mobile

      if (arrowRafRef.current) {
        cancelAnimationFrame(arrowRafRef.current)
      }
      arrowRafRef.current = requestAnimationFrame(() => {
        const pos = getEventPosition(event)

        // Check if position is off court (outside padding bounds) using raw SVG coordinates
        const isOffCourt = pos.x < padding || pos.x > padding + courtWidth ||
                          pos.y < padding || pos.y > padding + courtHeight

        // Only update React state when the flag actually flips.
        const wasOffCourt = isDraggingOffCourtRef.current[role] ?? false
        if (wasOffCourt !== isOffCourt) {
          setIsDraggingOffCourt(prev => ({ ...prev, [role]: isOffCourt }))
          isDraggingOffCourtRef.current[role] = isOffCourt
        }

        const normalizedPos = toNormalizedCoords(pos.x, pos.y)

        // Always update visual position immediately for smooth feedback
        if (!hasMeaningfulPositionDelta(arrowDragPositionRef.current, normalizedPos)) {
          return
        }
        arrowDragPositionRef.current = normalizedPos
        setArrowDragPosition(normalizedPos)
      })
    }

    const handleEnd = () => {
      // Re-enable page scroll
      document.body.style.overflow = ''
      document.body.style.touchAction = ''

      // Use ref instead of state to get current value (avoids stale closure)
      const wasOffCourt = isDraggingOffCourtRef.current[role]

      // If released off court, delete the arrow
      if (wasOffCourt && onArrowChange) {
        onArrowChange(role, null)
        markArrowDeleted() // Dismiss the delete hint permanently
      } else {
        const finalArrowPos = arrowDragPositionRef.current
        if (finalArrowPos) {
          onArrowChange(role, finalArrowPos)
        }
      }

      // On mobile, show the curve handle after dragging an arrow (unless deleted)
      if (isMobile && !wasOffCourt) {
        setTappedRole(role)
      }

      arrowDragPositionRef.current = null
      curveControlRef.current = null
      setDraggingArrowRole(null)
      setArrowDragPosition(null)
      setIsDraggingOffCourt(prev => ({ ...prev, [role]: false }))
      isDraggingOffCourtRef.current[role] = false

      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
  }, [onArrowChange, onArrowCurveChange, getEventPosition, toNormalizedCoords, incrementDragCount, markNextStepDragLearned, isMobile, arrows, arrowCurves])

  // Handle curve drag - dragging the curve handle adjusts direction and intensity
  const handleCurveDragStart = useCallback((role: Role, e: React.MouseEvent | React.TouchEvent) => {
    if (!onArrowCurveChange || isPreviewingMovement) return

    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    // Get arrow start and end positions
    const startPos = positions[role]
    const endPos = arrows[role]
    if (!startPos || !endPos) return

    setDraggingCurveRole(role)
    curveControlRef.current = arrowCurves[role] ?? null

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault()

      if (curveRafRef.current) {
        cancelAnimationFrame(curveRafRef.current)
      }
      curveRafRef.current = requestAnimationFrame(() => {
        // Use shared coordinate conversion (screen → SVG → normalized)
        const svgPos = getEventPosition(moveEvent)
        const desiredMidpoint = toNormalizedCoords(svgPos.x, svgPos.y)

        // For a quadratic bezier, midpoint at t=0.5 is: 0.25*start + 0.5*control + 0.25*end
        // To make the midpoint appear at the mouse position, solve for control:
        // control = 2*midpoint - 0.5*start - 0.5*end
        const controlX = 2 * desiredMidpoint.x - 0.5 * startPos.x - 0.5 * endPos.x
        const controlY = 2 * desiredMidpoint.y - 0.5 * startPos.y - 0.5 * endPos.y

        // Clamp control point to court bounds (with some margin)
        const clampedControlX = Math.max(-0.5, Math.min(1.5, controlX))
        const clampedControlY = Math.max(-0.2, Math.min(1.2, controlY))
        const nextControl = { x: clampedControlX, y: clampedControlY }
        if (!hasMeaningfulPositionDelta(curveControlRef.current, nextControl)) {
          return
        }
        curveControlRef.current = nextControl
        onArrowCurveChange(role, nextControl)
      })
    }

    const handleEnd = () => {
      if (curveRafRef.current) {
        cancelAnimationFrame(curveRafRef.current)
        curveRafRef.current = null
      }
      curveControlRef.current = null
      setDraggingCurveRole(null)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [onArrowCurveChange, positions, arrows, arrowCurves, getEventPosition, toNormalizedCoords])

  // Handle mobile touch - drag to move, tap to open context menu
  const handleMobileTouchStart = useCallback((role: Role, e: React.TouchEvent) => {
    if (!isEditable) return

    e.stopPropagation()

    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY

    // Block click handler from also firing on mobile
    recentTouchRef.current = true
    if (recentTouchTimeoutRef.current) {
      clearTimeout(recentTouchTimeoutRef.current)
    }
    recentTouchTimeoutRef.current = setTimeout(() => {
      recentTouchRef.current = false
    }, 300)

    // Store touch start for movement detection
    longPressTouchStartRef.current = { x: startX, y: startY, role }

    const MOVE_THRESHOLD = 10
    const HOLD_TO_PRIME_MS = 250
    let hasStartedDrag = false
    let holdActivated = false

    // Hold-to-prime arrow drawing on mobile.
    // After 250ms hold (without movement), next court tap places arrow endpoint.
    if (primeTimerRef.current) {
      clearTimeout(primeTimerRef.current)
    }
    primeTimerRef.current = setTimeout(() => {
      if (hasStartedDrag) return
      holdActivated = true
      ignoreNextPrimedTapRef.current = true

      const tokenPos = displayPositions[role]
      if (tokenPos) {
        activateLongPress(role, toSvgCoords(tokenPos))
      }
      setPrimedRole(role)
      setTappedRole(null)
      if (onContextPlayerChange) {
        onContextPlayerChange(null)
        setContextAnchorPosition(null)
      }
    }, HOLD_TO_PRIME_MS)

    const handleMove = (ev: TouchEvent) => {
      const currentTouch = ev.touches[0]
      const dx = currentTouch.clientX - startX
      const dy = currentTouch.clientY - startY
      const distance = Math.sqrt(dx * dx + dy * dy)

      // If finger moved past threshold, start player drag
      if (distance > MOVE_THRESHOLD && !hasStartedDrag && !holdActivated) {
        hasStartedDrag = true
        if (primeTimerRef.current) {
          clearTimeout(primeTimerRef.current)
          primeTimerRef.current = null
        }
        clearLongPress()

        // Start normal player drag
        handleDragStart(role, { nativeEvent: ev, preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.TouchEvent)

        // Remove these listeners since the drag handlers will set up their own
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('touchend', handleEnd)
      }
    }

    const handleEnd = () => {
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      if (primeTimerRef.current) {
        clearTimeout(primeTimerRef.current)
        primeTimerRef.current = null
      }

      // Hold activated: keep primed state for the next tap-to-place.
      if (holdActivated) {
        clearLongPress()
        return
      }

      // If we didn't start a drag or hold-prime, open the context menu (bottom sheet)
      if (!hasStartedDrag) {
        if (navigator.vibrate) {
          navigator.vibrate(30)
        }
        if (onContextPlayerChange) {
          handleContextPlayerToggle(role, e)
        }
      }
    }

    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [
    isEditable,
    handleDragStart,
    onContextPlayerChange,
    handleContextPlayerToggle,
    displayPositions,
    activateLongPress,
    toSvgCoords,
    clearLongPress,
  ])

  // Handle away player drag end
  const handleAwayDragEnd = useCallback(() => {
    if (awayRafRef.current) {
      cancelAnimationFrame(awayRafRef.current)
      awayRafRef.current = null
    }

    const role = draggingAwayRoleRef.current
    const finalPos = dragAwayPositionRef.current
    if (role && finalPos && onAwayPositionChangeRef.current) {
      onAwayPositionChangeRef.current(role, finalPos)
    }

    draggingAwayRoleRef.current = null
    dragAwayPositionRef.current = null
    setDraggingAwayRole(null)
    setDragAwayPosition(null)
  }, [])

  // Handle away player drag start
  const handleAwayDragStart = useCallback((role: Role, e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditable || !onAwayPositionChangeRef.current || !awayPositions) return

    // Note: Don't call preventDefault on touch events here - it causes passive event listener warnings
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    const pos = getEventPosition(e.nativeEvent as MouseEvent | TouchEvent)
    const currentPos = toSvgCoords(awayPositions[role] || { x: 0.5, y: 0.25 })

    draggingAwayRoleRef.current = role
    setDraggingAwayRole(role)
    awayDragOffsetRef.current = {
      x: currentPos.x - pos.x,
      y: currentPos.y - pos.y
    }
    dragAwayPositionRef.current = null
    setDragAwayPosition(null)

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Smooth drag handler using requestAnimationFrame
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()

      if (awayRafRef.current) {
        cancelAnimationFrame(awayRafRef.current)
      }

      awayRafRef.current = requestAnimationFrame(() => {
        const pos = getEventPosition(e)
        const newX = pos.x + awayDragOffsetRef.current.x
        const newY = pos.y + awayDragOffsetRef.current.y

        // Constrain away team: can't enter home team's in-bounds area
        const normalizedPos = constrainAwayPosition(toNormalizedCoords(newX, newY))

        // Update visual position immediately (smooth)
        if (!hasMeaningfulPositionDelta(dragAwayPositionRef.current, normalizedPos)) {
          return
        }
        dragAwayPositionRef.current = normalizedPos
        setDragAwayPosition(normalizedPos)
      })
    }

    const handleEnd = () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''

      handleAwayDragEnd()
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [isEditable, awayPositions, getEventPosition, handleAwayDragEnd])

  // Constrain attack ball position: must stay on opponent side (y < 0.5) and near net
  const constrainAttackBallPosition = useCallback((pos: Position): Position => {
    const { x, y } = pos
    // Clamp X to court bounds
    const clampedX = Math.max(0, Math.min(1, x))
    // Clamp Y to opponent side near net (y between 0.25 and 0.45)
    const clampedY = Math.max(0.25, Math.min(0.45, y))
    return { x: clampedX, y: clampedY }
  }, [])

  // Default attack ball position when first created
  const DEFAULT_ATTACK_BALL_POSITION: Position = { x: 0.5, y: 0.35 }

  // Handle attack ball drag end
  const handleAttackBallDragEnd = useCallback(() => {
    if (!draggingAttackBallRef.current) return

    const finalPosition = attackBallDragPositionRef.current
    if (finalPosition && onAttackBallChangeRef.current) {
      onAttackBallChangeRef.current(finalPosition)
    }

    draggingAttackBallRef.current = false
    attackBallDragPositionRef.current = null
    setDraggingAttackBall(false)
    setAttackBallDragPosition(null)
  }, [])

  // Handle attack ball drag start
  const handleAttackBallDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'whiteboard' || currentPhase !== 'DEFENSE_PHASE') return
    if (!onAttackBallChangeRef.current) return

    // Note: Don't call preventDefault on touch events here - it causes passive event listener warnings
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    draggingAttackBallRef.current = true
    setDraggingAttackBall(true)

    // If no attack ball position, create one at default location
    const currentBallPos = attackBallPosition || DEFAULT_ATTACK_BALL_POSITION
    attackBallDragPositionRef.current = currentBallPos
    setAttackBallDragPosition(currentBallPos)

    // If first time creating, notify parent
    if (!attackBallPosition && onAttackBallChangeRef.current) {
      onAttackBallChangeRef.current(DEFAULT_ATTACK_BALL_POSITION)
    }

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Smooth drag handler using requestAnimationFrame
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()

      if (attackBallRafRef.current) {
        cancelAnimationFrame(attackBallRafRef.current)
      }

      attackBallRafRef.current = requestAnimationFrame(() => {
        const pos = getEventPosition(e)
        const normalizedPos = constrainAttackBallPosition(toNormalizedCoords(pos.x, pos.y))

        // Update visual position immediately
        if (!hasMeaningfulPositionDelta(attackBallDragPositionRef.current, normalizedPos)) {
          return
        }
        attackBallDragPositionRef.current = normalizedPos
        setAttackBallDragPosition(normalizedPos)
      })
    }

    const handleEnd = () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''

      handleAttackBallDragEnd()
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [mode, currentPhase, attackBallPosition, getEventPosition, constrainAttackBallPosition, toNormalizedCoords, handleAttackBallDragEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (arrowRafRef.current) {
        cancelAnimationFrame(arrowRafRef.current)
      }
      if (curveRafRef.current) {
        cancelAnimationFrame(curveRafRef.current)
      }
      if (awayRafRef.current) {
        cancelAnimationFrame(awayRafRef.current)
      }
      if (attackBallRafRef.current) {
        cancelAnimationFrame(attackBallRafRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={debugOverlayHostRef}
      className="relative w-full h-full flex items-center justify-center"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {showDebugOverlay && (
        <MotionDebugPanel
          mode={mode}
          animationMode={animationMode}
          displaySource={displaySource}
          isBezierAnimating={isBezierAnimating}
          isPreviewingMovement={isPreviewingMovement}
          hasPlayedPositions={Boolean(playedPositions)}
          animationTrigger={animationTrigger}
          isRafActive={Boolean(bezierRafRef.current)}
          lastFrameMs={playLastFrameRef.current ?? undefined}
          draggingRole={draggingRole}
          draggingArrowRole={draggingArrowRole}
          draggingCurveRole={draggingCurveRole}
          tuning={playTuning}
          onTuningChange={updatePlayTuning}
          roles={activeRoles.map((role) => {
            const anim = playAnimRef.current[role]
            const locked = Boolean(playLockedPathsRef.current[role])
            const progress = anim && anim.length > 0 ? anim.distance / anim.length : 0
            return {
              role,
              hasLockedPath: locked,
              done: Boolean(anim?.done),
              progress,
              currentSpeed: anim?.currentSpeed ?? 0,
              targetSpeed: anim?.targetSpeed ?? 0,
              lateralOffset: anim?.lateralOffset ?? 0,
            }
          })}
        />
      )}
      <svg
        ref={svgRef}
        data-court-svg
        viewBox={`0 ${vbY} ${viewBoxWidth} ${vbH}`}
        className="select-none w-full h-full max-h-full max-w-full"
        style={{
          touchAction: 'none',
          display: 'block',
          // On mobile (h-auto), aspect ratio ensures correct height
          // On desktop (h-full), SVG scales to fit container
          aspectRatio: `${viewBoxWidth} / ${vbH}`,
          // Disable webkit tap highlight on the entire SVG (mobile polish)
          WebkitTapHighlightColor: 'transparent',
        }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Volleyball court ${rotation ? `rotation ${rotation}` : ''} phase ${showZones ? 'with zones' : ''}`}
        onClickCapture={(e) => {
          // Close context menu when clicking on court background (not on players)
          // We use capture phase so this runs before other click handlers
          const target = e.target as Element
          const tagName = target?.tagName?.toLowerCase()
          // Only close if clicking on background elements (rect, svg itself, lines)
          if (tagName === 'svg' || tagName === 'rect' || tagName === 'line' || tagName === 'path') {
            // If a token is primed, handle court tap to place arrow
            if (primedRole && onArrowChange) {
              handlePrimedCourtTap(e)
              e.preventDefault()
              e.stopPropagation()
              return
            }

            if (contextPlayer && onContextPlayerChange) {
              onContextPlayerChange(null)
              setContextAnchorPosition(null)
            }
          }
        }}
        onTouchEnd={(e) => {
          // Handle touch end on court background for primed arrow placement
          const target = e.target as Element
          const tagName = target?.tagName?.toLowerCase()
          if (tagName === 'svg' || tagName === 'rect' || tagName === 'line' || tagName === 'path') {
            if (primedRole && onArrowChange) {
              handlePrimedCourtTap(e)
              e.preventDefault()
              e.stopPropagation()
            }
          }
        }}
      >
        {/* Drop zone overlay - shows during arrow drag to teach delete gesture */}
        <DropZoneOverlay
          visible={draggingArrowRole !== null}
          isOverDropZone={draggingArrowRole ? (isDraggingOffCourt[draggingArrowRole] ?? false) : false}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          padding={padding}
        />

        <CourtBaseLayer
          padding={padding}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          showZones={showZones}
          rotation={rotation}
          baseOrder={resolvedBaseOrder}
          activeRoles={activeRoles}
          replacedMB={replacedMB}
          isBezierAnimating={isBezierAnimating}
          arrows={arrows}
          displayPositions={displayPositions}
          lineColor={lineColor}
        />

        <LegalityViolationLayer
          mode={mode}
          isBezierAnimating={isBezierAnimating}
          legalityViolations={effectiveLegalityViolations}
          displayPositions={legalityDisplayPositions}
          toSvgCoords={toSvgCoords}
        />

        <MovementArrowLayer
          activeRoles={activeRoles}
          displayPositions={displayPositions}
          mode={mode}
          isBezierAnimating={isBezierAnimating}
          isPreviewingMovement={isPreviewingMovement}
          playLockedPaths={playLockedPathsRef.current}
          draggingRole={draggingRole}
          dragPosition={dragPosition}
          draggingArrowRole={draggingArrowRole}
          arrowDragPosition={arrowDragPosition}
          arrows={arrows}
          arrowCurves={arrowCurves}
          curveStrength={playTuning.curveStrength}
          showArrows={showArrows}
          durationMs={cfg.durationMs}
          easingCss={cfg.easingCss}
          debugHitboxes={debugHitboxes}
          toSvgCoords={toSvgCoords}
          onArrowDragStart={handleArrowDragStart}
          onArrowHoverChange={setHoveredArrowRole}
          getRoleColor={(role) => ROLE_INFO[role].color}
        />

        <ArrowPreviewOverlay
          activeRoles={activeRoles}
          displayPositions={displayPositions}
          draggingRole={draggingRole}
          dragPosition={dragPosition}
          draggingArrowRole={draggingArrowRole}
          arrowDragPosition={arrowDragPosition}
          arrows={arrows}
          previewVisible={previewVisible}
          tappedRole={tappedRole}
          isMobile={isMobile}
          showPosition={showPosition}
          showPlayer={showPlayer}
          tokenScale={tokenScale}
          debugHitboxes={debugHitboxes}
          toSvgCoords={toSvgCoords}
          getPlayerInfo={getPlayerInfo}
          onArrowChange={onArrowChange}
          onArrowDragStart={handleArrowDragStart}
          onPreviewHover={handlePreviewHover}
        />

        {/* Players and arrow handles - rendered SECOND so they appear on top */}
        {activeRoles.map(role => {
          // --- HOME PLAYER ---
          // In simulation mode, skip rendering if position is undefined (player is inactive/substituted)
          const hasHomePosition = displayPositions[role] !== undefined
          if (mode === 'simulation' && !hasHomePosition) {
            // Check if away position exists
            const hasAwayPosition = awayPositions && awayPositions[role] !== undefined
            if (!hasAwayPosition) return null
            // Continue to render away player only
          }

          const homeBasePos = displayPositions[role] || { x: 0.5, y: 0.75 }
          const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : homeBasePos)

          const playerInfo = getPlayerInfo(role)
          const isHighlighted = highlightedRole === role
          const isDragging = draggingRole === role

          // Arrow handle positioning (for next-step mode)
          const activeArrowTarget = draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role]
          const defaultHandleSvg = { x: homeSvgPos.x, y: Math.max(12, homeSvgPos.y - 28) }
          const arrowEndSvg = activeArrowTarget ? toSvgCoords(activeArrowTarget) : defaultHandleSvg

          // Render HOME player
          const homePlayerNode = (
            <g key={`home-${role}`}>
              <g
                transform={`translate(${homeSvgPos.x}, ${homeSvgPos.y})`}
                style={{
                  cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                  willChange: 'transform',
                  transition: animationMode === 'css' && !isDragging && !isBezierAnimating
                    ? `transform ${cfg.durationMs}ms ${cfg.easingCss}`
                    : undefined
                }}
              >
                {/* Invisible SVG hit target for touch/mouse - sized to match actual token */}
                {(() => {
                  // Calculate hit target size based on actual token dimensions
                  const hasAssignedPlayer = playerInfo.name !== undefined || playerInfo.number !== undefined
                  const isPositionOnlyMode = showPosition && (!showPlayer || !hasAssignedPlayer)
                  const baseTokenSize = isPositionOnlyMode ? 56 : 48
                  const hitTargetSize = Math.max(baseTokenSize * tokenScale, 48) // Min 48px for touch targets
                  const hitRadius = hitTargetSize / 2
                  return (
                    <rect
                      x={-hitRadius}
                      y={-hitRadius}
                      width={hitTargetSize}
                      height={hitTargetSize}
                      fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
                      stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
                      strokeWidth={debugHitboxes ? 2 : 0}
                      style={{
                        pointerEvents: 'auto',
                        cursor: isEditable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                        touchAction: 'none',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onMouseEnter={() => !isMobile && !draggingRole && !draggingArrowRole && handlePreviewHover(role, 'token', true)}
                      onMouseLeave={() => handlePreviewHover(role, 'token', false)}
                      onClick={(e) => {
                        // MOBILE FIX: Skip click if touch just ended (prevents dual firing)
                        if (recentTouchRef.current) {
                          return
                        }

                        // Handle click for selection and context UI
                        if (!isEditable) {
                          e.preventDefault()
                          e.stopPropagation()
                          if (onContextPlayerChange) {
                            handleContextPlayerToggle(role, e)
                          } else if (onRoleClick) {
                            onRoleClick(role)
                          }
                        } else {
                          // Skip if this click follows a drag operation
                          if (didDragRef.current) {
                            didDragRef.current = false
                            return
                          }

                          // Handle primed state interactions
                          if (primedRole) {
                            e.preventDefault()
                            e.stopPropagation()
                            // Tapping the primed token cancels priming
                            // Tapping a different token also cancels (doesn't switch)
                            clearPrime()
                            return
                          }

                          // Single tap: open context menu (for status selection, etc.)
                          e.preventDefault()
                          e.stopPropagation()
                          if (onContextPlayerChange) {
                            handleContextPlayerToggle(role, e)
                          }
                          // On mobile, tap to reveal arrow tip or curve handle
                          if (isMobile) {
                            setTappedRole(tappedRole === role ? null : role)
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 0 && isEditable) {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDragStart(role, e)
                        }
                      }}
                      onTouchStart={(e) => {
                        if (isEditable) {
                          // Use mobile touch handler with long-press detection
                          handleMobileTouchStart(role, e)
                        } else {
                          // Handle tap for selection/context UI in non-editable mode
                          e.stopPropagation()

                          // Set flag to prevent click from also firing (dual event fix)
                          recentTouchRef.current = true
                          if (recentTouchTimeoutRef.current) {
                            clearTimeout(recentTouchTimeoutRef.current)
                          }
                          recentTouchTimeoutRef.current = setTimeout(() => {
                            recentTouchRef.current = false
                          }, 300)

                          if (onContextPlayerChange) {
                            handleContextPlayerToggle(role, e)
                          } else if (onRoleClick) {
                            onRoleClick(role)
                          }
                        }
                      }}
                    />
                  )
                })()}
                <g
                  style={{
                    pointerEvents: 'none',
                    willChange: 'transform',
                    transition: animationMode === 'css' && !isDragging && !isBezierAnimating
                      ? `transform ${cfg.durationMs}ms ${cfg.easingCss}`
                      : undefined
                  }}
                >
                  <PlayerToken
                    role={role}
                    x={0}
                    y={0}
                    highlighted={isHighlighted}
                    playerName={playerInfo.name}
                    playerNumber={playerInfo.number}
                    isDragging={isDragging}
                    isHovered={hoveredRole === role}
                    onClick={() => onRoleClick?.(role)}
                    showPosition={showPosition}
                    showPlayer={showPlayer}
                    isCircle={circleTokens}
                    mobileScale={tokenScale}
                    isInViolation={effectiveLegalityViolations.some(v =>
                      v.roles && (v.roles[0] === role || v.roles[1] === role)
                    )}
                    isContextOpen={contextPlayer === role}
                    tokenSize={tokenSize}
                    widthOffset={tokenWidthOffset}
                    heightOffset={tokenHeightOffset}
                    statuses={statusFlags[role] || []}
                    fullStatusLabels={fullStatusLabels}
                    isPrimed={primedRole === role}
                  />
                </g>
              </g>
            </g>
          )

          // --- AWAY PLAYER (Optional) ---
          const awayBasePos = awayPositions?.[role] || { x: 0.5, y: 0.25 }
          const awaySvgPos = toSvgCoords(draggingAwayRole === role && dragAwayPosition ? dragAwayPosition : awayBasePos)
          const isAwayDragging = draggingAwayRole === role
          const isAwayEditable = isEditable && !!onAwayPositionChange

          // Calculate away team hit target size to match home team scaling
          const awayHitTargetSize = Math.max(48 * tokenScale, 48) // Same scaling as home team
          const awayHitRadius = awayHitTargetSize / 2

          const awayPlayerNode = awayPositions && awayPositions[role] ? (
            <g key={`away-${role}`}>
              <g
                transform={`translate(${awaySvgPos.x}, ${awaySvgPos.y})`}
                style={{
                  cursor: isAwayEditable ? (isAwayDragging ? 'grabbing' : 'grab') : 'default',
                  willChange: 'transform',
                  transition: animationMode === 'css' && !isAwayDragging && !isBezierAnimating
                    ? `transform ${cfg.durationMs}ms ${cfg.easingCss}`
                    : undefined
                }}
              >
                {/* Invisible SVG hit target for touch/mouse - scaled to match home team */}
                <rect
                  x={-awayHitRadius}
                  y={-awayHitRadius}
                  width={awayHitTargetSize}
                  height={awayHitTargetSize}
                  fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
                  stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
                  strokeWidth={debugHitboxes ? 2 : 0}
                  style={{
                    pointerEvents: isAwayEditable ? 'auto' : 'none',
                    cursor: isAwayEditable ? (isAwayDragging ? 'grabbing' : 'grab') : 'default',
                    touchAction: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 0 && isAwayEditable) {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAwayDragStart(role, e)
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isAwayEditable) {
                      // Note: Don't call preventDefault here - it causes passive event listener warnings
                      e.stopPropagation()
                      handleAwayDragStart(role, e)
                    }
                  }}
                />
                <g style={{ pointerEvents: 'none' }}>
                  <PlayerToken
                    role={role}
                    x={0}
                    y={0}
                    colorOverride="#4b5563"
                    showPosition={showPosition}
                    showPlayer={false} // Don't show player info for away team by default
                    isCircle={circleTokens}
                    mobileScale={tokenScale}
                    isDragging={isAwayDragging}
                    tokenSize={tokenSize}
                    widthOffset={tokenWidthOffset}
                    heightOffset={tokenHeightOffset}
                  />
                </g>
              </g>
            </g>
          ) : null

          return (
            <g key={role}>
              {hasHomePosition && homePlayerNode}
              {awayPlayerNode}
            </g>
          )
        })}

        <CurveHandleLayer
          activeRoles={activeRoles}
          displayPositions={displayPositions}
          mode={mode}
          isBezierAnimating={isBezierAnimating}
          isPreviewingMovement={isPreviewingMovement}
          isMobile={isMobile}
          tappedRole={tappedRole}
          hoveredArrowRole={hoveredArrowRole}
          draggingCurveRole={draggingCurveRole}
          canEditCurves={Boolean(onArrowCurveChange)}
          playLockedPaths={playLockedPathsRef.current}
          draggingArrowRole={draggingArrowRole}
          arrowDragPosition={arrowDragPosition}
          arrows={arrows}
          arrowCurves={arrowCurves}
          draggingRole={draggingRole}
          dragPosition={dragPosition}
          curveStrength={playTuning.curveStrength}
          showArrows={showArrows}
          durationMs={cfg.durationMs}
          easingCss={cfg.easingCss}
          debugHitboxes={debugHitboxes}
          toSvgCoords={toSvgCoords}
          onCurveDragStart={handleCurveDragStart}
          onArrowHoverChange={setHoveredArrowRole}
        />

        <SimulationBallLayer
          mode={mode}
          ballPosition={ballPosition}
          ballHeight={ballHeight}
          ballContactFlash={ballContactFlash}
          padding={padding}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
        />

        <AttackBallLayer
          mode={mode}
          currentPhase={currentPhase}
          attackBallPosition={attackBallPosition}
          attackBallDragPosition={attackBallDragPosition}
          draggingAttackBall={draggingAttackBall}
          defaultPosition={DEFAULT_ATTACK_BALL_POSITION}
          padding={padding}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          debugHitboxes={debugHitboxes}
          onAttackBallDragStart={handleAttackBallDragStart}
        />

        {/* First-time tip: teaches how to reveal the next-step arrow */}
        {nextStepTooltipRole && !draggingArrowRole && (() => {
          const rolePos = displayPositions[nextStepTooltipRole]
          if (!rolePos) return null
          const tooltipPos = toSvgCoords(rolePos)
          return (
            <DragTooltip
              visible={true}
              x={tooltipPos.x}
              y={tooltipPos.y}
              message="Drag me to show next step"
            />
          )
        })()}

        {/* Floating tooltip for new users - teaches drag-off-court to delete */}
        {shouldShowDeleteHint() && draggingArrowRole && arrowDragPosition && (
          <DragTooltip
            visible={true}
            x={toSvgCoords(arrowDragPosition).x}
            y={toSvgCoords(arrowDragPosition).y}
            message="Drag off court to delete"
          />
        )}

        {/* Long-press tooltip for mobile arrow drawing */}
        {longPressRole && longPressSvgPos && (
          <LongPressTooltip
            visible={true}
            x={longPressSvgPos.x}
            y={longPressSvgPos.y}
            tokenRadius={Math.max(48 * tokenScale, 48) / 2}
          />
        )}
      </svg>

      {/* Player Context UI - rendered outside SVG for proper popover/sheet behavior */}
      {onContextPlayerChange && (
        <PlayerContextUI
          contextPlayer={contextPlayer}
          onContextPlayerChange={onContextPlayerChange}
          anchorPosition={contextAnchorPosition}
          roster={roster}
          assignments={assignments}
          mode={mode}
          currentStatuses={contextPlayer ? statusFlags[contextPlayer] || [] : []}
          onStatusToggle={onStatusToggle && contextPlayer ? (status) => onStatusToggle(contextPlayer, status) : undefined}
          isHighlighted={contextPlayer ? highlightedRole === contextPlayer : false}
          onHighlightToggle={contextPlayer && onRoleClick ? () => {
            // Toggle highlight: if already highlighted, clear it; otherwise set it
            if (highlightedRole === contextPlayer) {
              onRoleClick(null)
            } else {
              onRoleClick(contextPlayer)
            }
          } : undefined}
          hasArrow={contextPlayer ? !!arrows[contextPlayer] : false}
          canStartArrow={Boolean(contextPlayer && onArrowChange)}
          onStartArrow={contextPlayer && onArrowChange ? () => {
            clearPrime()
            setPrimedRole(contextPlayer)
            setTappedRole(null)
            onContextPlayerChange(null)
            if (navigator.vibrate) {
              navigator.vibrate(20)
            }
          } : undefined}
          hasTeam={hasTeam}
          onManageRoster={onManageRoster}
          onPlayerAssign={onPlayerAssign ? (role, playerId) => {
            if (playerId) {
              onPlayerAssign(role, playerId)
            } else {
              // Unassign - pass empty string to clear
              onPlayerAssign(role, '')
            }
          } : undefined}
        />
      )}

      {/* Player picker overlay */}
      {showPlayerPicker && (
        <PlayerPicker
          role={showPlayerPicker}
          roster={roster}
          assignments={assignments}
          onSelect={(playerId) => {
            if (onPlayerAssign) {
              onPlayerAssign(showPlayerPicker, playerId)
            }
            setShowPlayerPicker(null)
          }}
          onClose={() => setShowPlayerPicker(null)}
        />
      )}

      {/* Tag picker overlay */}
      {showTagPicker && (
        <TagPicker
          role={showTagPicker}
          currentTags={tagFlags[showTagPicker] || []}
          onTagsChange={(tags) => {
            if (onTagsChange) {
              onTagsChange(showTagPicker, tags)
            }
          }}
          onClose={() => setShowTagPicker(null)}
        />
      )}
    </div>
  )
}

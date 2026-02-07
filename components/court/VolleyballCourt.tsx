'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { CourtGrid } from './CourtGrid'
import { PlayerToken } from './PlayerToken'
import { MovementArrow } from './MovementArrow'
import { markArrowDeleted } from './ArrowHandle'
// ArrowTip removed - now using MovementArrow for preview
import { DropZoneOverlay } from './DropZoneOverlay'
import { DragTooltip } from './DragTooltip'
import { LongPressTooltip } from './LongPressTooltip'
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
import {
  computeSteering,
  clampPosition,
} from '@/lib/animation'
import {
  animate,
  SPRING,
  stopAnimation,
  type AnimationPlaybackControls,
} from '@/lib/motion-utils'
import { DEFAULT_BASE_ORDER, normalizeBaseOrder, isInBackRow, getRoleZone, getBackRowMiddle, getActiveRoles } from '@/lib/rotations'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { getTextColorForOklch, darkenOklch } from '@/lib/utils'
import type { LegalityViolation } from '@/lib/model/types'
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
  start: Position
  end: Position
  control: Position | null
  length: number
  distance: number
  currentSpeed: number
  targetSpeed: number
  offset: Position
  offsetVel: Position
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

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingRole, setDraggingRole] = useState<Role | null>(null)
  const [dragPosition, setDragPosition] = useState<Position | null>(null) // Local visual position during drag
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const didDragRef = useRef(false) // Track if actual drag movement occurred (to suppress click)
  const arrowDragOffsetRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const arrowRafRef = useRef<number | null>(null)
  const arrowLastUpdateRef = useRef<number>(0)
  const lastUpdateRef = useRef<number>(0)
  const positionAnimationRef = useRef<AnimationPlaybackControls | null>(null)
  const onPositionChangeRef = useRef(onPositionChange)
  const onAwayPositionChangeRef = useRef(onAwayPositionChange)

  // Away player dragging state (separate from home team)
  const [draggingAwayRole, setDraggingAwayRole] = useState<Role | null>(null)
  const [dragAwayPosition, setDragAwayPosition] = useState<Position | null>(null)
  const awayDragOffsetRef = useRef({ x: 0, y: 0 })
  const awayRafRef = useRef<number | null>(null)
  const awayLastUpdateRef = useRef<number>(0)

  // Attack ball dragging state (for whiteboard defense phase)
  const [draggingAttackBall, setDraggingAttackBall] = useState(false)
  const [attackBallDragPosition, setAttackBallDragPosition] = useState<Position | null>(null)
  const attackBallRafRef = useRef<number | null>(null)
  const attackBallLastUpdateRef = useRef<number>(0)
  const onAttackBallChangeRef = useRef(onAttackBallChange)

  // Keep refs in sync
  useEffect(() => {
    onAttackBallChangeRef.current = onAttackBallChange
  }, [onAttackBallChange])

  // Normalize base order once for consistent use throughout the component
  const resolvedBaseOrder = normalizeBaseOrder(baseOrder)

  // Determine which MB is being replaced by libero (if enabled)
  const replacedMB = showLibero && rotation ? getBackRowMiddle(rotation, resolvedBaseOrder) : null

  // Get the active roles (excludes libero when disabled, excludes replaced MB when libero is enabled)
  const activeRoles = getActiveRoles(showLibero, rotation, resolvedBaseOrder)

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
  const [hoveredArrowRole, setHoveredArrowRole] = useState<Role | null>(null) // Hovered arrow (for curve handle)
  const [tappedRole, setTappedRole] = useState<Role | null>(null) // For mobile tap-to-reveal arrow tip
  // Arrow preview animation state
  const [previewProgress, setPreviewProgress] = useState<Partial<Record<Role, number>>>({})
  const previewAnimationRef = useRef<Partial<Record<Role, AnimationPlaybackControls>>>({})
  const hoverDelayRef = useRef<Partial<Record<Role, NodeJS.Timeout>>>({})
  const hoveredZonesRef = useRef<Partial<Record<Role, Set<string>>>>({})
  const [showArrows, setShowArrows] = useState<boolean>(true)
  const arrowTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Long-press state for mobile arrow drawing
  const [longPressRole, setLongPressRole] = useState<Role | null>(null)
  const [longPressSvgPos, setLongPressSvgPos] = useState<{ x: number; y: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTouchStartRef = useRef<{ x: number; y: number; role: Role } | null>(null)
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

  const movementCfg = useMemo(() => ({
    speed: 0.7,
    acceleration: 2.4,
    cornerSlowdown: 0.1,
    curveStrength: 0.35,
    collisionRadius: animationConfig?.collisionRadius ?? 0.1,
    deflectionStrength: 0.4,
    lookAheadTime: 0.4,
  }), [animationConfig?.collisionRadius])

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

  // Arrow preview extend/retract with zone-aware hover tracking.
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
      // Entering a zone — ensure the arrow is extending / extended

      // Stop any running animation (e.g. a retraction in progress)
      if (previewAnimationRef.current[role]) {
        stopAnimation(previewAnimationRef.current[role])
        delete previewAnimationRef.current[role]
      }

      if (zone === 'arrow') {
        // Arrow zone: snap to full extension immediately
        setHoveredRole(role)
        setPreviewProgress(prev => ({ ...prev, [role]: 1 }))
      } else {
        // Token zone: 80ms delay then animate (prevents flicker on quick passes)
        hoverDelayRef.current[role] = setTimeout(() => {
          delete hoverDelayRef.current[role]
          setHoveredRole(role)
          const currentProgress = previewProgress[role] ?? 0
          previewAnimationRef.current[role] = animate(currentProgress, 1, {
            duration: 0.2,
            ease: [0.0, 0.0, 0.2, 1],
            onUpdate: (value) => setPreviewProgress(prev => ({ ...prev, [role]: value })),
            onComplete: () => { delete previewAnimationRef.current[role] }
          })
        }, 80)
      }
    } else if (!anyZoneHovered) {
      // All zones left — retract after a short grace period
      // (covers the gap when cursor moves between token and arrow)
      hoverDelayRef.current[role] = setTimeout(() => {
        delete hoverDelayRef.current[role]
        // Stop any running animation
        if (previewAnimationRef.current[role]) {
          stopAnimation(previewAnimationRef.current[role])
          delete previewAnimationRef.current[role]
        }
        setHoveredRole(null)
        const currentProgress = previewProgress[role] ?? 0
        previewAnimationRef.current[role] = animate(currentProgress, 0, {
          duration: 0.12,
          ease: [0.4, 0.0, 1, 1],
          onUpdate: (value) => setPreviewProgress(prev => ({ ...prev, [role]: value })),
          onComplete: () => {
            delete previewAnimationRef.current[role]
            setPreviewProgress(prev => {
              const next = { ...prev }
              delete next[role]
              return next
            })
          }
        })
      }, 150)
    }
    // else: leaving one zone while another is still hovered → do nothing, arrow stays
  }, [previewProgress])

  // Cleanup animation refs on unmount
  useEffect(() => {
    return () => {
      Object.values(previewAnimationRef.current).forEach(anim => {
        if (anim) stopAnimation(anim)
      })
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
  const playStartPositionsRef = useRef<PositionCoordinates | null>(null)
  const playAnimRef = useRef<Partial<Record<Role, PlayAnimState>>>({})
  const playLastFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPreviewingMovement) {
      setPlayedPositions(null)
      playLockedPathsRef.current = {}
      playStartPositionsRef.current = null
      if (bezierRafRef.current) {
        cancelAnimationFrame(bezierRafRef.current)
        bezierRafRef.current = null
      }
      playLastFrameRef.current = null
      setIsBezierAnimating(false)
    }
  }, [isPreviewingMovement])

  // Compute preview positions (at arrow endpoints) for when preview mode is active
  const previewPositions = useMemo(() => {
    const preview = { ...collisionFreePositions }
    for (const role of activeRoles) {
      const arrowEnd = arrows[role]
      if (arrowEnd) {
        preview[role] = arrowEnd
      }
    }
    return resolveCollisions(preview)
  }, [collisionFreePositions, arrows, activeRoles, resolveCollisions])

  // Display positions: during animation use animatedPositions,
  // in preview mode use previewPositions, otherwise use collisionFreePositions
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

  const showDebugOverlay = debugOverlay || debugHitboxes
  const displaySource = isBezierAnimating
    ? 'bezier'
    : (isPreviewingMovement ? (playedPositions ? 'played' : 'animated') : (animationMode === 'raf' ? 'animated' : 'collision'))
  const fmt = (value?: number, digits = 2) => (
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'
  )

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

  // Track previous animation trigger for detecting when Play is pressed
  const prevAnimationTriggerRef = useRef<number>(animationTrigger)
  const prevPreviewRef = useRef<boolean>(isPreviewingMovement)

  // Ref for RAF animation
  const bezierRafRef = useRef<number | null>(null)

  const clampWithMargin = useCallback((pos: Position): Position => {
    const margin = 0.15
    return {
      x: Math.max(-margin, Math.min(1 + margin, pos.x)),
      y: Math.max(-margin, Math.min(1 + margin, pos.y)),
    }
  }, [])

  const getBezierPoint = useCallback((start: Position, control: Position | null, end: Position, t: number): Position => {
    if (!control) {
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      }
    }
    const mt = 1 - t
    return {
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
    }
  }, [])

  const getPathLength = useCallback((start: Position, control: Position | null, end: Position) => {
    const steps = 70
    let length = 0
    let prev = start
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const point = getBezierPoint(start, control, end, t)
      length += Math.hypot(point.x - prev.x, point.y - prev.y)
      prev = point
    }
    return length
  }, [getBezierPoint])

  const getPositionAtDistance = useCallback((
    start: Position,
    control: Position | null,
    end: Position,
    distance: number,
    totalLength: number,
  ): Position => {
    if (totalLength <= 0) return start
    const steps = 90
    let accumulated = 0
    let prev = start

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps
      const point = getBezierPoint(start, control, end, t)
      const segment = Math.hypot(point.x - prev.x, point.y - prev.y)
      if (accumulated + segment >= distance) {
        const segmentT = segment === 0 ? 0 : (distance - accumulated) / segment
        return {
          x: prev.x + (point.x - prev.x) * segmentT,
          y: prev.y + (point.y - prev.y) * segmentT,
        }
      }
      accumulated += segment
      prev = point
    }

    return end
  }, [getBezierPoint])

  const getCurvature = useCallback((start: Position, control: Position | null, end: Position, t: number) => {
    if (!control) return 0
    const x0 = start.x
    const y0 = start.y
    const x1 = control.x
    const y1 = control.y
    const x2 = end.x
    const y2 = end.y

    const oneMinus = 1 - t
    const dx = 2 * oneMinus * (x1 - x0) + 2 * t * (x2 - x1)
    const dy = 2 * oneMinus * (y1 - y0) + 2 * t * (y2 - y1)
    const ddx = 2 * (x2 - 2 * x1 + x0)
    const ddy = 2 * (y2 - 2 * y1 + y0)

    const denom = Math.pow(dx * dx + dy * dy, 1.5)
    if (denom < 1e-6) return 0
    return Math.abs(dx * ddy - dy * ddx) / denom
  }, [])

  // Speed-based movement along locked paths (Play button)
  useEffect(() => {
    const previewJustEnabled = isPreviewingMovement && !prevPreviewRef.current
    prevPreviewRef.current = isPreviewingMovement

    const triggerChanged = animationTrigger !== prevAnimationTriggerRef.current && animationTrigger !== 0
    if (!triggerChanged && !previewJustEnabled) {
      prevAnimationTriggerRef.current = animationTrigger
      return
    }
    prevAnimationTriggerRef.current = animationTrigger

    if (bezierRafRef.current) {
      cancelAnimationFrame(bezierRafRef.current)
      bezierRafRef.current = null
    }

    playLastFrameRef.current = null
    playAnimRef.current = {}
    playLockedPathsRef.current = {}
    setPlayedPositions(null)

    const startPositions = { ...collisionFreePositions }
    playStartPositionsRef.current = startPositions

    const states: Partial<Record<Role, PlayAnimState>> = {}
    const locked: Partial<Record<Role, LockedPath>> = {}

    const getDefaultControl = (start: Position, end: Position): Position | null => {
      const dx = end.x - start.x
      const dy = end.y - start.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.0001) return null

      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
      const perp = { x: -dy / dist, y: dx / dist }
      const center = { x: 0.5, y: 0.75 }
      const vecToCenter = { x: center.x - start.x, y: center.y - start.y }
      const side = Math.sign(dx * vecToCenter.y - dy * vecToCenter.x) || 1
      const bend = movementCfg.curveStrength * dist

      return { x: mid.x + perp.x * bend * side, y: mid.y + perp.y * bend * side }
    }

    activeRoles.forEach(role => {
      const arrowEnd = arrows[role]
      if (!arrowEnd) return

      const start = startPositions[role] || { x: 0.5, y: 0.5 }
      const control = arrowCurves[role] || getDefaultControl(start, arrowEnd)
      const length = getPathLength(start, control, arrowEnd)
      if (length <= 0) return

      states[role] = {
        role,
        start,
        end: arrowEnd,
        control,
        length,
        distance: 0,
        currentSpeed: 0,
        targetSpeed: movementCfg.speed,
        offset: { x: 0, y: 0 },
        offsetVel: { x: 0, y: 0 },
        done: false,
      }

      locked[role] = { start, end: arrowEnd, control }
    })

    if (Object.keys(states).length === 0) {
      return
    }

    playAnimRef.current = states
    playLockedPathsRef.current = locked
    setAnimatedPositions(startPositions)
    setIsBezierAnimating(true)

    const tick = (now: number) => {
      if (playLastFrameRef.current === null) {
        playLastFrameRef.current = now
      }
      const dt = Math.min((now - playLastFrameRef.current) / 1000, 0.05)
      playLastFrameRef.current = now

      const nextPositions: PositionCoordinates = { ...animatedPositionsRef.current }
      const statesNow = playAnimRef.current

      activeRoles.forEach(role => {
        const state = statesNow[role]
        if (!state || state.done) return

        let targetSpeed = movementCfg.speed
        const remainingDistance = state.length - state.distance
        const stoppingDistance = (state.currentSpeed * state.currentSpeed) / Math.max(0.0001, movementCfg.acceleration * 2)
        const lookAheadDistance = Math.min(
          state.currentSpeed * movementCfg.lookAheadTime,
          remainingDistance,
          stoppingDistance + movementCfg.collisionRadius * 2
        )

        const t = state.length > 0 ? Math.min(state.distance / state.length, 1) : 0
        const curvature = getCurvature(state.start, state.control, state.end, t)
        if (curvature > 0 && movementCfg.cornerSlowdown > 0) {
          const curveSlow = 1 / (1 + curvature * movementCfg.cornerSlowdown * 0.4)
          targetSpeed = Math.min(targetSpeed, movementCfg.speed * curveSlow)
        }

        const endEase = Math.min(1, remainingDistance / Math.max(movementCfg.collisionRadius * 2, 0.001))
        targetSpeed = Math.min(targetSpeed, Math.max(movementCfg.speed * 0.2, movementCfg.speed * endEase))

        for (const otherRole of activeRoles) {
          if (otherRole === role) continue
          const otherPriority = ROLE_PRIORITY[otherRole] ?? 99
          const selfPriority = ROLE_PRIORITY[role] ?? 99
          if (otherPriority > selfPriority) continue

          const otherPos = nextPositions[otherRole]
          if (!otherPos) continue

          const selfPos = nextPositions[role] ?? state.start
          const dx = otherPos.x - selfPos.x
          const dy = otherPos.y - selfPos.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < movementCfg.collisionRadius * 1.2) {
            const urgency = 1 - dist / (movementCfg.collisionRadius * 1.2)
            const reduced = movementCfg.speed * (1 - urgency * 0.7)
            targetSpeed = Math.min(targetSpeed, Math.max(movementCfg.speed * 0.2, reduced))
          }

          const futurePos = getPositionAtDistance(
            state.start,
            state.control,
            state.end,
            Math.min(state.distance + lookAheadDistance, state.length),
            state.length
          )
          const futureDx = futurePos.x - otherPos.x
          const futureDy = futurePos.y - otherPos.y
          const futureDist = Math.sqrt(futureDx * futureDx + futureDy * futureDy)
          if (futureDist < movementCfg.collisionRadius * 0.9 && remainingDistance <= lookAheadDistance + movementCfg.collisionRadius) {
            targetSpeed = Math.min(targetSpeed, movementCfg.speed * 0.35)
          }
        }

        const speedDiff = targetSpeed - state.currentSpeed
        const maxChange = movementCfg.acceleration * dt
        if (Math.abs(speedDiff) <= maxChange) {
          state.currentSpeed = targetSpeed
        } else if (speedDiff > 0) {
          state.currentSpeed += maxChange
        } else {
          state.currentSpeed -= maxChange
        }

        state.distance = Math.min(state.distance + state.currentSpeed * dt, state.length)
        if (state.distance >= state.length) {
          state.done = true
        }

        const basePos = getPositionAtDistance(state.start, state.control, state.end, state.distance, state.length)
        let finalPos = basePos

        if (movementCfg.deflectionStrength > 0) {
          let avoidX = 0
          let avoidY = 0
          const selfPriority = ROLE_PRIORITY[role] ?? 99
          const futurePos = getPositionAtDistance(
            state.start,
            state.control,
            state.end,
            Math.min(state.distance + lookAheadDistance, state.length),
            state.length,
          )

          for (const otherRole of activeRoles) {
            if (otherRole === role) continue
            const otherPriority = ROLE_PRIORITY[otherRole] ?? 99
            if (otherPriority > selfPriority) continue

            const otherPos = nextPositions[otherRole]
            if (!otherPos) continue

            const dx = basePos.x - otherPos.x
            const dy = basePos.y - otherPos.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.0001) continue

            if (dist < movementCfg.collisionRadius * 2.2) {
              let push = (movementCfg.collisionRadius * 2.2 - dist) / (movementCfg.collisionRadius * 2.2)
              const futureDx = futurePos.x - otherPos.x
              const futureDy = futurePos.y - otherPos.y
              const futureDist = Math.sqrt(futureDx * futureDx + futureDy * futureDy)
              if (futureDist < movementCfg.collisionRadius * 1.6) {
                push *= 1.3
              }

              const weight = otherPriority < selfPriority ? 1 : 0.7
              avoidX += (dx / dist) * push * weight
              avoidY += (dy / dist) * push * weight
            }
          }

          const desiredOffset = {
            x: avoidX * movementCfg.deflectionStrength * movementCfg.collisionRadius * endEase,
            y: avoidY * movementCfg.deflectionStrength * movementCfg.collisionRadius * endEase,
          }

          const spring = 12
          const damping = 7
          state.offsetVel.x += (desiredOffset.x - state.offset.x) * spring * dt
          state.offsetVel.y += (desiredOffset.y - state.offset.y) * spring * dt
          state.offsetVel.x *= Math.max(0, 1 - damping * dt)
          state.offsetVel.y *= Math.max(0, 1 - damping * dt)

          state.offset.x += state.offsetVel.x * dt
          state.offset.y += state.offsetVel.y * dt

          const maxOffset = movementCfg.collisionRadius * 1.6
          const offsetLen = Math.hypot(state.offset.x, state.offset.y)
          if (offsetLen > maxOffset) {
            state.offset.x = (state.offset.x / offsetLen) * maxOffset
            state.offset.y = (state.offset.y / offsetLen) * maxOffset
          }

          finalPos = clampWithMargin({
            x: basePos.x + state.offset.x,
            y: basePos.y + state.offset.y,
          })
        }

        nextPositions[role] = finalPos
      })

      setAnimatedPositions(nextPositions)
      animatedPositionsRef.current = nextPositions

      const allDone = activeRoles.every(role => {
        const state = statesNow[role]
        return !state || state.done
      })

      if (allDone) {
        setIsBezierAnimating(false)
        setPlayedPositions(nextPositions)
        playLastFrameRef.current = null
        bezierRafRef.current = null
        setAnimatedPositions(nextPositions)
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
      setIsBezierAnimating(false)
    }
  }, [
    animationTrigger,
    isPreviewingMovement,
    collisionFreePositions,
    arrows,
    arrowCurves,
    activeRoles,
    clampWithMargin,
    getCurvature,
    getPathLength,
    getPositionAtDistance,
    movementCfg,
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
  const hideAmount = courtHeight * hideFraction
  const vbY = hideAmount
  const vbH = viewBoxHeight - hideAmount

  // Throttle state updates to parent (every 50ms during drag)
  const THROTTLE_MS = 50

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
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
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
  }, [])

  // Handle court tap when primed - creates arrow to tap location
  const handlePrimedCourtTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!primedRole || !onArrowChange) return

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

    // Final update on drag end
    if (draggingRole && dragPosition && onPositionChangeRef.current) {
      onPositionChangeRef.current(draggingRole, dragPosition)
    }

    setDraggingRole(null)
    setDragPosition(null)
  }, [draggingRole, dragPosition])

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

    setDraggingRole(role)

    // Immediately hide any arrow preview when drag starts
    setHoveredRole(null)
    setPreviewProgress({})

    dragOffsetRef.current = {
      x: currentPos.x - pos.x,
      y: currentPos.y - pos.y
    }
    setDragPosition(null) // Reset drag position
    didDragRef.current = false // Reset drag tracking
    lastUpdateRef.current = Date.now()

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Smooth drag handler using requestAnimationFrame
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault() // Prevent scrolling on mobile
      didDragRef.current = true // Mark that actual drag movement occurred

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
        setDragPosition(normalizedPos)

        // Throttle state updates to parent
        const now = Date.now()
        if (now - lastUpdateRef.current >= THROTTLE_MS) {
          if (onPositionChangeRef.current) {
            onPositionChangeRef.current(role, normalizedPos)
          }
          lastUpdateRef.current = now
        }
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

    // Prevent page scroll during drag
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    // Initialize with preview position for seamless transition (no visual jump)
    if (initialEndSvg) {
      const normalizedEnd = toNormalizedCoords(initialEndSvg.x, initialEndSvg.y)
      setArrowDragPosition(normalizedEnd)
      onArrowChange(role, normalizedEnd)
    }

    // Initialize curve to match preview
    if (initialControlSvg && onArrowCurveChange) {
      const normalizedControl = toNormalizedCoords(initialControlSvg.x, initialControlSvg.y)
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

        // Update both state and ref (ref is needed for handleEnd closure)
        setIsDraggingOffCourt(prev => ({ ...prev, [role]: isOffCourt }))
        isDraggingOffCourtRef.current[role] = isOffCourt

        const normalizedPos = toNormalizedCoords(pos.x, pos.y)

        // Always update visual position immediately for smooth feedback
        setArrowDragPosition(normalizedPos)

        // Throttle state updates to parent (matches player drag throttle rate)
        const now = Date.now()
        if (!isOffCourt && now - arrowLastUpdateRef.current >= THROTTLE_MS) {
          onArrowChange(role, normalizedPos)
          arrowLastUpdateRef.current = now
        }
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
      }

      // On mobile, show the curve handle after dragging an arrow (unless deleted)
      if (isMobile && !wasOffCourt) {
        setTappedRole(role)
      }

      // Reset throttle timer for next drag
      arrowLastUpdateRef.current = 0

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
  }, [onArrowChange, onArrowCurveChange, getEventPosition, toNormalizedCoords, isDraggingOffCourt, incrementDragCount, isMobile])

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

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault()

      // Use shared coordinate conversion (screen → SVG → normalized)
      const svgPos = getEventPosition(moveEvent)
      const desiredMidpoint = toNormalizedCoords(svgPos.x, svgPos.y)

      // For a quadratic bezier, midpoint at t=0.5 is: 0.25*start + 0.5*control + 0.25*end
      // To make the midpoint appear at the mouse position, we need to solve for control:
      // control = 2*midpoint - 0.5*start - 0.5*end
      const controlX = 2 * desiredMidpoint.x - 0.5 * startPos.x - 0.5 * endPos.x
      const controlY = 2 * desiredMidpoint.y - 0.5 * startPos.y - 0.5 * endPos.y

      // Clamp control point to court bounds (with some margin)
      const clampedControlX = Math.max(-0.5, Math.min(1.5, controlX))
      const clampedControlY = Math.max(-0.2, Math.min(1.2, controlY))

      onArrowCurveChange(role, { x: clampedControlX, y: clampedControlY })
    }

    const handleEnd = () => {
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
  }, [onArrowCurveChange, positions, arrows, getEventPosition])

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
    let hasStartedDrag = false

    const handleMove = (ev: TouchEvent) => {
      const currentTouch = ev.touches[0]
      const dx = currentTouch.clientX - startX
      const dy = currentTouch.clientY - startY
      const distance = Math.sqrt(dx * dx + dy * dy)

      // If finger moved past threshold, start player drag
      if (distance > MOVE_THRESHOLD && !hasStartedDrag) {
        hasStartedDrag = true

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

      // If we didn't start a drag, open the context menu (bottom sheet)
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
  ])

  // Handle away player drag end
  const handleAwayDragEnd = useCallback(() => {
    if (awayRafRef.current) {
      cancelAnimationFrame(awayRafRef.current)
      awayRafRef.current = null
    }

    // Final update on drag end
    if (draggingAwayRole && dragAwayPosition && onAwayPositionChangeRef.current) {
      onAwayPositionChangeRef.current(draggingAwayRole, dragAwayPosition)
    }

    setDraggingAwayRole(null)
    setDragAwayPosition(null)
  }, [draggingAwayRole, dragAwayPosition])

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

    setDraggingAwayRole(role)
    awayDragOffsetRef.current = {
      x: currentPos.x - pos.x,
      y: currentPos.y - pos.y
    }
    setDragAwayPosition(null)
    awayLastUpdateRef.current = Date.now()

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
        setDragAwayPosition(normalizedPos)

        // Throttle state updates to parent
        const now = Date.now()
        if (now - awayLastUpdateRef.current >= THROTTLE_MS) {
          if (onAwayPositionChangeRef.current) {
            onAwayPositionChangeRef.current(role, normalizedPos)
          }
          awayLastUpdateRef.current = now
        }
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
    if (!draggingAttackBall) return

    const finalPosition = attackBallDragPosition
    if (finalPosition && onAttackBallChangeRef.current) {
      onAttackBallChangeRef.current(finalPosition)
    }

    setDraggingAttackBall(false)
    setAttackBallDragPosition(null)
  }, [draggingAttackBall, attackBallDragPosition])

  // Handle attack ball drag start
  const handleAttackBallDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'whiteboard' || currentPhase !== 'DEFENSE_PHASE') return
    if (!onAttackBallChangeRef.current) return

    // Note: Don't call preventDefault on touch events here - it causes passive event listener warnings
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    setDraggingAttackBall(true)
    attackBallLastUpdateRef.current = Date.now()

    // If no attack ball position, create one at default location
    const currentBallPos = attackBallPosition || DEFAULT_ATTACK_BALL_POSITION
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
        setAttackBallDragPosition(normalizedPos)

        // Throttle state updates to parent
        const now = Date.now()
        if (now - attackBallLastUpdateRef.current >= THROTTLE_MS) {
          if (onAttackBallChangeRef.current) {
            onAttackBallChangeRef.current(normalizedPos)
          }
          attackBallLastUpdateRef.current = now
        }
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
      className="relative w-full h-full flex items-center justify-center"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {showDebugOverlay && (
        <div className="pointer-events-none absolute left-3 top-3 z-50 max-h-[70%] max-w-[340px] overflow-auto rounded-md bg-black/70 px-2.5 py-2 font-mono text-[11px] leading-snug text-white shadow">
          <div className="text-white/80">debug overlay</div>
          <div>mode {mode} anim {animationMode} display {displaySource}</div>
          <div>bezier {isBezierAnimating ? 'on' : 'off'} preview {isPreviewingMovement ? 'on' : 'off'} played {playedPositions ? 'yes' : 'no'}</div>
          <div>trigger {animationTrigger} raf {bezierRafRef.current ? 'on' : 'off'} last {fmt(playLastFrameRef.current ?? undefined, 0)}</div>
          <div>drag {draggingRole ?? '-'} arrow {draggingArrowRole ?? '-'} curve {draggingCurveRole ?? '-'}</div>
          <div>cfg sp {fmt(movementCfg.speed)} acc {fmt(movementCfg.acceleration)} corner {fmt(movementCfg.cornerSlowdown)} curve {fmt(movementCfg.curveStrength)}</div>
          <div>coll r {fmt(movementCfg.collisionRadius)} defl {fmt(movementCfg.deflectionStrength)} look {fmt(movementCfg.lookAheadTime)}</div>
          <div className="mt-1 border-t border-white/20 pt-1">roles</div>
          {activeRoles.map((role) => {
            const anim = playAnimRef.current[role]
            const locked = playLockedPathsRef.current[role]
            const progress = anim && anim.length > 0 ? anim.distance / anim.length : 0
            return (
              <div key={role}>
                {role}: {locked ? 'lock' : 'free'} {anim?.done ? 'done' : 'move'} t {fmt(progress)} v {fmt(anim?.currentSpeed)}→{fmt(anim?.targetSpeed)}
              </div>
            )
          })}
        </div>
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
        {/* Padding area background - covers entire viewBox area */}
        <rect
          x={0}
          y={vbY}
          width={viewBoxWidth}
          height={vbH}
          fill="currentColor"
          opacity="0.05"
          className="text-foreground"
        />

        {/* Drop zone overlay - shows during arrow drag to teach delete gesture */}
        <DropZoneOverlay
          visible={draggingArrowRole !== null}
          isOverDropZone={draggingArrowRole ? (isDraggingOffCourt[draggingArrowRole] ?? false) : false}
          courtWidth={courtWidth}
          courtHeight={courtHeight}
          padding={padding}
        />

        {/* Court background and lines */}
        <g transform={`translate(${padding}, ${padding})`}>
          <CourtGrid
            width={courtWidth}
            height={courtHeight}
            showZones={showZones}
            rotation={rotation}
            baseOrder={resolvedBaseOrder}
            fullCourt={true}
          />

          {/* Lines connecting players to their home zone tags - rendered after background but before zone labels */}
          {/* Hide when: animating, or any arrows exist (movement planned makes zone lines confusing) */}
          {showZones && rotation && !isBezierAnimating && !Object.values(arrows).some(Boolean) && (
            <g>
              {activeRoles.map(role => {
                // Libero inherits the zone from the MB they're replacing
                const zoneRole = (role === 'L' && replacedMB) ? replacedMB : role
                const zone = getRoleZone(rotation, zoneRole, resolvedBaseOrder)
                const playerPos = displayPositions[role]

                // Skip if position is not available
                if (!playerPos) return null

                // Player center position (convert from normalized to court coordinates, no padding since we're inside transform)
                const playerCenterX = playerPos.x * courtWidth
                const playerCenterY = playerPos.y * courtHeight

                // Zone label positions (synchronized with CourtGrid.tsx)
                const zoneLabelPositions: Record<number, { x: number; y: number }> = {
                  1: { x: courtWidth * 0.8333, y: courtHeight * 0.8333 }, // Back right
                  2: { x: courtWidth * 0.8333, y: courtHeight * 0.5833 }, // Front right
                  3: { x: courtWidth * 0.5000, y: courtHeight * 0.5833 }, // Front center
                  4: { x: courtWidth * 0.1667, y: courtHeight * 0.5833 }, // Front left
                  5: { x: courtWidth * 0.1667, y: courtHeight * 0.8333 }, // Back left
                  6: { x: courtWidth * 0.5000, y: courtHeight * 0.8333 }, // Back center
                }

                const zonePos = zoneLabelPositions[zone]
                if (!zonePos) return null

                return (
                  <line
                    key={role}
                    x1={playerCenterX}
                    y1={playerCenterY}
                    x2={zonePos.x}
                    y2={zonePos.y}
                    stroke={lineColor}
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={0.3}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })}
            </g>
          )}
        </g>

        {/* Legality violation indicators - outside transform group to match player token coordinates */}
        {/* Hide during animation since positions are changing */}
        {legalityViolations.length > 0 && mode === 'whiteboard' && !isBezierAnimating && (
          <>
            {/* Draw violation lines */}
            {legalityViolations.map((violation, idx) => {
              if (!violation.roles) return null
              const [role1, role2] = violation.roles
              const pos1 = displayPositions[role1]
              const pos2 = displayPositions[role2]
              if (!pos1 || !pos2) return null

              const svgPos1 = toSvgCoords(pos1)
              const svgPos2 = toSvgCoords(pos2)

              return (
                <line
                  key={`line-${idx}`}
                  x1={svgPos1.x}
                  y1={svgPos1.y}
                  x2={svgPos2.x}
                  y2={svgPos2.y}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  opacity={0.6}
                />
              )
            })}

          </>
        )}

        {/* Next-step arrows - rendered FIRST so they appear below players */}
        {activeRoles.map(role => {
          const hasHomePosition = displayPositions[role] !== undefined
          if (mode === 'simulation' && !hasHomePosition) return null

          const lockedPath = (isBezierAnimating || isPreviewingMovement) ? playLockedPathsRef.current[role] : null
          const basePosForArrow = lockedPath?.start || displayPositions[role] || { x: 0.5, y: 0.75 }
          const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : basePosForArrow)

          // Arrows only for home team in whiteboard mode
          const activeArrowTarget = draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role]
          const defaultHandleSvg = { x: homeSvgPos.x, y: Math.max(12, homeSvgPos.y - 28) }
          const arrowEndPos = lockedPath?.end ?? activeArrowTarget
          const arrowEndSvg = arrowEndPos ? toSvgCoords(arrowEndPos) : defaultHandleSvg

          // Get the control point for the arrow curve
          // If user has set a control point, use it directly
          // Otherwise, auto-calculate the best curve
          const curveConfig = arrowCurves[role]
          const pickBestControl = () => {
            if (!activeArrowTarget) return null

            // If user has manually set a control point, use it directly
            if (lockedPath?.control) {
              return { x: lockedPath.control.x, y: lockedPath.control.y }
            }
            if (curveConfig) {
              return { x: curveConfig.x, y: curveConfig.y }
            }

            const startPct = draggingRole === role && dragPosition ? dragPosition : basePosForArrow
            const endPct = activeArrowTarget
            const dx = endPct.x - startPct.x
            const dy = endPct.y - startPct.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.0001) return null

            const dirX = dx / dist
            const dirY = dy / dist
            const perp = { x: -dirY, y: dirX }
            const mid = { x: (startPct.x + endPct.x) / 2, y: (startPct.y + endPct.y) / 2 }

            // Auto-calculate: choose best curve based on avoiding other players
            const bend = Math.min(0.2, dist * 0.35) // Default bend
            const candidates: ({ control: { x: number; y: number } | null; side: 'left' | 'right' | 'straight' })[] = [
              { control: null, side: 'straight' },
              { control: { x: mid.x + perp.x * bend, y: mid.y + perp.y * bend }, side: 'left' },
              { control: { x: mid.x - perp.x * bend, y: mid.y - perp.y * bend }, side: 'right' },
            ]

            const others = ROLES
              .filter(r => r !== role)
              .map(r => displayPositions[r])
              .filter((pos): pos is { x: number; y: number } => pos !== undefined)

            const center = { x: 0.5, y: 0.75 } // Center of home half
            const vecToCenter = { x: center.x - startPct.x, y: center.y - startPct.y }
            const centerSide = Math.sign(dirX * vecToCenter.y - dirY * vecToCenter.x) || 0

            const samplePoint = (t: number, control: { x: number; y: number } | null) => {
              if (!control) {
                return {
                  x: startPct.x + (endPct.x - startPct.x) * t,
                  y: startPct.y + (endPct.y - startPct.y) * t,
                }
              }
              const oneMinusT = 1 - t
              return {
                x: oneMinusT * oneMinusT * startPct.x + 2 * oneMinusT * t * control.x + t * t * endPct.x,
                y: oneMinusT * oneMinusT * startPct.y + 2 * oneMinusT * t * control.y + t * t * endPct.y,
              }
            }

            const scoreCandidate = (candidate: (typeof candidates)[number]) => {
              let minDist = Number.POSITIVE_INFINITY
              for (let i = 0; i <= 10; i++) {
                const t = i / 10
                const p = samplePoint(t, candidate.control)
                for (const other of others) {
                  const d = Math.hypot(p.x - other.x, p.y - other.y)
                  if (d < minDist) minDist = d
                }
              }

              // Bonus if concave side faces court center
              const candidateSide = candidate.control
                ? Math.sign(dirX * (candidate.control.y - startPct.y) - dirY * (candidate.control.x - startPct.x)) || 0
                : 0
              const concaveBonus = centerSide !== 0 && candidateSide === centerSide ? 5 : 0

              // Slight preference for straight if very short
              const straightBonus = !candidate.control && dist < 0.08 ? 2 : 0

              return minDist + concaveBonus + straightBonus
            }

            let best = candidates[0]
            let bestScore = scoreCandidate(best)
            for (let i = 1; i < candidates.length; i++) {
              const s = scoreCandidate(candidates[i])
              if (s > bestScore) {
                best = candidates[i]
                bestScore = s
              }
            }

            return best.control
          }

          const chosenControl = pickBestControl()

          // Guard against NaN values in control point
          const validControl = chosenControl &&
            !isNaN(chosenControl.x) && !isNaN(chosenControl.y)
            ? chosenControl : null

          // Show curve handle when arrow is hovered/selected (PC: arrow hover, Mobile: tap)
          const showCurveHandleForRole = !!(activeArrowTarget && (
            (isMobile && tappedRole === role) ||
            (!isMobile && hoveredArrowRole === role) ||
            draggingCurveRole === role
          ))

          // Guard against NaN values in positions
          const hasValidPositions = activeArrowTarget &&
            !isNaN(homeSvgPos.x) && !isNaN(homeSvgPos.y) &&
            !isNaN(arrowEndSvg.x) && !isNaN(arrowEndSvg.y)

          const arrowPath = hasValidPositions ? (
            <g key={`arrow-${role}`} style={{
              transition: showArrows ? `opacity ${cfg.durationMs}ms ${cfg.easingCss}` : 'none',
              opacity: showArrows ? 1 : 0
            }}>
              <MovementArrow
                start={{ x: homeSvgPos.x, y: homeSvgPos.y }}
                end={arrowEndSvg}
                control={validControl ? toSvgCoords(validControl) : null}
                color={ROLE_INFO[role].color}
                strokeWidth={3}
                opacity={0.85}
                isDraggable={true}
                onDragStart={(e) => handleArrowDragStart(role, e)}
                showCurveHandle={false}
                onCurveDragStart={onArrowCurveChange ? (e) => handleCurveDragStart(role, e) : undefined}
                onMouseEnter={() => setHoveredArrowRole(role)}
                onMouseLeave={() => setHoveredArrowRole(null)}
                debugHitboxes={debugHitboxes}
              />
            </g>
          ) : null

          return (
            <g key={`arrows-${role}`}>
              {arrowPath}
            </g>
          )
        })}

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

          // Arrow preview (hover-revealed for new arrows) - uses same MovementArrow as final arrows
          // Direction: peeks toward court center (left if player on right, right if player on left)
          const isLeftSide = homeBasePos.x > 0.5

          // Calculate token radius for arrow positioning
          const hasAssignedPlayer = playerInfo.name !== undefined || playerInfo.number !== undefined
          const isPositionOnlyMode = showPosition && (!showPlayer || !hasAssignedPlayer)
          const baseTokenSize = isPositionOnlyMode ? 56 : 48
          const actualTokenRadius = Math.max(baseTokenSize * tokenScale, 48) / 2

          // Animation progress for this role's preview (0 = retracted, 1 = fully extended)
          const rolePreviewProgress = previewProgress[role] ?? 0
          // Show preview when: animating OR (actively dragging from preview) OR (mobile tapped)
          // Also need no existing arrow (unless we're dragging from it)
          // HIDE preview when any player token is being dragged
          const canShowPreview = (!arrows[role] || draggingArrowRole === role) && onArrowChange && !draggingRole
          const shouldRenderPreview = canShowPreview && (
            rolePreviewProgress > 0 ||
            draggingArrowRole === role ||
            (isMobile && tappedRole === role)
          )
          // Hide preview visually once arrow exists (but keep in DOM for touch continuity)
          const hidePreviewDuringDrag = draggingArrowRole === role && arrows[role]

          // Preview geometry - slight upward curve peeking past token edge
          // Interpolate peek distance based on animation progress
          const maxPeekDistance = 28  // How far past token edge at full extension
          const maxCurveHeight = 25   // How much the curve bows upward at full extension
          const animatedPeekDistance = maxPeekDistance * rolePreviewProgress
          const animatedCurveHeight = maxCurveHeight * rolePreviewProgress

          // Preview endpoint (past edge, angled slightly up)
          const previewEndSvg = {
            x: homeSvgPos.x + (isLeftSide ? -(actualTokenRadius + animatedPeekDistance) : (actualTokenRadius + animatedPeekDistance)),
            y: homeSvgPos.y - (10 * rolePreviewProgress)  // Slightly up, animated
          }

          // Control point for upward curve (midpoint pulled up)
          const previewControlSvg = {
            x: (homeSvgPos.x + previewEndSvg.x) / 2,
            y: homeSvgPos.y - animatedCurveHeight
          }

          const arrowPreview = shouldRenderPreview ? (
            <g style={{ opacity: hidePreviewDuringDrag ? 0 : 1 }}>
              <MovementArrow
                key={`preview-${role}`}
                start={homeSvgPos}
                end={previewEndSvg}
                control={previewControlSvg}
                color={ROLE_INFO[role].color}
                strokeWidth={3}
                opacity={0.85}
                isDraggable={true}
                onDragStart={(e) => handleArrowDragStart(role, e, previewEndSvg, previewControlSvg)}
                onMouseEnter={() => !draggingRole && !draggingArrowRole && handlePreviewHover(role, 'arrow', true)}
                onMouseLeave={() => handlePreviewHover(role, 'arrow', false)}
                debugHitboxes={debugHitboxes}
              />
            </g>
          ) : null

          // Render HOME player
          const homePlayerNode = (
            <g key={`home-${role}`}>
              {/* Arrow preview rendered FIRST so it appears behind the player token */}
              {arrowPreview}
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
                    isInViolation={legalityViolations.some(v =>
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

        {/* Curve handles - rendered THIRD so they appear on top of players */}
        {activeRoles.map(role => {
          const hasHomePosition = displayPositions[role] !== undefined
          if (mode === 'simulation' && !hasHomePosition) return null

          const homeBasePos = displayPositions[role] || { x: 0.5, y: 0.75 }
          const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : homeBasePos)

          const activeArrowTarget = draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role]
          if (!activeArrowTarget) return null

          const arrowEndSvg = toSvgCoords(activeArrowTarget)

          // Get the control point for curve calculation
          const curveConfig = arrowCurves[role]
          const getControlPoint = () => {
            if (curveConfig) {
              return toSvgCoords({ x: curveConfig.x, y: curveConfig.y })
            }

            // Auto-calculate control point (simplified version)
            const startPct = draggingRole === role && dragPosition ? dragPosition : homeBasePos
            const endPct = activeArrowTarget
            const dx = endPct.x - startPct.x
            const dy = endPct.y - startPct.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 0.0001) return null

            const dirX = dx / dist
            const dirY = dy / dist
            const perp = { x: -dirY, y: dirX }
            const mid = { x: (startPct.x + endPct.x) / 2, y: (startPct.y + endPct.y) / 2 }

            const bend = Math.min(0.2, dist * 0.35)
            const others = ROLES
              .filter(r => r !== role)
              .map(r => displayPositions[r])
              .filter((pos): pos is { x: number; y: number } => pos !== undefined)

            const center = { x: 0.5, y: 0.75 }
            const vecToCenter = { x: center.x - startPct.x, y: center.y - startPct.y }
            const centerSide = Math.sign(dirX * vecToCenter.y - dirY * vecToCenter.x) || 0

            const candidates: ({ control: { x: number; y: number } | null; side: 'left' | 'right' | 'straight' })[] = [
              { control: null, side: 'straight' },
              { control: { x: mid.x + perp.x * bend, y: mid.y + perp.y * bend }, side: 'left' },
              { control: { x: mid.x - perp.x * bend, y: mid.y - perp.y * bend }, side: 'right' },
            ]

            const samplePoint = (t: number, control: { x: number; y: number } | null) => {
              if (!control) {
                return { x: startPct.x + (endPct.x - startPct.x) * t, y: startPct.y + (endPct.y - startPct.y) * t }
              }
              const oneMinusT = 1 - t
              return {
                x: oneMinusT * oneMinusT * startPct.x + 2 * oneMinusT * t * control.x + t * t * endPct.x,
                y: oneMinusT * oneMinusT * startPct.y + 2 * oneMinusT * t * control.y + t * t * endPct.y,
              }
            }

            const scoreCandidate = (candidate: (typeof candidates)[number]) => {
              let minDist = Number.POSITIVE_INFINITY
              for (let i = 0; i <= 10; i++) {
                const t = i / 10
                const p = samplePoint(t, candidate.control)
                for (const other of others) {
                  const d = Math.hypot(p.x - other.x, p.y - other.y)
                  if (d < minDist) minDist = d
                }
              }
              const candidateSide = candidate.control
                ? Math.sign(dirX * (candidate.control.y - startPct.y) - dirY * (candidate.control.x - startPct.x)) || 0
                : 0
              const concaveBonus = centerSide !== 0 && candidateSide === centerSide ? 5 : 0
              const straightBonus = !candidate.control && dist < 0.08 ? 2 : 0
              return minDist + concaveBonus + straightBonus
            }

            let best = candidates[0]
            let bestScore = scoreCandidate(best)
            for (let i = 1; i < candidates.length; i++) {
              const s = scoreCandidate(candidates[i])
              if (s > bestScore) { best = candidates[i]; bestScore = s }
            }

            return best.control ? toSvgCoords(best.control) : null
          }

          const controlSvg = getControlPoint()

          // Guard against NaN values
          if (isNaN(homeSvgPos.x) || isNaN(homeSvgPos.y) ||
              isNaN(arrowEndSvg.x) || isNaN(arrowEndSvg.y)) {
            return null
          }

          // Calculate curve midpoint (quadratic bezier at t=0.5)
          // Must match the t=0.5 math in handleCurveDragStart so the handle
          // stays directly under the mouse during drag.
          const validControlSvg = controlSvg &&
            !isNaN(controlSvg.x) && !isNaN(controlSvg.y)
            ? controlSvg : null

          const curveMidpoint = validControlSvg
            ? {
                x: 0.25 * homeSvgPos.x + 0.5 * validControlSvg.x + 0.25 * arrowEndSvg.x,
                y: 0.25 * homeSvgPos.y + 0.5 * validControlSvg.y + 0.25 * arrowEndSvg.y
              }
            : {
                x: (homeSvgPos.x + arrowEndSvg.x) / 2,
                y: (homeSvgPos.y + arrowEndSvg.y) / 2
              }

          // Show curve handle when arrow is hovered/selected (PC: arrow hover, Mobile: tap)
          const showCurveHandleForRole = !!(
            (isMobile && tappedRole === role) ||
            (!isMobile && hoveredArrowRole === role) ||
            draggingCurveRole === role
          )

          if (!showCurveHandleForRole || !onArrowCurveChange) return null

          return (
            <g key={`curve-handle-${role}`} style={{
              transition: showArrows ? `opacity ${cfg.durationMs}ms ${cfg.easingCss}` : 'none',
              opacity: showArrows ? 1 : 0
            }}>
              {/* Visual handle */}
              <circle
                cx={curveMidpoint.x}
                cy={curveMidpoint.y}
                r={6}
                fill="rgba(0,0,0,0.5)"
                stroke="white"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
              {/* Inner dot */}
              <circle
                cx={curveMidpoint.x}
                cy={curveMidpoint.y}
                r={2.5}
                fill="white"
                style={{ pointerEvents: 'none' }}
              />
              {/* Invisible hit target for dragging (larger for touch) */}
              <circle
                cx={curveMidpoint.x}
                cy={curveMidpoint.y}
                r={18}
                fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
                stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
                strokeWidth={debugHitboxes ? 2 : 0}
                style={{
                  cursor: 'grab',
                  pointerEvents: 'auto',
                  touchAction: 'none'
                }}
                onMouseEnter={() => setHoveredArrowRole(role)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCurveDragStart(role, e)
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  handleCurveDragStart(role, e)
                }}
              />
            </g>
          )
        })}

        {/* Ball marker for simulation mode - rendered AFTER player tokens to always be on top */}
        {mode === 'simulation' && ballPosition && (() => {
          // Add padding offset since ball is rendered outside the transform group
          const ballX = padding + ballPosition.x * courtWidth
          const groundY = padding + ballPosition.y * courtHeight // Shadow stays at ground position
          // Calculate ball float and shadow based on height
          const normalizedHeight = Math.min(1, Math.max(0, ballHeight * 5)) // Scale for visibility
          const shadowRadius = 8 + normalizedHeight * 12 // Shadow grows with height
          const shadowOpacity = 0.15 + normalizedHeight * 0.1 // Darker when higher
          const ballFloatOffset = normalizedHeight * 15 // Ball floats UP when high
          const visualBallY = groundY - ballFloatOffset // Ball position above shadow
          // Ball size pulses on contact
          const contactScale = ballContactFlash ? 1.3 : 1
          const ballRadius = 10 * contactScale

          return (
            <g className="pointer-events-none">
              {/* Shadow on court (stays at ground, grows when ball is high) */}
              <ellipse
                cx={ballX}
                cy={groundY}
                rx={shadowRadius}
                ry={shadowRadius * 0.5}
                fill={`rgba(0, 0, 0, ${shadowOpacity})`}
                style={{
                  transition: 'all 50ms ease-out',
                }}
              />

              {/* Contact flash effect */}
              {ballContactFlash && (
                <circle
                  cx={ballX}
                  cy={visualBallY}
                  r={25}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth={3}
                  style={{
                    animation: 'ping 0.3s ease-out forwards',
                  }}
                />
              )}

              {/* Outer glow for visibility */}
              <circle
                cx={ballX}
                cy={visualBallY}
                r={ballRadius + 4}
                fill={ballContactFlash ? 'rgba(255, 255, 200, 0.5)' : 'rgba(255, 220, 100, 0.3)'}
                style={{
                  transition: 'all 100ms ease-out',
                }}
              />

              {/* Main ball */}
              <circle
                cx={ballX}
                cy={visualBallY}
                r={ballRadius}
                fill={ballContactFlash ? '#FFEB3B' : '#FFD700'}
                stroke="#fff"
                strokeWidth={2}
                style={{
                  filter: `drop-shadow(0 ${2 + normalizedHeight * 4}px ${4 + normalizedHeight * 6}px rgba(0,0,0,0.4))`,
                  transition: 'all 100ms ease-out',
                }}
              />

              {/* Ball highlight */}
              <circle
                cx={ballX - 2 * contactScale}
                cy={visualBallY - 2 * contactScale}
                r={3 * contactScale}
                fill="rgba(255, 255, 255, 0.6)"
              />

              {/* Secondary highlight for depth */}
              <circle
                cx={ballX + 1 * contactScale}
                cy={visualBallY + 2 * contactScale}
                r={2 * contactScale}
                fill="rgba(200, 150, 0, 0.4)"
              />
            </g>
          )
        })()}

        {/* Attack ball for whiteboard defense phase - rendered AFTER player tokens to appear on top */}
        {mode === 'whiteboard' && currentPhase === 'DEFENSE_PHASE' && (() => {
          const displayPos = attackBallDragPosition || attackBallPosition || DEFAULT_ATTACK_BALL_POSITION
          const ballX = padding + displayPos.x * courtWidth
          const ballY = padding + displayPos.y * courtHeight

          // Determine highlight color based on which side of court (red for enemy side y < 0.5, gold for home side)
          const isEnemySide = displayPos.y < 0.5
          const highlightColor = isEnemySide ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 215, 0, 0.6)'
          const ballRadius = 12

          return (
            <g>
              {/* Render ball if position exists or is being dragged */}
              {(attackBallPosition || draggingAttackBall) ? (
                <>
                  {/* Invisible hit target for dragging (larger area for easier grabbing) */}
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={24}
                    fill={debugHitboxes ? "rgba(57, 255, 20, 0.3)" : "transparent"}
                    stroke={debugHitboxes ? "rgba(57, 255, 20, 0.8)" : "none"}
                    strokeWidth={debugHitboxes ? 2 : 0}
                    style={{
                      cursor: draggingAttackBall ? 'grabbing' : 'grab',
                      pointerEvents: 'auto'
                    }}
                    onMouseDown={handleAttackBallDragStart}
                    onTouchStart={handleAttackBallDragStart}
                  />

                  {/* Colored ring highlight (red for enemy, gold for home) */}
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={ballRadius + 6}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth={3}
                    className="pointer-events-none"
                    style={{
                      filter: `drop-shadow(0 0 8px ${highlightColor})`
                    }}
                  />

                  {/* Outer glow for visibility (gold like simulation ball) */}
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={ballRadius + 4}
                    fill="rgba(255, 220, 100, 0.3)"
                    className="pointer-events-none"
                  />

                  {/* Main ball (gold like simulation ball) */}
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={ballRadius}
                    fill="#FFD700"
                    stroke="#fff"
                    strokeWidth={2}
                    className="pointer-events-none"
                    style={{
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
                    }}
                  />

                  {/* Ball highlight */}
                  <circle
                    cx={ballX - 3}
                    cy={ballY - 3}
                    r={4}
                    fill="rgba(255, 255, 255, 0.6)"
                    className="pointer-events-none"
                  />

                  {/* Secondary highlight for depth */}
                  <circle
                    cx={ballX + 2}
                    cy={ballY + 2}
                    r={2}
                    fill="rgba(200, 150, 0, 0.4)"
                    className="pointer-events-none"
                  />

                  {/* Longer, more prominent directional arrow */}
                  <g className="pointer-events-none">
                    {/* Arrow shaft */}
                    <line
                      x1={ballX}
                      y1={ballY + ballRadius + 2}
                      x2={ballX}
                      y2={ballY + ballRadius + 26}
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    {/* Arrow head - larger and more prominent */}
                    <path
                      d={`M ${ballX - 6} ${ballY + ballRadius + 20} L ${ballX} ${ballY + ballRadius + 28} L ${ballX + 6} ${ballY + ballRadius + 20}`}
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>
                </>
              ) : (
                /* Ghost ball indicator when no ball exists - shows where ball will appear */
                <g>
                  <circle
                    cx={ballX}
                    cy={ballY}
                    r={ballRadius + 4}
                    fill="rgba(255, 215, 0, 0.15)"
                    stroke="rgba(255, 215, 0, 0.4)"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onMouseDown={handleAttackBallDragStart}
                    onTouchStart={handleAttackBallDragStart}
                  />
                  {/* Plus icon */}
                  <text
                    x={ballX}
                    y={ballY}
                    fill="rgba(255, 215, 0, 0.6)"
                    fontSize={16}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    +
                  </text>
                </g>
              )}
            </g>
          )
        })()}

        {/* Legality violation triangles - rendered AFTER player tokens to occlude them */}
        {legalityViolations.length > 0 && mode === 'whiteboard' && (
          <>
            {legalityViolations.map((violation, idx) => {
              if (!violation.roles) return null
              const [role1, role2] = violation.roles
              const pos1 = displayPositions[role1]
              const pos2 = displayPositions[role2]
              if (!pos1 || !pos2) return null

              const svgPos1 = toSvgCoords(pos1)
              const svgPos2 = toSvgCoords(pos2)

              // Calculate midpoint of the line
              const midX = (svgPos1.x + svgPos2.x) / 2
              const midY = (svgPos1.y + svgPos2.y) / 2

              const emojiSize = 20
              const padding = 4

              return (
                <foreignObject
                  key={`violation-emoji-${idx}`}
                  x={midX - emojiSize / 2 - padding}
                  y={midY - emojiSize / 2 - padding}
                  width={emojiSize + padding * 2}
                  height={emojiSize + padding * 2}
                  style={{ pointerEvents: 'auto', overflow: 'visible' }}
                >
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger asChild>
                      <div
                        className="cursor-pointer flex items-center justify-center"
                        style={{
                          width: emojiSize + padding * 2,
                          height: emojiSize + padding * 2,
                          fontSize: emojiSize,
                          lineHeight: 1,
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}
                      >
                        ⚠️
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-auto">
                      <div className="flex flex-col gap-3">
                        <div className="text-sm font-medium">Formation Violation</div>
                        {(() => {
                          const [zone1, zone2] = violation.zones
                          const zone1Role = getRoleForZone(zone1, rotation, resolvedBaseOrder)
                          const zone2Role = getRoleForZone(zone2, rotation, resolvedBaseOrder)
                          const zone1Color = zone1Role ? ROLE_INFO[zone1Role].color : '#9ca3af'
                          const zone2Color = zone2Role ? ROLE_INFO[zone2Role].color : '#9ca3af'
                          const zone1Num = zone1.slice(1)
                          const zone2Num = zone2.slice(1)

                          return (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              {violation.type === 'horizontal_overlap' ? (
                                <>
                                  <Badge
                                    style={{
                                      backgroundColor: zone1Color,
                                      color: zone1Role ? getTextColorForOklch(zone1Color) : undefined,
                                      border: 'none',
                                    }}
                                  >
                                    Zone {zone1Num}
                                  </Badge>
                                  <span>must be to the left of</span>
                                  <Badge
                                    style={{
                                      backgroundColor: zone2Color,
                                      color: zone2Role ? getTextColorForOklch(zone2Color) : undefined,
                                      border: 'none',
                                    }}
                                  >
                                    Zone {zone2Num}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <Badge
                                    style={{
                                      backgroundColor: zone1Color,
                                      color: zone1Role ? getTextColorForOklch(zone1Color) : undefined,
                                      border: 'none',
                                    }}
                                  >
                                    Zone {zone1Num}
                                  </Badge>
                                  <span>must be in front of</span>
                                  <Badge
                                    style={{
                                      backgroundColor: zone2Color,
                                      color: zone2Role ? getTextColorForOklch(zone2Color) : undefined,
                                      border: 'none',
                                    }}
                                  >
                                    Zone {zone2Num}
                                  </Badge>
                                </>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </foreignObject>
              )
            })}
          </>
        )}

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
          onFlipArrow={contextPlayer && onArrowCurveChange ? () => {
            const currentCurve = arrowCurves[contextPlayer]
            const arrowTarget = arrows[contextPlayer]
            const playerPos = displayPositions[contextPlayer]
            if (currentCurve && arrowTarget && playerPos) {
              // Mirror the control point across the arrow's centerline
              const midX = (playerPos.x + arrowTarget.x) / 2
              const midY = (playerPos.y + arrowTarget.y) / 2
              // Reflect control point across the midpoint
              const flippedX = 2 * midX - currentCurve.x
              const flippedY = 2 * midY - currentCurve.y
              onArrowCurveChange(contextPlayer, { x: flippedX, y: flippedY })
            } else if (arrowTarget && playerPos) {
              // No curve set yet - create one by offsetting from midpoint
              const midX = (playerPos.x + arrowTarget.x) / 2
              const midY = (playerPos.y + arrowTarget.y) / 2
              const dx = arrowTarget.x - playerPos.x
              const dy = arrowTarget.y - playerPos.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              const perpX = -dy / dist * 0.1
              const perpY = dx / dist * 0.1
              onArrowCurveChange(contextPlayer, { x: midX + perpX, y: midY + perpY })
            }
          } : undefined}
          hasTeam={hasTeam}
          onManageRoster={onManageRoster}
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

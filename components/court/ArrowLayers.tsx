'use client'

import { motion, useReducedMotion } from 'motion/react'
import { memo } from 'react'
import { MovementArrow } from './MovementArrow'
import { computeDefaultControlPoint } from '@/lib/whiteboard-motion'
import type { ArrowCurveConfig, ArrowPositions, Position, PositionCoordinates, Role } from '@/lib/types'

let arrowLabelMeasureContext: CanvasRenderingContext2D | null = null

function measureArrowLabelWidth(text: string, fontSize: number) {
  if (typeof document === 'undefined') {
    return text.length * fontSize * 0.52
  }

  if (!arrowLabelMeasureContext) {
    const canvas = document.createElement('canvas')
    arrowLabelMeasureContext = canvas.getContext('2d')
  }

  if (!arrowLabelMeasureContext) {
    return text.length * fontSize * 0.52
  }

  arrowLabelMeasureContext.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
  return arrowLabelMeasureContext.measureText(text).width
}

type LockedPath = {
  start: Position
  end: Position
  control: Position | null
}

interface MovementArrowLayerProps {
  activeRoles: Role[]
  displayPositions: PositionCoordinates
  mode: 'whiteboard' | 'simulation'
  isBezierAnimating: boolean
  isPreviewingMovement: boolean
  playLockedPaths: Partial<Record<Role, LockedPath>>
  draggingRole: Role | null
  dragPosition: Position | null
  draggingArrowRole: Role | null
  draggingArrowVariant?: 'primary' | 'secondary'
  arrowDragPosition: Position | null
  arrows: ArrowPositions
  arrowEndpointLabels?: Partial<Record<Role, string>>
  secondaryArrows?: ArrowPositions
  secondaryArrowSources?: ArrowPositions
  secondaryArrowEndpointLabels?: Partial<Record<Role, string>>
  secondaryArrowCurves?: Partial<Record<Role, ArrowCurveConfig>>
  arrowTagFontSize?: number
  hoveredArrowRole: Role | null
  hoveredArrowVariant?: 'primary' | 'secondary' | null
  selectedArrowRole?: Role | null
  selectedArrowVariant?: 'primary' | 'secondary' | null
  tappedRole: Role | null
  arrowCurves: Partial<Record<Role, ArrowCurveConfig>>
  curveStrength: number
  showArrows: boolean
  durationMs: number
  easingCss: string
  debugHitboxes: boolean
  toSvgCoords: (position: Position) => { x: number; y: number }
  onArrowDragStart: (role: Role, e: React.MouseEvent | React.TouchEvent, initialEndSvg?: { x: number; y: number }, initialControlSvg?: { x: number; y: number }, variant?: 'primary' | 'secondary') => void
  onArrowHoverChange: (role: Role | null, variant?: 'primary' | 'secondary') => void
  onArrowSelect?: (role: Role, variant?: 'primary' | 'secondary') => void
  onCreateSecondaryArrow?: (role: Role) => void
  getRoleColor: (role: Role) => string
}

function MovementArrowLayerImpl({
  activeRoles,
  displayPositions,
  mode,
  isBezierAnimating,
  isPreviewingMovement,
  playLockedPaths,
  draggingRole,
  dragPosition,
  draggingArrowRole,
  draggingArrowVariant = 'primary',
  arrowDragPosition,
  arrows,
  arrowEndpointLabels,
  secondaryArrows,
  secondaryArrowSources,
  secondaryArrowEndpointLabels,
  secondaryArrowCurves,
  arrowTagFontSize = 10,
  hoveredArrowRole,
  hoveredArrowVariant = null,
  selectedArrowRole = null,
  selectedArrowVariant = null,
  tappedRole,
  arrowCurves,
  curveStrength,
  showArrows,
  durationMs,
  easingCss,
  debugHitboxes,
  toSvgCoords,
  onArrowDragStart,
  onArrowHoverChange,
  onArrowSelect,
  onCreateSecondaryArrow,
  getRoleColor,
}: MovementArrowLayerProps) {
  const prefersReducedMotion = useReducedMotion()
  const labelTransition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: 420,
        damping: 34,
        mass: 0.7,
      }

  const renderEndpointLabel = ({
    anchorX,
    anchorY,
    align,
    tone,
    text,
    visible,
    dashed = false,
  }: {
    anchorX: number
    anchorY: number
    align: 'start' | 'end'
    tone: 'primary' | 'secondary'
    text: string
    visible: boolean
    dashed?: boolean
  }) => {
    const fontSize = arrowTagFontSize
    const padX = fontSize * 0.5
    const padY = fontSize * 0.34
    const measuredTextWidth = measureArrowLabelWidth(text, fontSize)
    const labelWidth = Math.max(fontSize * 1.9, measuredTextWidth + padX * 2)
    const labelHeight = fontSize + padY * 2
    const x = align === 'start' ? 0 : -labelWidth
    const textX = align === 'start' ? padX : -padX

    return (
      <motion.g
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          x: anchorX,
          y: anchorY,
          scale: visible ? 1 : 0.98,
        }}
        transition={labelTransition}
        style={{ pointerEvents: 'none' }}
      >
        <rect
          x={x}
          y={-labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          rx={labelHeight / 2}
          fill={tone === 'primary' ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.9)'}
          stroke={tone === 'primary' ? 'rgba(148,163,184,0.34)' : 'rgba(148,163,184,0.3)'}
          strokeWidth={1}
          strokeDasharray={dashed ? '3 2' : undefined}
        />
        <text
          x={textX}
          y={0}
          textAnchor={align}
          dominantBaseline="middle"
          style={{
            fill: tone === 'primary' ? 'rgb(71 85 105)' : 'rgb(100 116 139)',
            fontSize,
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {text}
        </text>
      </motion.g>
    )
  }

  return (
    <>
      {activeRoles.map((role) => {
        const hasHomePosition = displayPositions[role] !== undefined
        if (mode === 'simulation' && !hasHomePosition) return null
        // When dragging a brand-new arrow from preview, let the preview layer own it.
        if (draggingArrowRole === role && draggingArrowVariant === 'primary' && !arrows[role]) return null

        const lockedPath = (isBezierAnimating || isPreviewingMovement) ? playLockedPaths[role] : null
        // Keep preview paths visually distinct (dashed + dim) for the whole preview lifecycle,
        // including after motion settles and before reset.
        const isTraversingPath = Boolean(lockedPath && isPreviewingMovement)
        const basePosForArrow = lockedPath?.start || displayPositions[role] || { x: 0.5, y: 0.75 }
        const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : basePosForArrow)

        const activeArrowTarget =
          lockedPath?.end ??
          (draggingArrowRole === role && draggingArrowVariant === 'primary' && arrowDragPosition ? arrowDragPosition : arrows[role])
        const secondaryArrowStartPos = secondaryArrowSources?.[role] ?? activeArrowTarget ?? basePosForArrow
        const secondaryArrowStartSvg = secondaryArrowStartPos ? toSvgCoords(secondaryArrowStartPos) : homeSvgPos
        const secondaryArrowTarget =
          draggingArrowRole === role && draggingArrowVariant === 'secondary' && arrowDragPosition
            ? arrowDragPosition
            : secondaryArrows?.[role]
        const defaultHandleSvg = { x: homeSvgPos.x, y: Math.max(12, homeSvgPos.y - 28) }
        const arrowEndPos = lockedPath?.end ?? activeArrowTarget
        const arrowEndSvg = arrowEndPos ? toSvgCoords(arrowEndPos) : defaultHandleSvg
        const secondaryArrowEndSvg = secondaryArrowTarget ? toSvgCoords(secondaryArrowTarget) : null

        const curveConfig = arrowCurves[role]
        const chosenControl = (() => {
          if (!arrowEndPos) return null
          if (lockedPath) {
            return lockedPath.control
              ? { x: lockedPath.control.x, y: lockedPath.control.y }
              : null
          }
          if (curveConfig) {
            return { x: curveConfig.x, y: curveConfig.y }
          }
          const startPct = draggingRole === role && dragPosition ? dragPosition : basePosForArrow
          return computeDefaultControlPoint(startPct, arrowEndPos, curveStrength)
        })()

        const validControl = chosenControl &&
          !isNaN(chosenControl.x) && !isNaN(chosenControl.y)
          ? chosenControl : null
        const controlSvg = validControl ? toSvgCoords(validControl) : null
        const secondaryChosenControl = (() => {
          if (!secondaryArrowTarget) return null
          if (secondaryArrowCurves?.[role]) {
            return secondaryArrowCurves[role]
          }

          return computeDefaultControlPoint(secondaryArrowStartPos, secondaryArrowTarget, curveStrength)
        })()
        const validSecondaryControl = secondaryChosenControl &&
          !isNaN(secondaryChosenControl.x) && !isNaN(secondaryChosenControl.y)
          ? secondaryChosenControl
          : null
        const secondaryControlSvg = validSecondaryControl ? toSvgCoords(validSecondaryControl) : null
        const endpointLabel = arrowEndpointLabels?.[role] ?? null
        const secondaryEndpointLabel = secondaryArrowEndpointLabels?.[role] ?? null
        const primaryIsActive =
          (hoveredArrowRole === role && hoveredArrowVariant === 'primary') ||
          (selectedArrowRole === role && selectedArrowVariant === 'primary')
        const secondaryIsActive =
          (hoveredArrowRole === role && hoveredArrowVariant === 'secondary') ||
          (selectedArrowRole === role && selectedArrowVariant === 'secondary')
        const showPrimaryLabel = Boolean(endpointLabel && primaryIsActive)
        const showSecondaryLabel = Boolean(secondaryEndpointLabel && secondaryIsActive)
        const showAddSecondaryAction = Boolean(
          onCreateSecondaryArrow &&
          activeArrowTarget &&
          !secondaryArrows?.[role] &&
          (primaryIsActive || tappedRole === role)
        )

        const hasValidPositions = arrowEndPos &&
          !isNaN(homeSvgPos.x) && !isNaN(homeSvgPos.y) &&
          !isNaN(arrowEndSvg.x) && !isNaN(arrowEndSvg.y)
        const hasValidSecondaryPositions = secondaryArrowTarget && secondaryArrowEndSvg &&
          !isNaN(secondaryArrowEndSvg.x) && !isNaN(secondaryArrowEndSvg.y)

        if (!hasValidPositions && !hasValidSecondaryPositions) return null

        return (
          <g
            key={`arrow-${role}`}
            style={{
              transition: showArrows ? `opacity ${durationMs}ms ${easingCss}` : 'none',
              opacity: showArrows ? 1 : 0,
            }}
          >
            {hasValidPositions ? (
              <MovementArrow
                start={{ x: homeSvgPos.x, y: homeSvgPos.y }}
                end={arrowEndSvg}
                control={controlSvg}
                color={getRoleColor(role)}
                strokeWidth={3}
                opacity={isTraversingPath ? 0.45 : 0.85}
                dashPattern={isTraversingPath ? '8 6' : undefined}
                startDotOpacityScale={isTraversingPath ? 0.75 : 1}
                arrowheadOpacityScale={isTraversingPath ? 0.85 : 1}
                isDraggable={true}
                onDragStart={(e) => onArrowDragStart(role, e, undefined, undefined, 'primary')}
                onSelect={() => onArrowSelect?.(role, 'primary')}
                showCurveHandle={false}
                onMouseEnter={() => onArrowHoverChange(role, 'primary')}
                onMouseLeave={() => onArrowHoverChange(null)}
                debugHitboxes={debugHitboxes}
              />
            ) : null}
            {hasValidPositions && endpointLabel ? (
              renderEndpointLabel({
                anchorX: arrowEndSvg.x + (arrowEndSvg.x >= homeSvgPos.x ? 14 : -14),
                anchorY: arrowEndSvg.y + ((controlSvg?.y ?? homeSvgPos.y) >= arrowEndSvg.y ? -12 : 12),
                align: arrowEndSvg.x >= homeSvgPos.x ? 'start' : 'end',
                tone: 'primary',
                text: endpointLabel,
                visible: showPrimaryLabel,
              })
            ) : null}
            {showAddSecondaryAction ? (
              <g
                transform={`translate(${arrowEndSvg.x + (arrowEndSvg.x >= homeSvgPos.x ? 14 : -14)} ${arrowEndSvg.y + 28})`}
                onMouseEnter={() => onArrowHoverChange(role, 'primary')}
                onMouseLeave={() => onArrowHoverChange(null)}
              >
                <rect
                  x={arrowEndSvg.x >= homeSvgPos.x ? 0 : -116}
                  y={-12}
                  width={116}
                  height={24}
                  rx={12}
                  fill="rgba(255,255,255,0.98)"
                  stroke="rgba(148,163,184,0.34)"
                  strokeWidth={1}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCreateSecondaryArrow?.(role)
                  }}
                  onTouchStart={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCreateSecondaryArrow?.(role)
                  }}
                />
                <text
                  x={arrowEndSvg.x >= homeSvgPos.x ? 58 : -58}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fill: 'rgb(71 85 105)',
                    fontSize: 10,
                    fontWeight: 600,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  Add 2nd attack
                </text>
              </g>
            ) : null}
            {hasValidSecondaryPositions && secondaryArrowEndSvg ? (
              <g>
                <MovementArrow
                  start={{ x: secondaryArrowStartSvg.x, y: secondaryArrowStartSvg.y }}
                  end={secondaryArrowEndSvg}
                  control={secondaryControlSvg}
                  color={getRoleColor(role)}
                  strokeWidth={2.5}
                  opacity={0.62}
                  dashPattern="6 5"
                  startDotOpacityScale={0.7}
                  arrowheadOpacityScale={0.75}
                  isDraggable={true}
                  onDragStart={(e) => onArrowDragStart(role, e, undefined, undefined, 'secondary')}
                  onSelect={() => onArrowSelect?.(role, 'secondary')}
                  showCurveHandle={false}
                  onMouseEnter={() => onArrowHoverChange(role, 'secondary')}
                  onMouseLeave={() => onArrowHoverChange(null)}
                  debugHitboxes={debugHitboxes}
                />
                {secondaryEndpointLabel ? (
                  renderEndpointLabel({
                    anchorX: secondaryArrowEndSvg.x + (secondaryArrowEndSvg.x >= homeSvgPos.x ? 14 : -14),
                    anchorY: secondaryArrowEndSvg.y + (secondaryArrowEndSvg.y >= homeSvgPos.y ? 12 : -12),
                    align: secondaryArrowEndSvg.x >= homeSvgPos.x ? 'start' : 'end',
                    tone: 'secondary',
                    text: secondaryEndpointLabel,
                    visible: showSecondaryLabel,
                    dashed: true,
                  })
                ) : null}
              </g>
            ) : null}
          </g>
        )
      })}
    </>
  )
}

interface CurveHandleLayerProps {
  activeRoles: Role[]
  displayPositions: PositionCoordinates
  mode: 'whiteboard' | 'simulation'
  isBezierAnimating: boolean
  isPreviewingMovement: boolean
  isMobile: boolean
  tappedRole: Role | null
  hoveredArrowRole: Role | null
  hoveredArrowVariant?: 'primary' | 'secondary' | null
  draggingCurveRole: Role | null
  canEditCurves: boolean
  playLockedPaths: Partial<Record<Role, LockedPath>>
  draggingArrowRole: Role | null
  arrowDragPosition: Position | null
  arrows: ArrowPositions
  secondaryArrows?: ArrowPositions
  secondaryArrowSources?: ArrowPositions
  arrowCurves: Partial<Record<Role, ArrowCurveConfig>>
  secondaryArrowCurves?: Partial<Record<Role, ArrowCurveConfig>>
  draggingRole: Role | null
  dragPosition: Position | null
  curveStrength: number
  showArrows: boolean
  durationMs: number
  easingCss: string
  debugHitboxes: boolean
  toSvgCoords: (position: Position) => { x: number; y: number }
  onCurveDragStart: (role: Role, e: React.MouseEvent | React.TouchEvent, variant?: 'primary' | 'secondary') => void
  onArrowHoverChange: (role: Role | null, variant?: 'primary' | 'secondary') => void
}

function CurveHandleLayerImpl({
  activeRoles,
  displayPositions,
  mode,
  isBezierAnimating,
  isPreviewingMovement,
  isMobile,
  tappedRole,
  hoveredArrowRole,
  hoveredArrowVariant = null,
  draggingCurveRole,
  canEditCurves,
  playLockedPaths,
  draggingArrowRole,
  arrowDragPosition,
  arrows,
  secondaryArrows,
  secondaryArrowSources,
  arrowCurves,
  secondaryArrowCurves,
  draggingRole,
  dragPosition,
  curveStrength,
  showArrows,
  durationMs,
  easingCss,
  debugHitboxes,
  toSvgCoords,
  onCurveDragStart,
  onArrowHoverChange,
}: CurveHandleLayerProps) {
  if (!canEditCurves || isBezierAnimating || isPreviewingMovement) return null

  return (
    <>
      {activeRoles.map((role) => {
        const hasHomePosition = displayPositions[role] !== undefined
        if (mode === 'simulation' && !hasHomePosition) return null

        const showCurveHandleForRole = !!(
          (isMobile && tappedRole === role) ||
          (!isMobile && hoveredArrowRole === role) ||
          draggingCurveRole === role
        )
        if (!showCurveHandleForRole) return null

        const activeVariant = draggingCurveRole === role
          ? (hoveredArrowVariant ?? 'primary')
          : (hoveredArrowRole === role ? (hoveredArrowVariant ?? 'primary') : 'primary')

        const homeBasePos = displayPositions[role] || { x: 0.5, y: 0.75 }
        const primaryStartPos = draggingRole === role && dragPosition ? dragPosition : homeBasePos
        const homeSvgPos = toSvgCoords(primaryStartPos)
        const lockedPath = playLockedPaths[role]
        const secondaryStartPos = secondaryArrowSources?.[role] ?? arrows[role]
        const secondarySvgStart = secondaryStartPos ? toSvgCoords(secondaryStartPos) : homeSvgPos
        const activeArrowTarget = activeVariant === 'secondary'
          ? (
              draggingArrowRole === role && arrowDragPosition
                ? arrowDragPosition
                : secondaryArrows?.[role]
            )
          : (
              lockedPath?.end ?? (draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role])
            )
        if (!activeArrowTarget) return null

        const arrowEndSvg = toSvgCoords(activeArrowTarget)
        const curveConfig = activeVariant === 'secondary' ? secondaryArrowCurves?.[role] : arrowCurves[role]
        const controlSvg = (() => {
          if (activeVariant === 'primary' && lockedPath) {
            return lockedPath.control ? toSvgCoords(lockedPath.control) : null
          }
          if (curveConfig) {
            return toSvgCoords({ x: curveConfig.x, y: curveConfig.y })
          }
          const startPct = activeVariant === 'secondary'
            ? secondaryStartPos
            : primaryStartPos
          if (!startPct) return null
          const fallback = computeDefaultControlPoint(startPct, activeArrowTarget, curveStrength)
          return fallback ? toSvgCoords(fallback) : null
        })()

        if (
          isNaN((activeVariant === 'secondary' ? secondarySvgStart : homeSvgPos).x) ||
          isNaN((activeVariant === 'secondary' ? secondarySvgStart : homeSvgPos).y) ||
          isNaN(arrowEndSvg.x) || isNaN(arrowEndSvg.y)
        ) {
          return null
        }

        const validControlSvg = controlSvg && !isNaN(controlSvg.x) && !isNaN(controlSvg.y)
          ? controlSvg : null

        const curveMidpoint = validControlSvg
          ? {
              x: 0.25 * (activeVariant === 'secondary' ? secondarySvgStart.x : homeSvgPos.x) + 0.5 * validControlSvg.x + 0.25 * arrowEndSvg.x,
              y: 0.25 * (activeVariant === 'secondary' ? secondarySvgStart.y : homeSvgPos.y) + 0.5 * validControlSvg.y + 0.25 * arrowEndSvg.y,
            }
          : {
              x: ((activeVariant === 'secondary' ? secondarySvgStart.x : homeSvgPos.x) + arrowEndSvg.x) / 2,
              y: ((activeVariant === 'secondary' ? secondarySvgStart.y : homeSvgPos.y) + arrowEndSvg.y) / 2,
            }

        return (
          <g
            key={`curve-handle-${role}`}
            style={{
              transition: showArrows ? `opacity ${durationMs}ms ${easingCss}` : 'none',
              opacity: showArrows ? 1 : 0,
            }}
          >
            <circle
              cx={curveMidpoint.x}
              cy={curveMidpoint.y}
              r={6}
              fill="rgba(0,0,0,0.5)"
              stroke="white"
              strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={curveMidpoint.x}
              cy={curveMidpoint.y}
              r={2.5}
              fill="white"
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={curveMidpoint.x}
              cy={curveMidpoint.y}
              r={18}
              fill={debugHitboxes ? 'rgba(57, 255, 20, 0.3)' : 'transparent'}
              stroke={debugHitboxes ? 'rgba(57, 255, 20, 0.8)' : 'none'}
              strokeWidth={debugHitboxes ? 2 : 0}
              style={{
                cursor: 'grab',
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
              onMouseEnter={() => onArrowHoverChange(role, activeVariant)}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCurveDragStart(role, e, activeVariant)
              }}
              onTouchStart={(e) => {
                e.stopPropagation()
                onCurveDragStart(role, e, activeVariant)
              }}
            />
          </g>
        )
      })}
    </>
  )
}

export const MovementArrowLayer = memo(MovementArrowLayerImpl)
export const CurveHandleLayer = memo(CurveHandleLayerImpl)

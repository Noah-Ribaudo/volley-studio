'use client'

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
  arrowEndpointLabels: _arrowEndpointLabels,
  secondaryArrows,
  secondaryArrowSources,
  secondaryArrowEndpointLabels: _secondaryArrowEndpointLabels,
  secondaryArrowCurves,
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
        const primaryIsActive =
          (hoveredArrowRole === role && hoveredArrowVariant === 'primary') ||
          (selectedArrowRole === role && selectedArrowVariant === 'primary')
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
  arrowEndpointLabels?: Partial<Record<Role, string>>
  secondaryArrowEndpointLabels?: Partial<Record<Role, string>>
  arrowTagFontSize?: number
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
  arrowEndpointLabels,
  secondaryArrowEndpointLabels,
  arrowTagFontSize = 10,
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
        const endpointLabel = activeVariant === 'secondary'
          ? secondaryArrowEndpointLabels?.[role] ?? null
          : arrowEndpointLabels?.[role] ?? null

        const curveMidpoint = validControlSvg
          ? {
              x: 0.25 * (activeVariant === 'secondary' ? secondarySvgStart.x : homeSvgPos.x) + 0.5 * validControlSvg.x + 0.25 * arrowEndSvg.x,
              y: 0.25 * (activeVariant === 'secondary' ? secondarySvgStart.y : homeSvgPos.y) + 0.5 * validControlSvg.y + 0.25 * arrowEndSvg.y,
            }
          : {
              x: ((activeVariant === 'secondary' ? secondarySvgStart.x : homeSvgPos.x) + arrowEndSvg.x) / 2,
              y: ((activeVariant === 'secondary' ? secondarySvgStart.y : homeSvgPos.y) + arrowEndSvg.y) / 2,
            }

        const fontSize = arrowTagFontSize
        const padX = fontSize * 0.5
        const padY = fontSize * 0.34
        const measuredTextWidth = endpointLabel ? measureArrowLabelWidth(endpointLabel, fontSize) : 0
        const labelWidth = Math.max(fontSize * 1.9, measuredTextWidth + padX * 2)
        const labelHeight = fontSize + padY * 2
        const usesLabelHandle = Boolean(endpointLabel)
        const hitRadius = 18
        const hitWidth = usesLabelHandle ? labelWidth + fontSize * 0.4 : hitRadius * 2
        const hitHeight = usesLabelHandle ? labelHeight + fontSize * 0.4 : hitRadius * 2

        return (
          <g
            key={`curve-handle-${role}`}
            style={{
              transition: showArrows ? `opacity ${durationMs}ms ${easingCss}` : 'none',
              opacity: showArrows ? 1 : 0,
            }}
          >
            {usesLabelHandle ? (
              <>
                <rect
                  x={curveMidpoint.x - labelWidth / 2}
                  y={curveMidpoint.y - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={labelHeight / 2}
                  fill={activeVariant === 'secondary' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.94)'}
                  stroke={activeVariant === 'secondary' ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.34)'}
                  strokeWidth={1}
                  strokeDasharray={activeVariant === 'secondary' ? '3 2' : undefined}
                  style={{ pointerEvents: 'none' }}
                />
                <text
                  x={curveMidpoint.x}
                  y={curveMidpoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fill: activeVariant === 'secondary' ? 'rgb(100 116 139)' : 'rgb(71 85 105)',
                    fontSize,
                    fontWeight: 600,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {endpointLabel}
                </text>
              </>
            ) : (
              <>
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
              </>
            )}
            <rect
              x={curveMidpoint.x - hitWidth / 2}
              y={curveMidpoint.y - hitHeight / 2}
              width={hitWidth}
              height={hitHeight}
              rx={usesLabelHandle ? hitHeight / 2 : hitRadius}
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

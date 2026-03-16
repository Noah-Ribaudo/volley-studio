'use client'

import { memo } from 'react'
import { MovementArrow } from './MovementArrow'
import { computeDefaultControlPoint } from '@/lib/whiteboard-motion'
import type { ArrowCurveConfig, ArrowPositions, Position, PositionCoordinates, Role } from '@/lib/types'

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
  arrowDragPosition: Position | null
  arrows: ArrowPositions
  arrowEndpointLabels?: Partial<Record<Role, string>>
  secondaryArrows?: ArrowPositions
  secondaryArrowEndpointLabels?: Partial<Record<Role, string>>
  arrowCurves: Partial<Record<Role, ArrowCurveConfig>>
  curveStrength: number
  showArrows: boolean
  durationMs: number
  easingCss: string
  debugHitboxes: boolean
  toSvgCoords: (position: Position) => { x: number; y: number }
  onArrowDragStart: (role: Role, e: React.MouseEvent | React.TouchEvent, initialEndSvg?: { x: number; y: number }, initialControlSvg?: { x: number; y: number }, variant?: 'primary' | 'secondary') => void
  onArrowHoverChange: (role: Role | null) => void
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
  arrowDragPosition,
  arrows,
  arrowEndpointLabels,
  secondaryArrows,
  secondaryArrowEndpointLabels,
  arrowCurves,
  curveStrength,
  showArrows,
  durationMs,
  easingCss,
  debugHitboxes,
  toSvgCoords,
  onArrowDragStart,
  onArrowHoverChange,
  getRoleColor,
}: MovementArrowLayerProps) {
  return (
    <>
      {activeRoles.map((role) => {
        const hasHomePosition = displayPositions[role] !== undefined
        if (mode === 'simulation' && !hasHomePosition) return null
        // When dragging a brand-new arrow from preview, let the preview layer own it.
        if (draggingArrowRole === role && !arrows[role]) return null

        const lockedPath = (isBezierAnimating || isPreviewingMovement) ? playLockedPaths[role] : null
        // Keep preview paths visually distinct (dashed + dim) for the whole preview lifecycle,
        // including after motion settles and before reset.
        const isTraversingPath = Boolean(lockedPath && isPreviewingMovement)
        const basePosForArrow = lockedPath?.start || displayPositions[role] || { x: 0.5, y: 0.75 }
        const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : basePosForArrow)

        const activeArrowTarget = lockedPath?.end ?? (draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role])
        const secondaryArrowTarget = secondaryArrows?.[role]
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
        const endpointLabel = arrowEndpointLabels?.[role] ?? null
        const labelWidth = endpointLabel ? Math.max(44, Math.min(96, endpointLabel.length * 6.2 + 18)) : 0
        const secondaryEndpointLabel = secondaryArrowEndpointLabels?.[role] ?? null
        const secondaryLabelWidth = secondaryEndpointLabel ? Math.max(44, Math.min(96, secondaryEndpointLabel.length * 6.2 + 18)) : 0

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
                showCurveHandle={false}
                onMouseEnter={() => onArrowHoverChange(role)}
                onMouseLeave={() => onArrowHoverChange(null)}
                debugHitboxes={debugHitboxes}
              />
            ) : null}
            {hasValidPositions && endpointLabel ? (
              <g
                transform={`translate(${arrowEndSvg.x + (arrowEndSvg.x >= homeSvgPos.x ? 14 : -14)} ${arrowEndSvg.y + ((controlSvg?.y ?? homeSvgPos.y) >= arrowEndSvg.y ? -12 : 12)})`}
                style={{ pointerEvents: 'none' }}
              >
                <rect
                  x={arrowEndSvg.x >= homeSvgPos.x ? 0 : -labelWidth}
                  y={-10}
                  width={labelWidth}
                  height={20}
                  rx={10}
                  fill="rgba(255,255,255,0.92)"
                  stroke="rgba(148,163,184,0.28)"
                />
                <text
                  x={arrowEndSvg.x >= homeSvgPos.x ? 8 : -8}
                  y={4}
                  textAnchor={arrowEndSvg.x >= homeSvgPos.x ? 'start' : 'end'}
                  className="fill-slate-600 text-[10px] font-semibold select-none"
                >
                  {endpointLabel}
                </text>
              </g>
            ) : null}
            {hasValidSecondaryPositions && secondaryArrowEndSvg ? (
              <g>
                <MovementArrow
                  start={{ x: homeSvgPos.x, y: homeSvgPos.y }}
                  end={secondaryArrowEndSvg}
                  control={null}
                  color={getRoleColor(role)}
                  strokeWidth={2.5}
                  opacity={0.62}
                  dashPattern="6 5"
                  startDotOpacityScale={0.7}
                  arrowheadOpacityScale={0.75}
                  isDraggable={true}
                  onDragStart={(e) => onArrowDragStart(role, e, undefined, undefined, 'secondary')}
                  showCurveHandle={false}
                  onMouseEnter={() => onArrowHoverChange(role)}
                  onMouseLeave={() => onArrowHoverChange(null)}
                  debugHitboxes={debugHitboxes}
                />
                {secondaryEndpointLabel ? (
                  <g
                    transform={`translate(${secondaryArrowEndSvg.x + (secondaryArrowEndSvg.x >= homeSvgPos.x ? 14 : -14)} ${secondaryArrowEndSvg.y + (secondaryArrowEndSvg.y >= homeSvgPos.y ? 12 : -12)})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <rect
                      x={secondaryArrowEndSvg.x >= homeSvgPos.x ? 0 : -secondaryLabelWidth}
                      y={-10}
                      width={secondaryLabelWidth}
                      height={20}
                      rx={10}
                      fill="rgba(255,255,255,0.88)"
                      stroke="rgba(148,163,184,0.24)"
                    />
                    <text
                      x={secondaryArrowEndSvg.x >= homeSvgPos.x ? 8 : -8}
                      y={4}
                      textAnchor={secondaryArrowEndSvg.x >= homeSvgPos.x ? 'start' : 'end'}
                      className="fill-slate-500 text-[10px] font-semibold select-none"
                    >
                      {secondaryEndpointLabel}
                    </text>
                  </g>
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
  draggingCurveRole: Role | null
  canEditCurves: boolean
  playLockedPaths: Partial<Record<Role, LockedPath>>
  draggingArrowRole: Role | null
  arrowDragPosition: Position | null
  arrows: ArrowPositions
  arrowCurves: Partial<Record<Role, ArrowCurveConfig>>
  draggingRole: Role | null
  dragPosition: Position | null
  curveStrength: number
  showArrows: boolean
  durationMs: number
  easingCss: string
  debugHitboxes: boolean
  toSvgCoords: (position: Position) => { x: number; y: number }
  onCurveDragStart: (role: Role, e: React.MouseEvent | React.TouchEvent) => void
  onArrowHoverChange: (role: Role | null) => void
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
  draggingCurveRole,
  canEditCurves,
  playLockedPaths,
  draggingArrowRole,
  arrowDragPosition,
  arrows,
  arrowCurves,
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

        const homeBasePos = displayPositions[role] || { x: 0.5, y: 0.75 }
        const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : homeBasePos)
        const lockedPath = playLockedPaths[role]
        const activeArrowTarget = lockedPath?.end ?? (draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role])
        if (!activeArrowTarget) return null

        const arrowEndSvg = toSvgCoords(activeArrowTarget)
        const curveConfig = arrowCurves[role]
        const controlSvg = (() => {
          if (lockedPath) {
            return lockedPath.control ? toSvgCoords(lockedPath.control) : null
          }
          if (curveConfig) {
            return toSvgCoords({ x: curveConfig.x, y: curveConfig.y })
          }
          const startPct = draggingRole === role && dragPosition ? dragPosition : homeBasePos
          const fallback = computeDefaultControlPoint(startPct, activeArrowTarget, curveStrength)
          return fallback ? toSvgCoords(fallback) : null
        })()

        if (
          isNaN(homeSvgPos.x) || isNaN(homeSvgPos.y) ||
          isNaN(arrowEndSvg.x) || isNaN(arrowEndSvg.y)
        ) {
          return null
        }

        const validControlSvg = controlSvg && !isNaN(controlSvg.x) && !isNaN(controlSvg.y)
          ? controlSvg : null

        const curveMidpoint = validControlSvg
          ? {
              x: 0.25 * homeSvgPos.x + 0.5 * validControlSvg.x + 0.25 * arrowEndSvg.x,
              y: 0.25 * homeSvgPos.y + 0.5 * validControlSvg.y + 0.25 * arrowEndSvg.y,
            }
          : {
              x: (homeSvgPos.x + arrowEndSvg.x) / 2,
              y: (homeSvgPos.y + arrowEndSvg.y) / 2,
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
              onMouseEnter={() => onArrowHoverChange(role)}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCurveDragStart(role, e)
              }}
              onTouchStart={(e) => {
                e.stopPropagation()
                onCurveDragStart(role, e)
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

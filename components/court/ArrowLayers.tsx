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
  arrowCurves: Partial<Record<Role, ArrowCurveConfig>>
  curveStrength: number
  showArrows: boolean
  durationMs: number
  easingCss: string
  debugHitboxes: boolean
  toSvgCoords: (position: Position) => { x: number; y: number }
  onArrowDragStart: (role: Role, e: React.MouseEvent | React.TouchEvent) => void
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
        const isTraversingPath = Boolean(lockedPath && isBezierAnimating)
        const basePosForArrow = lockedPath?.start || displayPositions[role] || { x: 0.5, y: 0.75 }
        const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : basePosForArrow)

        const activeArrowTarget = lockedPath?.end ?? (draggingArrowRole === role && arrowDragPosition ? arrowDragPosition : arrows[role])
        const defaultHandleSvg = { x: homeSvgPos.x, y: Math.max(12, homeSvgPos.y - 28) }
        const arrowEndPos = lockedPath?.end ?? activeArrowTarget
        const arrowEndSvg = arrowEndPos ? toSvgCoords(arrowEndPos) : defaultHandleSvg

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

        const hasValidPositions = arrowEndPos &&
          !isNaN(homeSvgPos.x) && !isNaN(homeSvgPos.y) &&
          !isNaN(arrowEndSvg.x) && !isNaN(arrowEndSvg.y)

        if (!hasValidPositions) return null

        return (
          <g
            key={`arrow-${role}`}
            style={{
              transition: showArrows ? `opacity ${durationMs}ms ${easingCss}` : 'none',
              opacity: showArrows ? 1 : 0,
            }}
          >
            <MovementArrow
              start={{ x: homeSvgPos.x, y: homeSvgPos.y }}
              end={arrowEndSvg}
              control={validControl ? toSvgCoords(validControl) : null}
              color={getRoleColor(role)}
              strokeWidth={3}
              opacity={isTraversingPath ? 0.45 : 0.85}
              dashPattern={isTraversingPath ? '8 6' : undefined}
              startDotOpacityScale={isTraversingPath ? 0.75 : 1}
              arrowheadOpacityScale={isTraversingPath ? 0.85 : 1}
              isDraggable={true}
              onDragStart={(e) => onArrowDragStart(role, e)}
              showCurveHandle={false}
              onMouseEnter={() => onArrowHoverChange(role)}
              onMouseLeave={() => onArrowHoverChange(null)}
              debugHitboxes={debugHitboxes}
            />
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

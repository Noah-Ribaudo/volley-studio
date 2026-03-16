'use client'

import { memo } from 'react'
import { MovementArrow } from './MovementArrow'
import {
  Role,
  Position,
  PositionCoordinates,
  ArrowPositions,
  ROLE_INFO,
} from '@/lib/types'

type PlayerInfo = {
  name?: string
  number?: number
}

interface ArrowPreviewOverlayProps {
  activeRoles: Role[]
  displayPositions: PositionCoordinates
  draggingRole: Role | null
  dragPosition: Position | null
  draggingArrowRole: Role | null
  draggingArrowVariant?: 'primary' | 'secondary'
  arrowDragPosition: Position | null
  arrows: ArrowPositions
  secondaryArrows?: ArrowPositions
  allowSecondaryPreview?: boolean
  previewVisible: Partial<Record<Role, boolean>>
  tappedRole: Role | null
  isMobile: boolean
  showPosition: boolean
  showPlayer: boolean
  showNumber: boolean
  tokenScale: number
  debugHitboxes: boolean
  toSvgCoords: (pos: Position) => { x: number; y: number }
  getPlayerInfo: (role: Role) => PlayerInfo
  onArrowChange?: (role: Role, position: Position | null, options?: { variant?: 'primary' | 'secondary' }) => void
  onArrowDragStart: (
    role: Role,
    e: React.MouseEvent | React.TouchEvent,
    initialEndSvg?: { x: number; y: number },
    initialControlSvg?: { x: number; y: number },
    variant?: 'primary' | 'secondary'
  ) => void
  onPreviewHover: (role: Role, zone: 'token' | 'arrow', isEntering: boolean) => void
  onboardingSpotlightRole?: Role | null
}

function ArrowPreviewOverlayImpl({
  activeRoles,
  displayPositions,
  draggingRole,
  dragPosition,
  draggingArrowRole,
  draggingArrowVariant = 'primary',
  arrowDragPosition,
  arrows,
  secondaryArrows = {},
  allowSecondaryPreview = false,
  previewVisible,
  tappedRole,
  isMobile,
  showPosition: _showPosition,
  showPlayer,
  showNumber,
  tokenScale,
  debugHitboxes,
  toSvgCoords,
  getPlayerInfo,
  onArrowChange,
  onArrowDragStart,
  onPreviewHover,
  onboardingSpotlightRole = null,
}: ArrowPreviewOverlayProps) {
  if (!onArrowChange) return null

  return (
    <g className="pointer-events-none" aria-hidden="true">
      {activeRoles.map((role) => {
        const homeBasePos = displayPositions[role] || { x: 0.5, y: 0.75 }
        const homeSvgPos = toSvgCoords(draggingRole === role && dragPosition ? dragPosition : homeBasePos)
        const isLeftSide = homeBasePos.x > 0.5

        const playerInfo = getPlayerInfo(role)
        const hasVisibleName = showPlayer && Boolean(playerInfo.name)
        const hasVisibleNumber = showNumber && playerInfo.number !== undefined
        const isPositionOnlyMode = !(hasVisibleName || hasVisibleNumber)
        const baseTokenSize = isPositionOnlyMode ? 56 : 48
        const actualTokenRadius = Math.max(baseTokenSize * tokenScale, 48) / 2

        const rolePreviewVisible = previewVisible[role] === true
        const hasPrimaryArrow = Boolean(arrows[role])
        const hasSecondaryArrow = Boolean(secondaryArrows[role])
        const canShowSecondaryPreview = allowSecondaryPreview && hasPrimaryArrow && !hasSecondaryArrow
        const previewVariant: 'primary' | 'secondary' = canShowSecondaryPreview ? 'secondary' : 'primary'
        const hasArrowForVariant = previewVariant === 'secondary' ? hasSecondaryArrow : hasPrimaryArrow
        const isDraggingNewPreviewArrow =
          draggingArrowRole === role &&
          draggingArrowVariant === previewVariant &&
          !hasArrowForVariant &&
          Boolean(arrowDragPosition)

        if (hasArrowForVariant && !isDraggingNewPreviewArrow) {
          return null
        }

        const canShowPreview = !hasArrowForVariant
        const isPreviewActive = canShowPreview && (
          rolePreviewVisible ||
          (draggingArrowRole === role && draggingArrowVariant === previewVariant) ||
          (isMobile && tappedRole === role)
        )

        const previewPeekDistance = 28
        const previewCurveHeight = 25
        const edgeInset = Math.max(10, actualTokenRadius - 6)
        const direction = isLeftSide ? -1 : 1

        const previewStartSvg = {
          x: homeSvgPos.x,
          y: homeSvgPos.y,
        }
        const defaultPreviewEndSvg = {
          x: previewStartSvg.x + direction * (edgeInset + previewPeekDistance),
          y: homeSvgPos.y + (previewVariant === 'secondary' ? 8 : -10),
        }
        const previewEndSvg = isDraggingNewPreviewArrow && arrowDragPosition
          ? toSvgCoords(arrowDragPosition)
          : defaultPreviewEndSvg
        const previewControlSvg = {
          x: (previewStartSvg.x + previewEndSvg.x) / 2,
          y: isDraggingNewPreviewArrow
            ? Math.min(previewStartSvg.y, previewEndSvg.y) - (previewCurveHeight * 0.65)
            : homeSvgPos.y - previewCurveHeight,
        }

        const spotlightTarget = onboardingSpotlightRole === role && isPreviewActive
        return (
          <g
            key={`preview-${role}`}
            {...(spotlightTarget ? { 'data-onboarding': 'arrow-preview-target' } : {})}
          >
            <MovementArrow
              start={previewStartSvg}
              end={previewEndSvg}
              control={previewControlSvg}
              color={ROLE_INFO[role].color}
              strokeWidth={3}
              opacity={0.85}
              dashPattern={previewVariant === 'secondary' ? '6 5' : undefined}
              isDraggable={true}
              onDragStart={(e) => onArrowDragStart(role, e, previewEndSvg, previewControlSvg, previewVariant)}
              onMouseEnter={() => !draggingRole && !draggingArrowRole && onPreviewHover(role, 'arrow', true)}
              onMouseLeave={() => onPreviewHover(role, 'arrow', false)}
              dragHitArea="both"
              dragHandleRadius={32}
              peekAnimated={true}
              peekActive={isPreviewActive}
              debugHitboxes={debugHitboxes}
            />
          </g>
        )
      })}
    </g>
  )
}

export const ArrowPreviewOverlay = memo(ArrowPreviewOverlayImpl)

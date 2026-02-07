'use client'

import { memo } from 'react'
import { Role, ROLE_INFO, PlayerStatus, PLAYER_STATUS_INFO } from '@/lib/types'
import { getTextColorForOklch } from '@/lib/utils'

// Helper function to calculate token dimensions for hit targets
export function getPlayerTokenDimensions(
  isCircle: boolean,
  mobileScale: number = 1,
  hasAssignedPlayer: boolean = false
): { width: number; height: number } {
  const isPositionOnlyMode = !hasAssignedPlayer
  const POSITION_ONLY_BASE_SIZE = 56
  const PLAYER_TOKEN_BASE_SIZE = 48
  const scale = 1 * mobileScale

  const baseTokenSize = isPositionOnlyMode
    ? Math.max(POSITION_ONLY_BASE_SIZE * mobileScale, 44)
    : Math.max(PLAYER_TOKEN_BASE_SIZE * mobileScale, 44)

  // Calculate rectangle dimensions first
  const width = baseTokenSize * scale
  const minHeight = 44 * mobileScale
  // For rectangles, height varies based on content, but we can use a reasonable max
  const height = Math.max(baseTokenSize * scale * 1.2, minHeight)

  if (isCircle) {
    // Circle diameter equals the calculated rectangle HEIGHT
    const diameter = height
    return { width: diameter, height: diameter }
  } else {
    return { width, height }
  }
}

interface PlayerTokenProps {
  role: Role
  x: number
  y: number
  highlighted?: boolean
  dimmed?: boolean
  playerName?: string
  playerNumber?: number
  isDragging?: boolean
  isHovered?: boolean
  onClick?: () => void
  showPosition?: boolean
  showPlayer?: boolean
  mobileScale?: number
  isInViolation?: boolean
  colorOverride?: string
  /** Whether the context UI is open for this player */
  isContextOpen?: boolean
  tokenSize?: 'big' | 'small' // Size variant (big = current, small = circular)
  // Debug dimension offsets (in pixels)
  widthOffset?: number
  heightOffset?: number
  /** Use circular tokens instead of rounded rectangles */
  isCircle?: boolean
  /** Player status badges to display (multiple stack vertically) */
  statuses?: PlayerStatus[]
  /** Show full words on status badges instead of first letter */
  fullStatusLabels?: boolean
  /** Whether this token is primed for arrow creation (shows pulsing glow) */
  isPrimed?: boolean
}

function PlayerTokenImpl({
  role,
  x,
  y,
  highlighted = false,
  dimmed = false,
  playerName,
  playerNumber,
  isDragging = false,
  isHovered = false,
  onClick,
  showPosition = true,
  showPlayer = true,
  mobileScale = 1,
  isInViolation = false,
  colorOverride,
  isContextOpen = false,
  tokenSize = 'big',
  widthOffset = 0,
  heightOffset = 0,
  isCircle = false,
  statuses: statusesProp = [],
  fullStatusLabels = true,
  isPrimed = false
}: PlayerTokenProps) {
  // Normalize statuses - handle legacy single-value format
  const statuses = Array.isArray(statusesProp) ? statusesProp : (statusesProp ? [statusesProp] : [])

  const roleInfo = ROLE_INFO[role]
  const hasAssignedPlayer = playerName !== undefined || playerNumber !== undefined
  const tokenColor = colorOverride || roleInfo.color
  const textColor = getTextColorForOklch(tokenColor)

  // Small circular tokens only show role abbreviation
  if (tokenSize === 'small') {
    // Circular token sized to fit ~3 characters
    const circleRadius = 18 * mobileScale // Diameter ~36px, fits 3 chars nicely

    return (
      <g
        className={`player-token transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab focus:outline-none'}`}
        style={{
          transform: `translate(${x}px, ${y}px)`,
          opacity: dimmed ? 0.4 : 1,
          filter: isDragging ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : undefined
        }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        focusable="true"
        aria-pressed={highlighted}
        aria-label={roleInfo.name}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
      >
        {/* Primed glow effect for small tokens */}
        {isPrimed && (
          <>
            <circle
              cx={0}
              cy={0}
              r={circleRadius + 4 * mobileScale}
              fill="none"
              stroke="rgba(57, 255, 20, 0.8)"
              strokeWidth={3 * mobileScale}
              style={{
                animation: 'prime-pulse-small 1s ease-in-out infinite',
              }}
            />
            <style>
              {`
                @keyframes prime-pulse-small {
                  0%, 100% {
                    opacity: 0.6;
                    stroke-width: ${2 * mobileScale}px;
                  }
                  50% {
                    opacity: 1;
                    stroke-width: ${4 * mobileScale}px;
                  }
                }
              `}
            </style>
          </>
        )}

        {/* Circular background */}
        <circle
          cx={0}
          cy={0}
          r={circleRadius}
          fill={tokenColor}
          stroke={isInViolation ? '#ef4444' : highlighted ? '#fff' : 'rgba(0,0,0,0.3)'}
          strokeWidth={isInViolation ? 1.5 * mobileScale : highlighted ? 2.5 * mobileScale : 1.5 * mobileScale}
          strokeDasharray={isInViolation ? '4,4' : undefined}
          className="transition-all duration-150"
        />

        {/* Inner highlight for depth */}
        <circle
          cx={0}
          cy={0}
          r={circleRadius - 2 * mobileScale}
          fill="rgba(255,255,255,0.2)"
        />

        {/* Role abbreviation */}
        <text
          x={0}
          y={0}
          fill={textColor}
          fontSize={11 * mobileScale}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {role}
        </text>

        {/* Status badges - stacked vertically */}
        {statuses.length > 0 && (() => {
          const badgeOffsetX = circleRadius * 0.7
          const baseOffsetY = -circleRadius * 0.7
          const fontSize = 5 * mobileScale
          const paddingX = 3 * mobileScale
          const paddingY = 2 * mobileScale
          const badgeHeight = fontSize + paddingY * 2
          const badgeSpacing = 2 * mobileScale

          return statuses.map((status, index) => {
            const statusInfo = PLAYER_STATUS_INFO[status]
            const badgeTextColor = getTextColorForOklch(statusInfo.color)
            const badgeOffsetY = baseOffsetY + index * (badgeHeight + badgeSpacing)

            if (fullStatusLabels) {
              const badgeWidth = statusInfo.label.length * fontSize * 0.6 + paddingX * 2
              return (
                <g key={status} transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
                  <rect
                    x={-badgeWidth / 2}
                    y={-badgeHeight / 2}
                    width={badgeWidth}
                    height={badgeHeight}
                    rx={badgeHeight / 2}
                    fill={statusInfo.color}
                    stroke="#fff"
                    strokeWidth={1.5 * mobileScale}
                  />
                  <text
                    x={0}
                    y={0.5}
                    fill={badgeTextColor}
                    fontSize={fontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {statusInfo.label}
                  </text>
                </g>
              )
            }

            // Abbreviated: circular badge with first letter
            const badgeRadius = 8 * mobileScale
            return (
              <g key={status} transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
                <circle
                  r={badgeRadius}
                  fill={statusInfo.color}
                  stroke="#fff"
                  strokeWidth={1.5 * mobileScale}
                />
                <text
                  x={0}
                  y={0.5}
                  fill={badgeTextColor}
                  fontSize={6 * mobileScale}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {statusInfo.label.slice(0, 1)}
                </text>
              </g>
            )
          })
        })()}
      </g>
    )
  }

  // Big tokens - original implementation
  // Determine what we're showing
  const showingBoth = showPosition && showPlayer && hasAssignedPlayer
  const showingPlayerOnly = showPlayer && !showPosition && hasAssignedPlayer
  const showingPositionOnly = showPosition && (!showPlayer || !hasAssignedPlayer)

  // Two size configurations:
  // 1. Position-only: Larger size for better visibility
  // 2. Player/Player+Position: Smaller, more compact size
  const isPositionOnlyMode = showingPositionOnly || (showPosition && !hasAssignedPlayer)

  // Base sizes (will be scaled for mobile)
  // Position-only: larger for visibility, min 44px for touch target on mobile
  const POSITION_ONLY_BASE_SIZE = 56 // Base size for position-only
  const PLAYER_TOKEN_BASE_SIZE = 48 // Base size for player tokens

  // Scaled sizes
  const baseTokenSize = isPositionOnlyMode
    ? Math.max(POSITION_ONLY_BASE_SIZE * mobileScale, 44) // Ensure min 44px on mobile
    : Math.max(PLAYER_TOKEN_BASE_SIZE * mobileScale, 44) // Ensure min 44px on mobile

  const padding = 6 * mobileScale
  const scale = 1 * mobileScale
  const rectRadius = 6 * scale

  // Dynamic text sizing based on container and content
  const baseFontSize = isPositionOnlyMode ? 14 : 11
  const baseLineHeight = 1.2

  // Get first name from full name (first space-separated string)
  const getFirstName = (name: string | undefined): string => {
    if (!name) return ''
    return name.split(/\s+/)[0] || name
  }

  // Calculate text dimensions and scaling
  const calculateTextDimensions = (text: string, fontSize: number, lineHeight: number) => {
    // Rough estimate: average character width is ~0.6 * fontSize for monospace-like fonts
    const charWidth = fontSize * 0.6
    const textWidth = text.length * charWidth
    const textHeight = fontSize * lineHeight
    return { width: textWidth, height: textHeight }
  }

  // Calculate optimal font size to fit text in container
  const calculateOptimalFontSize = (
    text: string,
    maxWidth: number,
    maxHeight: number,
    isMultiLine: boolean,
    minFontSize: number = 8,
    maxFontSize: number = 20
  ): { fontSize: number; text: string } => {
    let fontSize = maxFontSize
    let displayText = text

    // Try decreasing font size until text fits
    while (fontSize >= minFontSize) {
      const { width, height } = calculateTextDimensions(text, fontSize, baseLineHeight)
      const availableWidth = maxWidth - padding * 2
      const availableHeight = maxHeight - padding * 2

      if (isMultiLine) {
        // For multi-line, check if it fits in height and width
        if (height * 2 <= availableHeight && width <= availableWidth) {
          return { fontSize: fontSize * mobileScale, text: displayText }
        }
      } else {
        // For single line, check width only
        if (width <= availableWidth) {
          return { fontSize: fontSize * mobileScale, text: displayText }
        }
      }

      // If doesn't fit, reduce font size
      fontSize -= 0.5

      // If still too wide even at minimum, truncate
      if (fontSize < minFontSize) {
        fontSize = minFontSize
        const charWidth = fontSize * 0.6
        const maxChars = Math.floor(availableWidth / charWidth) - 1
        displayText = text.length > maxChars ? text.slice(0, maxChars) + '…' : text
        break
      }
    }

    return { fontSize: fontSize * mobileScale, text: displayText }
  }

  // Determine content and calculate dimensions
  let contentLines: string[] = []
  let isMultiLine = false

  if (showingBoth && hasAssignedPlayer) {
    // Position + number on first line, name on second
    const firstName = playerName ? getFirstName(playerName) : ''
    contentLines = [
      `${role}${playerNumber !== undefined ? ` #${playerNumber}` : ''}`,
      firstName
    ].filter(Boolean)
    isMultiLine = true
  } else if (showingPositionOnly || (showPosition && !hasAssignedPlayer)) {
    // Just position
    contentLines = [role]
    isMultiLine = false
  } else if (showingPlayerOnly && hasAssignedPlayer) {
    if (playerNumber !== undefined && playerName) {
      // Number on first line, name on second
      contentLines = [`#${playerNumber}`, getFirstName(playerName)]
      isMultiLine = true
    } else if (playerNumber !== undefined) {
      // Just number
      contentLines = [`#${playerNumber}`]
      isMultiLine = false
    } else if (playerName) {
      // Just name
      contentLines = [getFirstName(playerName)]
      isMultiLine = false
    }
  } else if (showPosition) {
    // Fallback: just position
    contentLines = [role]
    isMultiLine = false
  }

  // Calculate rectangle dimensions first (needed for both shapes to determine text sizing)
  const rectWidth = baseTokenSize * scale + widthOffset

  // Calculate optimal font sizes - start with estimated line height for calculation
  const availableWidthForCalc = rectWidth - padding * 2
  const estimatedLineHeight = baseFontSize * baseLineHeight * mobileScale
  const availableHeightPerLine = estimatedLineHeight

  const textConfigsForHeight = contentLines.length > 0
    ? contentLines.map(line =>
        calculateOptimalFontSize(line, availableWidthForCalc, availableHeightPerLine, false, 8, baseFontSize)
      )
    : []

  // Use the smallest font size for consistency in multi-line, fallback to base size
  const fontSizeForHeight = contentLines.length > 0
    ? (isMultiLine
        ? Math.min(...textConfigsForHeight.map(c => c.fontSize))
        : textConfigsForHeight[0]?.fontSize || baseFontSize * mobileScale)
    : baseFontSize * mobileScale

  const lineHeightForCalc = fontSizeForHeight * baseLineHeight

  // Calculate height based on actual text lines + padding (exactly 2 lines max for multi-line, 1 for single)
  const numberOfLines = contentLines.length > 1 ? 2 : contentLines.length || 1
  const textHeight = lineHeightForCalc * numberOfLines
  const finalHeight = textHeight + padding * 2

  // Ensure minimum height for touch target on mobile (only if we have content)
  const minHeight = 44 * mobileScale
  const calculatedRectHeight = (contentLines.length > 0 ? Math.max(finalHeight, minHeight) : minHeight) + heightOffset

  // Now set actual dimensions based on shape
  let actualWidth: number
  let actualHeight: number

  if (isCircle) {
    // Circle: diameter equals the calculated rectangle HEIGHT
    const diameter = calculatedRectHeight
    actualWidth = diameter
    actualHeight = diameter
  } else {
    // Rectangle: use calculated dimensions
    actualWidth = rectWidth
    actualHeight = calculatedRectHeight
  }

  // Calculate text sizing based on actual width (for circles, use diameter as constraint)
  const availableWidth = actualWidth - padding * 2

  const textConfigs = contentLines.length > 0
    ? contentLines.map(line =>
        calculateOptimalFontSize(line, availableWidth, availableHeightPerLine, false, 8, baseFontSize)
      )
    : []

  // Use the smallest font size for consistency in multi-line, fallback to base size
  const fontSize = contentLines.length > 0
    ? (isMultiLine
        ? Math.min(...textConfigs.map(c => c.fontSize))
        : textConfigs[0]?.fontSize || baseFontSize * mobileScale)
    : baseFontSize * mobileScale

  const lineHeight = fontSize * baseLineHeight

  const labelParts = [
    ROLE_INFO[role].name,
    playerNumber ? `#${playerNumber}` : null,
    playerName ? playerName : null
  ].filter(Boolean)

  return (
    <g
      className={`player-token transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab focus:outline-none'}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        opacity: dimmed ? 0.4 : 1,
        filter: isDragging ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : undefined
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      focusable="true"
      aria-pressed={highlighted}
      aria-label={labelParts.length ? labelParts.join(' • ') : ROLE_INFO[role].name}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Primed glow effect - pulsing green glow when ready for arrow placement */}
      {isPrimed && (
        isCircle ? (
          <circle
            cx={0}
            cy={0}
            r={actualWidth / 2 + 6 * mobileScale}
            fill="none"
            stroke="rgba(57, 255, 20, 0.8)"
            strokeWidth={4 * mobileScale}
            style={{
              animation: 'prime-pulse 1s ease-in-out infinite',
            }}
          />
        ) : (
          <rect
            x={-actualWidth / 2 - 6 * mobileScale}
            y={-actualHeight / 2 - 6 * mobileScale}
            width={actualWidth + 12 * mobileScale}
            height={actualHeight + 12 * mobileScale}
            rx={rectRadius + 4 * mobileScale}
            ry={rectRadius + 4 * mobileScale}
            fill="none"
            stroke="rgba(57, 255, 20, 0.8)"
            strokeWidth={4 * mobileScale}
            style={{
              animation: 'prime-pulse 1s ease-in-out infinite',
            }}
          />
        )
      )}

      {/* Inject keyframes animation for prime pulse */}
      {isPrimed && (
        <style>
          {`
            @keyframes prime-pulse {
              0%, 100% {
                opacity: 0.6;
                stroke-width: ${3 * mobileScale}px;
              }
              50% {
                opacity: 1;
                stroke-width: ${5 * mobileScale}px;
              }
            }
          `}
        </style>
      )}

      {hasAssignedPlayer ? (
        // Shape for assigned players (circle or rounded rectangle)
        <>
          {isCircle ? (
            <>
              {/* Circle background */}
              <circle
                cx={0}
                cy={0}
                r={actualWidth / 2}
                fill={tokenColor}
                stroke={isInViolation ? '#ef4444' : (isContextOpen || highlighted) ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isInViolation ? 1.5 * mobileScale : (isContextOpen || highlighted) ? 3 * mobileScale : 2 * mobileScale}
                strokeDasharray={isInViolation ? '4,4' : undefined}
                className="transition-all duration-150"
                style={{
                  filter: isContextOpen ? 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' : undefined,
                }}
              />

              {/* Inner highlight for depth */}
              <circle
                cx={0}
                cy={0}
                r={actualWidth / 2 - 2 * mobileScale}
                fill="rgba(255,255,255,0.2)"
              />
            </>
          ) : (
            <>
              {/* Rounded rectangle background */}
              <rect
                x={-actualWidth / 2}
                y={-actualHeight / 2}
                width={actualWidth}
                height={actualHeight}
                rx={rectRadius}
                ry={rectRadius}
                fill={tokenColor}
                stroke={isInViolation ? '#ef4444' : (isContextOpen || highlighted) ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isInViolation ? 1.5 * mobileScale : (isContextOpen || highlighted) ? 3 * mobileScale : 2 * mobileScale}
                strokeDasharray={isInViolation ? '4,4' : undefined}
                className="transition-all duration-150"
                style={{
                  filter: isContextOpen ? 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' : undefined,
                }}
              />

              {/* Inner highlight for depth */}
              <rect
                x={-actualWidth / 2 + 2 * mobileScale}
                y={-actualHeight / 2 + 2 * mobileScale}
                width={actualWidth - 4 * mobileScale}
                height={actualHeight - 4 * mobileScale}
                rx={rectRadius - 2 * mobileScale}
                ry={rectRadius - 2 * mobileScale}
                fill="rgba(255,255,255,0.2)"
              />
            </>
          )}

          {/* Content based on showPosition and showPlayer - all inside rectangle */}
          {contentLines.length > 0 && (
            <>
              {isMultiLine ? (
                // Multi-line content (both position and player, or number and name)
                <>
                  {contentLines.map((line, index) => {
                    const config = textConfigs[index]
                    const isFirstLine = index === 0
                    const yOffset = isFirstLine ? -lineHeight / 2 : lineHeight / 2
                    return (
                      <text
                        key={index}
                        x={0}
                        y={yOffset}
                        fill={textColor}
                        fontSize={fontSize}
                        fontWeight={isFirstLine ? 'bold' : 'normal'}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {config.text}
                      </text>
                    )
                  })}
                </>
              ) : (
                // Single-line content (position only, number only, or name only)
                <text
                  x={0}
                  y={0}
                  fill={textColor}
                  fontSize={fontSize}
                  fontWeight={isPositionOnlyMode ? 'bold' : 'normal'}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {textConfigs[0]?.text || ''}
                </text>
              )}
            </>
          )}
        </>
      ) : (
        // Shape for unassigned players (circle or rounded rectangle)
        <>
          {isCircle ? (
            <>
              {/* Circle background */}
              <circle
                cx={0}
                cy={0}
                r={actualWidth / 2}
                fill={tokenColor}
                stroke={isInViolation ? '#ef4444' : (isContextOpen || highlighted) ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isInViolation ? 1.5 * mobileScale : (isContextOpen || highlighted) ? 3 * mobileScale : 2 * mobileScale}
                strokeDasharray={isInViolation ? '4,4' : undefined}
                className="transition-all duration-150"
                style={{
                  filter: isContextOpen ? 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' : undefined,
                }}
              />

              {/* Inner highlight for depth */}
              <circle
                cx={0}
                cy={0}
                r={actualWidth / 2 - 2 * mobileScale}
                fill="rgba(255,255,255,0.2)"
              />
            </>
          ) : (
            <>
              {/* Rounded rectangle background */}
              <rect
                x={-actualWidth / 2}
                y={-actualHeight / 2}
                width={actualWidth}
                height={actualHeight}
                rx={rectRadius}
                ry={rectRadius}
                fill={tokenColor}
                stroke={isInViolation ? '#ef4444' : (isContextOpen || highlighted) ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={isInViolation ? 1.5 * mobileScale : (isContextOpen || highlighted) ? 3 * mobileScale : 2 * mobileScale}
                strokeDasharray={isInViolation ? '4,4' : undefined}
                className="transition-all duration-150"
                style={{
                  filter: isContextOpen ? 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' : undefined,
                }}
              />

              {/* Inner highlight for depth */}
              <rect
                x={-actualWidth / 2 + 2 * mobileScale}
                y={-actualHeight / 2 + 2 * mobileScale}
                width={actualWidth - 4 * mobileScale}
                height={actualHeight - 4 * mobileScale}
                rx={rectRadius - 2 * mobileScale}
                ry={rectRadius - 2 * mobileScale}
                fill="rgba(255,255,255,0.2)"
              />
            </>
          )}

          {/* Role abbreviation - only show if showPosition is true */}
          {contentLines.length > 0 && (
            <text
              x={0}
              y={0}
              fill={textColor}
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {textConfigs[0]?.text || ''}
            </text>
          )}
        </>
      )}

      {/* Status badges for big tokens - stacked vertically */}
      {statuses.length > 0 && (() => {
        // Position at top-right shoulder: 65% from center on both axes
        const tokenRadius = isCircle ? actualWidth / 2 : Math.max(actualWidth, actualHeight) / 2
        const badgeOffsetX = tokenRadius * 0.65
        const baseOffsetY = -tokenRadius * 0.65
        const fontSize = 6 * mobileScale
        const paddingX = 4 * mobileScale
        const paddingY = 2 * mobileScale
        const badgeHeight = fontSize + paddingY * 2
        const badgeSpacing = 2 * mobileScale

        return statuses.map((status, index) => {
          const statusInfo = PLAYER_STATUS_INFO[status]
          if (!statusInfo) return null // Skip invalid status values
          const badgeTextColor = getTextColorForOklch(statusInfo.color)
          const badgeOffsetY = baseOffsetY + index * (badgeHeight + badgeSpacing)

          if (fullStatusLabels) {
            const badgeWidth = statusInfo.label.length * fontSize * 0.6 + paddingX * 2
            return (
              <g key={status} transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
                <rect
                  x={-badgeWidth / 2}
                  y={-badgeHeight / 2}
                  width={badgeWidth}
                  height={badgeHeight}
                  rx={badgeHeight / 2}
                  fill={statusInfo.color}
                  stroke="#fff"
                  strokeWidth={1.5 * mobileScale}
                />
                <text
                  x={0}
                  y={0.5}
                  fill={badgeTextColor}
                  fontSize={fontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {statusInfo.label}
                </text>
              </g>
            )
          }

          // Abbreviated: circular badge with first letter
          const badgeRadius = 8 * mobileScale
          return (
            <g key={status} transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
              <circle
                r={badgeRadius}
                fill={statusInfo.color}
                stroke="#fff"
                strokeWidth={1.5 * mobileScale}
              />
              <text
                x={0}
                y={0.5}
                fill={badgeTextColor}
                fontSize={6 * mobileScale}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {statusInfo.label.slice(0, 1)}
              </text>
            </g>
          )
        })
      })()}
    </g>
  )
}

const areStatusesEqual = (a: PlayerStatus[] | undefined, b: PlayerStatus[] | undefined) => {
  const left = a ?? []
  const right = b ?? []
  if (left === right) return true
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

const arePlayerTokenPropsEqual = (prev: PlayerTokenProps, next: PlayerTokenProps) => {
  return (
    prev.role === next.role &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.highlighted === next.highlighted &&
    prev.dimmed === next.dimmed &&
    prev.playerName === next.playerName &&
    prev.playerNumber === next.playerNumber &&
    prev.isDragging === next.isDragging &&
    prev.isHovered === next.isHovered &&
    prev.showPosition === next.showPosition &&
    prev.showPlayer === next.showPlayer &&
    prev.mobileScale === next.mobileScale &&
    prev.isInViolation === next.isInViolation &&
    prev.colorOverride === next.colorOverride &&
    prev.isContextOpen === next.isContextOpen &&
    prev.tokenSize === next.tokenSize &&
    prev.widthOffset === next.widthOffset &&
    prev.heightOffset === next.heightOffset &&
    prev.isCircle === next.isCircle &&
    prev.fullStatusLabels === next.fullStatusLabels &&
    prev.isPrimed === next.isPrimed &&
    areStatusesEqual(prev.statuses, next.statuses)
  )
}

export const PlayerToken = memo(PlayerTokenImpl, arePlayerTokenPropsEqual)
PlayerToken.displayName = 'PlayerToken'

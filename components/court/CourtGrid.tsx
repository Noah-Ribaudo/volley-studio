'use client'

import { memo, useId } from 'react'
import { Rotation, Role, ROLES, ROLE_INFO } from '@/lib/types'
import { getRoleZone } from '@/lib/rotations'
import { useThemeStore } from '@/store/useThemeStore'
import { getTextColorForOklch } from '@/lib/utils'

// CourtGrid - SVG volleyball court with lines, zones, and labels
// Court orientation: Net at top (y=0), baseline at bottom (y=100)

interface CourtGridProps {
  width: number
  height: number
  showZones?: boolean
  rotation?: Rotation
  baseOrder?: Role[]
  fullCourt?: boolean
}

// Get which role is in each zone for a given rotation
function getZoneRoleMap(rotation: Rotation, baseOrder?: Role[]): Record<number, Role> {
  const zoneRoleMap: Record<number, Role> = {}

  // For each role, find which zone it's in
  // Exclude Libero ('L') since it doesn't have a fixed zone position
  for (const role of ROLES) {
    if (role === 'L') continue
    const zone = getRoleZone(rotation, role, baseOrder)
    zoneRoleMap[zone] = role
  }

  return zoneRoleMap
}

function CourtGridImpl({ width, height, showZones = true, rotation, baseOrder, fullCourt = false }: CourtGridProps) {
  // Court dimensions as percentages
  const netY = height / 2

  // Get current theme to determine court background color
  const theme = useThemeStore((state) => state.theme)
  const isLightTheme = theme === 'light'
  const courtBackgroundColor = isLightTheme ? '#e5e7eb' : '#1f2937' // Light gray for light themes, dark gray for dark themes

  // Get zone-to-role mapping if rotation is provided (HOME team only for now)
  const zoneRoleMap = rotation ? getZoneRoleMap(rotation, baseOrder) : null

  // Zone label positions (HOME side only for now, mapped to full court coords)
  const zoneLabelPositions: Record<number, { x: number; y: number }> = {
    // 15m mark / 18m total = 0.8333
    // 10.5m mark / 18m total = 0.5833
    1: { x: width * 0.8333, y: height * 0.8333 }, // Back right
    2: { x: width * 0.8333, y: height * 0.5833 }, // Front right
    3: { x: width * 0.5000, y: height * 0.5833 }, // Front center
    4: { x: width * 0.1667, y: height * 0.5833 }, // Front left
    5: { x: width * 0.1667, y: height * 0.8333 }, // Back left
    6: { x: width * 0.5000, y: height * 0.8333 }, // Back center
  }

  // Generate unique IDs for gradients to avoid conflicts when multiple courts are rendered
  // Using useId() for SSR-safe stable IDs
  const id = useId()
  const gradientId = `court-vignette-${id.replace(/:/g, '')}`

  return (
    <g className="court-grid">
      {/* Radial gradient definition for vignette effect */}
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <stop offset="0%" stopColor={courtBackgroundColor} stopOpacity="1" />
          <stop offset="60%" stopColor={courtBackgroundColor} stopOpacity="1" />
          <stop offset="100%" stopColor={isLightTheme ? '#d1d5db' : '#111827'} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Court background with radial vignette for depth */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        rx={4}
      />

      {/* Court border */}
      <rect
        x={2}
        y={2}
        width={width - 4}
        height={height - 4}
        fill="none"
        stroke={isLightTheme ? '#374151' : '#e5e7eb'}
        strokeWidth={3}
        rx={2}
      />

      {/* Zone dividers (vertical lines) */}
      <line
        x1={(1/3) * width}
        y1={2}
        x2={(1/3) * width}
        y2={height - 2}
        stroke={isLightTheme ? '#6b7280' : '#9ca3af'}
        strokeWidth={1}
        opacity={0.4}
      />
      <line
        x1={(2/3) * width}
        y1={2}
        x2={(2/3) * width}
        y2={height - 2}
        stroke={isLightTheme ? '#6b7280' : '#9ca3af'}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Net (thick line in middle) */}
      <line
        x1={0}
        y1={netY}
        x2={width}
        y2={netY}
        stroke={isLightTheme ? '#1f2937' : '#f3f4f6'}
        strokeWidth={6}
      />
      <line
        x1={0}
        y1={netY}
        x2={width}
        y2={netY}
        stroke={isLightTheme ? '#374151' : '#e5e7eb'}
        strokeWidth={2}
        strokeDasharray="8,4"
      />

      {/* Attack lines (3m/10ft lines for BOTH sides) */}
      {/* Away side attack line (0.5 - 0.1667 = 0.3333) */}
      <line
        x1={2}
        y1={0.3333 * height}
        x2={width - 2}
        y2={0.3333 * height}
        stroke={isLightTheme ? '#6b7280' : '#9ca3af'}
        strokeWidth={2}
        strokeDasharray="10,5"
        opacity={0.7}
      />
      {/* Home side attack line (0.5 + 0.1667 = 0.6667) */}
      <line
        x1={2}
        y1={0.6667 * height}
        x2={width - 2}
        y2={0.6667 * height}
        stroke={isLightTheme ? '#6b7280' : '#9ca3af'}
        strokeWidth={2}
        strokeDasharray="10,5"
        opacity={0.7}
      />

      {/* Center line (middle of court width) */}
      <line
        x1={width / 2}
        y1={2}
        x2={width / 2}
        y2={height - 2}
        stroke={isLightTheme ? '#9ca3af' : '#6b7280'}
        strokeWidth={1}
        opacity={0.3}
      />

      {/* Horizontal center lines for each half */}
      <line
        x1={2}
        y1={height * 0.25}
        x2={width - 2}
        y2={height * 0.25}
        stroke={isLightTheme ? '#9ca3af' : '#6b7280'}
        strokeWidth={1}
        opacity={0.3}
      />
      <line
        x1={2}
        y1={height * 0.75}
        x2={width - 2}
        y2={height * 0.75}
        stroke={isLightTheme ? '#9ca3af' : '#6b7280'}
        strokeWidth={1}
        opacity={0.3}
      />

      {/* Zone labels with colored circle tags */}
      {showZones && (
        <g className="zone-labels">
          {Object.entries(zoneLabelPositions).map(([zoneStr, pos]) => {
            const zone = parseInt(zoneStr)
            const role = zoneRoleMap?.[zone]
            const roleInfo = role ? ROLE_INFO[role] : null
            const circleRadius = 12
            // Make zone tags less vibrant than player tokens by reducing opacity
            const circleColor = roleInfo?.color || (isLightTheme ? '#9ca3af' : '#6b7280')
            const textColor = roleInfo
              ? getTextColorForOklch(roleInfo.color)
              : (isLightTheme ? '#000' : '#fff')

            return (
              <g key={zone} opacity={0.35}>
                {/* Colored circle background */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={circleRadius}
                  fill={circleColor}
                  stroke={isLightTheme ? '#d1d5db' : '#374151'}
                  strokeWidth={1.5}
                />
                {/* Zone number text */}
                <text
                  x={pos.x}
                  y={pos.y}
                  fill={textColor}
                  fontSize={14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="bold"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {zone}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {/* Attack line labels */}
      {/* Home side */}
      <text
        x={width - 10}
        y={0.6667 * height - 8}
        fill={isLightTheme ? '#4b5563' : '#d1d5db'}
        fontSize={9}
        textAnchor="end"
        opacity={0.5}
      >
        10ft line
      </text>
      {/* Away side - only if full court visible */}
      {fullCourt && (
        <text
          x={width - 10}
          y={0.3333 * height + 14}
          fill={isLightTheme ? '#4b5563' : '#d1d5db'}
          fontSize={9}
          textAnchor="end"
          opacity={0.5}
        >
          10ft line
        </text>
      )}

      {/* Net label */}
      <text
        x={width / 2}
        y={netY - 8}
        fill={isLightTheme ? '#374151' : '#e5e7eb'}
        fontSize={10}
        textAnchor="middle"
        fontWeight="500"
        opacity={0.7}
      >
        NET
      </text>
    </g>
  )
}

export const CourtGrid = memo(CourtGridImpl)

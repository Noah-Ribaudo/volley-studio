'use client'

import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Text, Billboard } from '@react-three/drei'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Role, ROLE_INFO, PlayerStatus, PLAYER_STATUS_INFO } from '@/lib/types'

// Player dimensions (meters)
const BODY_RADIUS = 0.3
const BODY_HEIGHT = 1.2
const HEAD_RADIUS = 0.2
const TOTAL_HEIGHT = BODY_HEIGHT + HEAD_RADIUS * 2

interface PlayerToken3DProps {
  role: Role
  position: { x: number; y: number } // Normalized coords (0-1)
  name?: string
  number?: number
  showPosition?: boolean
  showPlayer?: boolean
  highlighted?: boolean
  dragging?: boolean
  statusFlags?: PlayerStatus[]
  onDragStart?: (e: ThreeEvent<PointerEvent>) => void
  onDrag?: (position: { x: number; z: number }) => void
  onDragEnd?: () => void
  onHoverEnter?: () => void
  onHoverLeave?: () => void
}

// Convert normalized coords (0-1) to 3D world coords
// x: 0 = left sideline, 1 = right sideline
// y: 0 = away baseline, 0.5 = net, 1 = home baseline
import { COURT_DIMENSIONS } from './CourtSurface'

export function normalizedTo3D(pos: { x: number; y: number }): { x: number; z: number } {
  return {
    x: (pos.x - 0.5) * COURT_DIMENSIONS.width,
    z: (pos.y - 0.5) * COURT_DIMENSIONS.length,
  }
}

export function threeDToNormalized(pos: { x: number; z: number }): { x: number; y: number } {
  return {
    x: pos.x / COURT_DIMENSIONS.width + 0.5,
    y: pos.z / COURT_DIMENSIONS.length + 0.5,
  }
}

export function PlayerToken3D({
  role,
  position,
  name,
  number,
  showPosition = true,
  showPlayer = true,
  highlighted = false,
  dragging = false,
  statusFlags = [],
  onDragStart,
  onDrag,
  onDragEnd,
  onHoverEnter,
  onHoverLeave,
}: PlayerToken3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // Handle hover enter - update local state and notify parent
  const handlePointerEnter = () => {
    setHovered(true)
    onHoverEnter?.()
  }

  // Handle hover leave - update local state and notify parent
  const handlePointerLeave = () => {
    setHovered(false)
    onHoverLeave?.()
  }

  // Get role color
  const roleInfo = ROLE_INFO[role]
  const color = roleInfo.color

  // Convert oklch to hex (simplified - using the hue to pick a color)
  // In production you'd use a proper color conversion library
  const colorHex = getHexFromOklch(color)

  // Convert normalized position to 3D coords
  const pos3D = normalizedTo3D(position)

  // Scale when highlighted or hovered
  const scale = highlighted || hovered ? 1.15 : 1

  // Display text
  const displayText = showPlayer && number !== undefined
    ? `#${number}`
    : showPosition
      ? role
      : ''

  return (
    <group
      ref={groupRef}
      position={[pos3D.x, 0, pos3D.z]}
      scale={[scale, scale, scale]}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDragStart?.(e)
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Body (cylinder) */}
      <mesh
        position={[0, BODY_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS * 0.8, BODY_HEIGHT, 16]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={highlighted ? colorHex : '#000000'}
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>

      {/* Head (sphere) */}
      <mesh
        position={[0, BODY_HEIGHT + HEAD_RADIUS, 0]}
        castShadow
      >
        <sphereGeometry args={[HEAD_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color="#fcd9b6" // Skin tone
        />
      </mesh>

      {/* Role/Number label - always faces camera */}
      {displayText && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, BODY_HEIGHT / 2, BODY_RADIUS + 0.1]}
        >
          <Text
            fontSize={0.25}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {displayText}
          </Text>
        </Billboard>
      )}

      {/* Player name label above head */}
      {showPlayer && name && (
        <Billboard
          follow={true}
          position={[0, TOTAL_HEIGHT + 0.3, 0]}
        >
          <Text
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.015}
            outlineColor="#000000"
          >
            {name}
          </Text>
        </Billboard>
      )}

      {/* Status badges */}
      {statusFlags.length > 0 && (
        <Billboard
          follow={true}
          position={[0, TOTAL_HEIGHT + (name ? 0.5 : 0.3), 0]}
        >
          <group>
            {statusFlags.map((status, i) => {
              const statusInfo = PLAYER_STATUS_INFO[status]
              const badgeX = (i - (statusFlags.length - 1) / 2) * 0.35
              return (
                <group key={status} position={[badgeX, 0, 0]}>
                  {/* Badge background */}
                  <mesh>
                    <planeGeometry args={[0.3, 0.15]} />
                    <meshBasicMaterial color={getHexFromOklch(statusInfo.color)} />
                  </mesh>
                  {/* Badge text */}
                  <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.08}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {statusInfo.label}
                  </Text>
                </group>
              )
            })}
          </group>
        </Billboard>
      )}

      {/* Shadow indicator on ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <circleGeometry args={[BODY_RADIUS * 1.2, 32]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  )
}

// Helper to convert oklch to hex (simplified approximation)
function getHexFromOklch(oklch: string): string {
  // Extract hue from oklch string like "oklch(0.55 0.22 300)"
  const match = oklch.match(/oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/)
  if (!match) return '#888888'

  const hue = parseFloat(match[1])

  // Map hue to a color (simplified)
  const hueColors: Record<number, string> = {
    300: '#9333ea', // Purple (S)
    250: '#2563eb', // Blue (OH1)
    90: '#f59e0b',  // Yellow/Amber (OH2)
    70: '#ea580c',  // Orange (MB1)
    200: '#0d9488', // Teal (MB2)
    350: '#db2777', // Pink (OPP)
    150: '#16a34a', // Green (L)
  }

  // Find closest hue
  let closestHue = 300
  let minDiff = Infinity
  for (const h of Object.keys(hueColors)) {
    const diff = Math.abs(parseFloat(h) - hue)
    if (diff < minDiff) {
      minDiff = diff
      closestHue = parseFloat(h)
    }
  }

  return hueColors[closestHue] || '#888888'
}

export const PLAYER_DIMENSIONS = {
  bodyRadius: BODY_RADIUS,
  bodyHeight: BODY_HEIGHT,
  headRadius: HEAD_RADIUS,
  totalHeight: TOTAL_HEIGHT,
}

'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

// Volleyball court dimensions (in meters)
// Court is 18m long x 9m wide
// Net is at center (9m from each baseline)
// Attack line is 3m from net
const COURT_LENGTH = 18
const COURT_WIDTH = 9
const ATTACK_LINE_DIST = 3 // 3m from net

interface CourtSurfaceProps {
  showZones?: boolean
}

export function CourtSurface({ showZones = true }: CourtSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Court colors
  const courtColor = '#2563eb' // Blue court
  const lineColor = '#ffffff'
  const lineWidth = 2

  // Create court boundary lines
  const halfLength = COURT_LENGTH / 2
  const halfWidth = COURT_WIDTH / 2

  // Boundary points (clockwise from top-left when viewed from above)
  const boundaryPoints: [number, number, number][] = [
    [-halfWidth, 0.01, -halfLength], // Back left (away)
    [halfWidth, 0.01, -halfLength],  // Back right (away)
    [halfWidth, 0.01, halfLength],   // Back right (home)
    [-halfWidth, 0.01, halfLength],  // Back left (home)
    [-halfWidth, 0.01, -halfLength], // Close the loop
  ]

  // Center line (net position)
  const centerLinePoints: [number, number, number][] = [
    [-halfWidth, 0.01, 0],
    [halfWidth, 0.01, 0],
  ]

  // Attack lines (3m from net on each side)
  const attackLineHomePoints: [number, number, number][] = [
    [-halfWidth, 0.01, ATTACK_LINE_DIST],
    [halfWidth, 0.01, ATTACK_LINE_DIST],
  ]

  const attackLineAwayPoints: [number, number, number][] = [
    [-halfWidth, 0.01, -ATTACK_LINE_DIST],
    [halfWidth, 0.01, -ATTACK_LINE_DIST],
  ]

  return (
    <group>
      {/* Court surface */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[COURT_WIDTH, COURT_LENGTH]} />
        <meshStandardMaterial color={courtColor} />
      </mesh>

      {/* Floor around court (darker) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[COURT_WIDTH + 6, COURT_LENGTH + 6]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>

      {/* Boundary lines */}
      <Line
        points={boundaryPoints}
        color={lineColor}
        lineWidth={lineWidth}
      />

      {/* Center line (at net) */}
      <Line
        points={centerLinePoints}
        color={lineColor}
        lineWidth={lineWidth}
      />

      {/* Attack lines */}
      <Line
        points={attackLineHomePoints}
        color={lineColor}
        lineWidth={lineWidth}
      />
      <Line
        points={attackLineAwayPoints}
        color={lineColor}
        lineWidth={lineWidth}
      />

      {/* Zone divider lines (optional) */}
      {showZones && (
        <>
          {/* Vertical zone dividers - thirds of court width */}
          {/* Left third line */}
          <Line
            points={[
              [-halfWidth + COURT_WIDTH / 3, 0.01, -halfLength],
              [-halfWidth + COURT_WIDTH / 3, 0.01, halfLength],
            ]}
            color={lineColor}
            lineWidth={1}
            opacity={0.3}
            transparent
          />
          {/* Right third line */}
          <Line
            points={[
              [halfWidth - COURT_WIDTH / 3, 0.01, -halfLength],
              [halfWidth - COURT_WIDTH / 3, 0.01, halfLength],
            ]}
            color={lineColor}
            lineWidth={1}
            opacity={0.3}
            transparent
          />
        </>
      )}
    </group>
  )
}

// Export court dimensions for use by other components
export const COURT_DIMENSIONS = {
  length: COURT_LENGTH,
  width: COURT_WIDTH,
  halfLength: COURT_LENGTH / 2,
  halfWidth: COURT_WIDTH / 2,
  attackLineDistance: ATTACK_LINE_DIST,
}

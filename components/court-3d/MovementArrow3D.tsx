'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { normalizedTo3D } from './PlayerToken3D'
import { ArrowCurveConfig } from '@/lib/types'

interface MovementArrow3DProps {
  start: { x: number; y: number } // Normalized coords (0-1)
  end: { x: number; y: number }   // Normalized coords (0-1)
  curve?: ArrowCurveConfig | null // Control point for bezier
  color: string // oklch color
  opacity?: number
}

// Convert oklch to hex (same as in PlayerToken3D)
function getHexFromOklch(oklch: string): string {
  const match = oklch.match(/oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/)
  if (!match) return '#888888'

  const hue = parseFloat(match[1])

  const hueColors: Record<number, string> = {
    300: '#9333ea', // Purple
    250: '#2563eb', // Blue
    90: '#f59e0b',  // Amber
    70: '#ea580c',  // Orange
    200: '#0d9488', // Teal
    350: '#db2777', // Pink
    150: '#16a34a', // Green
  }

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

export function MovementArrow3D({
  start,
  end,
  curve,
  color,
  opacity = 0.8,
}: MovementArrow3DProps) {
  const colorHex = getHexFromOklch(color)

  // Convert to 3D coordinates
  const start3D = normalizedTo3D(start)
  const end3D = normalizedTo3D(end)

  // Generate curve points
  const curvePoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const segments = 32
    const y = 0.05 // Slightly above ground

    if (curve) {
      // Quadratic bezier curve
      const control3D = normalizedTo3D(curve)

      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const invT = 1 - t

        // Quadratic bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const x = invT * invT * start3D.x + 2 * invT * t * control3D.x + t * t * end3D.x
        const z = invT * invT * start3D.z + 2 * invT * t * control3D.z + t * t * end3D.z

        points.push(new THREE.Vector3(x, y, z))
      }
    } else {
      // Straight line
      points.push(new THREE.Vector3(start3D.x, y, start3D.z))
      points.push(new THREE.Vector3(end3D.x, y, end3D.z))
    }

    return points
  }, [start, end, curve, start3D, end3D])

  // Calculate arrowhead direction
  const arrowheadPoints = useMemo(() => {
    const y = 0.05
    const arrowLength = 0.3
    const arrowAngle = Math.PI / 6 // 30 degrees

    // Get direction at the end of the curve
    let dx: number, dz: number

    if (curve) {
      // Derivative of quadratic bezier at t=1: 2(P2 - P1)
      const control3D = normalizedTo3D(curve)
      dx = 2 * (end3D.x - control3D.x)
      dz = 2 * (end3D.z - control3D.z)
    } else {
      dx = end3D.x - start3D.x
      dz = end3D.z - start3D.z
    }

    // Normalize
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 0.001) return []

    dx /= len
    dz /= len

    // Rotate for arrowhead wings
    const cos1 = Math.cos(Math.PI - arrowAngle)
    const sin1 = Math.sin(Math.PI - arrowAngle)
    const cos2 = Math.cos(Math.PI + arrowAngle)
    const sin2 = Math.sin(Math.PI + arrowAngle)

    const wing1X = dx * cos1 - dz * sin1
    const wing1Z = dx * sin1 + dz * cos1
    const wing2X = dx * cos2 - dz * sin2
    const wing2Z = dx * sin2 + dz * cos2

    return [
      // Wing 1
      [
        new THREE.Vector3(end3D.x, y, end3D.z),
        new THREE.Vector3(end3D.x + wing1X * arrowLength, y, end3D.z + wing1Z * arrowLength),
      ],
      // Wing 2
      [
        new THREE.Vector3(end3D.x, y, end3D.z),
        new THREE.Vector3(end3D.x + wing2X * arrowLength, y, end3D.z + wing2Z * arrowLength),
      ],
    ]
  }, [start, end, curve, start3D, end3D])

  return (
    <group>
      {/* Main path */}
      <Line
        points={curvePoints}
        color={colorHex}
        lineWidth={3}
        transparent
        opacity={opacity}
      />

      {/* Arrowhead */}
      {arrowheadPoints.map((wing, i) => (
        <Line
          key={i}
          points={wing}
          color={colorHex}
          lineWidth={3}
          transparent
          opacity={opacity}
        />
      ))}
    </group>
  )
}

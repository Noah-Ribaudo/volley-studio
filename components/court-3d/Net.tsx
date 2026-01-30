'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { COURT_DIMENSIONS } from './CourtSurface'

const NET_HEIGHT = 2.43 // Men's net height in meters
const NET_WIDTH = COURT_DIMENSIONS.width + 0.5 // Extends slightly beyond court
const POLE_RADIUS = 0.05
const POLE_HEIGHT = NET_HEIGHT + 0.3 // Poles extend above net

export function Net() {
  const meshRef = useRef<THREE.Mesh>(null)

  const halfWidth = NET_WIDTH / 2
  const poleOffset = COURT_DIMENSIONS.halfWidth + 0.5 // Poles just outside court

  return (
    <group position={[0, 0, 0]}>
      {/* Net mesh - semi-transparent */}
      <mesh
        ref={meshRef}
        position={[0, NET_HEIGHT / 2, 0]}
      >
        <planeGeometry args={[NET_WIDTH, NET_HEIGHT]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Top band of net (white stripe) */}
      <mesh position={[0, NET_HEIGHT - 0.05, 0]}>
        <boxGeometry args={[NET_WIDTH, 0.1, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Left pole */}
      <mesh position={[-poleOffset, POLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Right pole */}
      <mesh position={[poleOffset, POLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Antennas (red/white striped markers at edges) */}
      <mesh position={[-halfWidth, NET_HEIGHT + 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      <mesh position={[halfWidth, NET_HEIGHT + 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    </group>
  )
}

export const NET_DIMENSIONS = {
  height: NET_HEIGHT,
  width: NET_WIDTH,
}

'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { COURT_DIMENSIONS } from './CourtSurface'

export type CameraPreset = 'madden' | 'broadcast' | 'overhead' | 'sideline' | 'free'

interface CameraControllerProps {
  preset: CameraPreset
  enableControls?: boolean
  autoRotate?: boolean
}

// Camera preset positions and targets
const PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  // Madden-style: behind home baseline, looking toward net
  madden: {
    position: [0, 12, COURT_DIMENSIONS.halfLength + 8],
    target: [0, 0, -2],
  },
  // Broadcast: side view from elevated position
  broadcast: {
    position: [COURT_DIMENSIONS.halfWidth + 12, 10, 0],
    target: [0, 0, 0],
  },
  // Overhead: top-down view
  overhead: {
    position: [0, 20, 0.1], // Slight z offset to avoid gimbal lock
    target: [0, 0, 0],
  },
  // Sideline: lower angle from the side
  sideline: {
    position: [COURT_DIMENSIONS.halfWidth + 6, 3, 0],
    target: [0, 1, 0],
  },
  // Free: start position for orbit controls
  free: {
    position: [0, 12, COURT_DIMENSIONS.halfLength + 8],
    target: [0, 0, 0],
  },
}

export function CameraController({
  preset,
  enableControls = true,
  autoRotate = false,
}: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const targetRef = useRef(new THREE.Vector3())
  const positionRef = useRef(new THREE.Vector3())

  // Animate camera to preset position
  useEffect(() => {
    const presetData = PRESETS[preset]
    positionRef.current.set(...presetData.position)
    targetRef.current.set(...presetData.target)
  }, [preset])

  // Smooth camera transition
  useFrame((_, delta) => {
    if (preset === 'free') return // Don't animate in free mode

    // Lerp camera position
    camera.position.lerp(positionRef.current, delta * 3)

    // Update controls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetRef.current, delta * 3)
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enableControls}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={40}
      minPolarAngle={0.1} // Prevent going below ground
      maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below ground
      target={PRESETS[preset].target}
    />
  )
}

export const CAMERA_PRESETS = PRESETS

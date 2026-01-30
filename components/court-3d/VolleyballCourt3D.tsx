'use client'

import { useRef, useState, useCallback, Suspense, useEffect } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { CourtSurface, COURT_DIMENSIONS } from './CourtSurface'
import { Net } from './Net'
import { PlayerToken3D, normalizedTo3D, threeDToNormalized } from './PlayerToken3D'
import { MovementArrow3D } from './MovementArrow3D'
import { CameraController, CameraPreset } from './CameraController'
import {
  Role,
  ROLES,
  PositionCoordinates,
  Position,
  RosterPlayer,
  PositionAssignments,
  ArrowPositions,
  ArrowCurveConfig,
  ROLE_INFO,
  PlayerStatus,
} from '@/lib/types'

interface VolleyballCourt3DProps {
  positions: PositionCoordinates
  awayPositions?: PositionCoordinates
  highlightedRole?: Role | null
  roster?: RosterPlayer[]
  assignments?: PositionAssignments
  onPositionChange?: (role: Role, position: Position) => void
  onAwayPositionChange?: (role: Role, position: Position) => void
  editable?: boolean
  arrows?: ArrowPositions
  onArrowChange?: (role: Role, position: Position | null) => void
  arrowCurves?: Partial<Record<Role, ArrowCurveConfig>>
  showPosition?: boolean
  showPlayer?: boolean
  showLibero?: boolean
  statusFlags?: Partial<Record<Role, PlayerStatus[]>>
  cameraPreset?: CameraPreset
  onCameraPresetChange?: (preset: CameraPreset) => void
}

// Dragging logic component (inside Canvas)
function DraggableScene({
  positions,
  awayPositions,
  highlightedRole,
  roster = [],
  assignments = {},
  onPositionChange,
  onAwayPositionChange,
  editable = true,
  arrows = {},
  arrowCurves = {},
  showPosition = true,
  showPlayer = true,
  showLibero = false,
  statusFlags = {},
  cameraPreset = 'madden',
  onHoverChange,
  onDragChange,
}: Omit<VolleyballCourt3DProps, 'onCameraPresetChange'> & {
  onHoverChange?: (hovering: boolean) => void
  onDragChange?: (dragging: boolean) => void
}) {
  const { camera, gl, raycaster } = useThree()
  const [draggingRole, setDraggingRole] = useState<Role | null>(null)
  const [draggingIsAway, setDraggingIsAway] = useState(false)
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null)
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const intersectionPoint = useRef(new THREE.Vector3())

  // Notify parent of hover/drag state changes
  useEffect(() => {
    onHoverChange?.(hoveredRole !== null)
  }, [hoveredRole, onHoverChange])

  useEffect(() => {
    onDragChange?.(draggingRole !== null)
  }, [draggingRole, onDragChange])

  // Get active roles
  const activeRoles = showLibero ? ROLES : ROLES.filter(r => r !== 'L')

  // Handle drag start
  const handleDragStart = useCallback((role: Role, isAway: boolean) => (e: ThreeEvent<PointerEvent>) => {
    if (!editable) return
    e.stopPropagation()
    setDraggingRole(role)
    setDraggingIsAway(isAway)

    // Capture pointer for drag
    ;(e.target as any)?.setPointerCapture?.(e.pointerId)
  }, [editable])

  // Handle hover enter
  const handleHoverEnter = useCallback((role: Role) => () => {
    if (!editable) return
    setHoveredRole(role)
  }, [editable])

  // Handle hover leave
  const handleHoverLeave = useCallback(() => {
    setHoveredRole(null)
  }, [])

  // Handle pointer move for dragging
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!draggingRole) return

    // Get intersection with ground plane
    raycaster.setFromCamera(
      new THREE.Vector2(
        (e.nativeEvent.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.nativeEvent.clientY / gl.domElement.clientHeight) * 2 + 1
      ),
      camera
    )

    if (raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current)) {
      // Convert to normalized coordinates
      const normalized = threeDToNormalized({
        x: intersectionPoint.current.x,
        z: intersectionPoint.current.z,
      })

      // Clamp to court bounds (with small margin)
      const margin = 0.15
      const clampedX = Math.max(-margin, Math.min(1 + margin, normalized.x))

      // Constrain y based on team (home team stays y >= 0.5, away stays y <= 0.5)
      let clampedY = Math.max(-margin, Math.min(1 + margin, normalized.y))
      if (draggingIsAway) {
        clampedY = Math.min(0.5, clampedY)
      } else {
        clampedY = Math.max(0.5, clampedY)
      }

      // Update position
      const callback = draggingIsAway ? onAwayPositionChange : onPositionChange
      callback?.(draggingRole, { x: clampedX, y: clampedY })
    }
  }, [draggingRole, draggingIsAway, camera, gl, raycaster, onPositionChange, onAwayPositionChange])

  // Handle drag end
  const handlePointerUp = useCallback(() => {
    setDraggingRole(null)
    setDraggingIsAway(false)
  }, [])

  // Get player info for a role
  const getPlayerInfo = (role: Role) => {
    const playerId = assignments[role]
    if (!playerId) return { name: undefined, number: undefined }
    const player = roster.find(p => p.id === playerId)
    return { name: player?.name, number: player?.number }
  }

  // Determine if orbit controls should be disabled
  const disableOrbit = draggingRole !== null || hoveredRole !== null

  return (
    <group
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Ground plane for raycasting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Court surface */}
      <CourtSurface />

      {/* Net */}
      <Net />

      {/* Home team players */}
      {activeRoles.map(role => {
        const pos = positions[role]
        if (!pos) return null

        const { name, number } = getPlayerInfo(role)
        const arrow = arrows[role]
        const curve = arrowCurves[role]
        const flags = statusFlags[role] || []

        return (
          <group key={role}>
            {/* Movement arrow */}
            {arrow && (
              <MovementArrow3D
                start={pos}
                end={arrow}
                curve={curve}
                color={ROLE_INFO[role].color}
              />
            )}

            {/* Player token */}
            <PlayerToken3D
              role={role}
              position={pos}
              name={name}
              number={number}
              showPosition={showPosition}
              showPlayer={showPlayer}
              highlighted={highlightedRole === role}
              dragging={draggingRole === role && !draggingIsAway}
              statusFlags={flags}
              onDragStart={handleDragStart(role, false)}
              onHoverEnter={handleHoverEnter(role)}
              onHoverLeave={handleHoverLeave}
            />
          </group>
        )
      })}

      {/* Away team players (if provided) */}
      {awayPositions && activeRoles.map(role => {
        const pos = awayPositions[role]
        if (!pos) return null

        return (
          <PlayerToken3D
            key={`away-${role}`}
            role={role}
            position={pos}
            showPosition={showPosition}
            showPlayer={false}
            highlighted={false}
            dragging={draggingRole === role && draggingIsAway}
            onDragStart={handleDragStart(role, true)}
            onHoverEnter={handleHoverEnter(role)}
            onHoverLeave={handleHoverLeave}
          />
        )
      })}

      {/* Camera controller - disabled when hovering or dragging players */}
      <CameraController preset={cameraPreset} enableControls={!disableOrbit} />
    </group>
  )
}

export function VolleyballCourt3D(props: VolleyballCourt3DProps) {
  const { cameraPreset = 'madden' } = props
  const [isHoveringPlayer, setIsHoveringPlayer] = useState(false)
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false)

  // Determine cursor style based on interaction state
  const cursorStyle = isDraggingPlayer
    ? 'cursor-grabbing'
    : isHoveringPlayer
      ? 'cursor-grab'
      : 'cursor-default'

  return (
    <div className={`absolute inset-0 ${cursorStyle}`}>
      <Canvas
        shadows
        camera={{
          position: [0, 12, 17],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={50}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
          />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Contact shadows on ground */}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.4}
            scale={30}
            blur={2}
            far={10}
          />

          {/* Scene content */}
          <DraggableScene
            {...props}
            onHoverChange={setIsHoveringPlayer}
            onDragChange={setIsDraggingPlayer}
          />
        </Suspense>
      </Canvas>

      {/* Camera preset selector overlay */}
      {props.onCameraPresetChange && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {(['madden', 'broadcast', 'overhead', 'sideline', 'free'] as CameraPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => props.onCameraPresetChange?.(preset)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                cameraPreset === preset
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800/80 text-white hover:bg-gray-700'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

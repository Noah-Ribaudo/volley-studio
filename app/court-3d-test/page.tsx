'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PositionCoordinates, Position, Role, ArrowPositions, ArrowCurveConfig } from '@/lib/types'
import type { CameraPreset } from '@/components/court-3d'

// Dynamic import to avoid SSR issues with Three.js
const VolleyballCourt3D = dynamic(
  () => import('@/components/court-3d').then(mod => mod.VolleyballCourt3D),
  { ssr: false }
)

// Default positions for testing (rotation 1, serve phase)
const DEFAULT_POSITIONS: PositionCoordinates = {
  S: { x: 0.83, y: 0.58 },   // Front right (zone 2)
  OH1: { x: 0.5, y: 0.83 },  // Back center (zone 6)
  OH2: { x: 0.17, y: 0.58 }, // Front left (zone 4)
  MB1: { x: 0.5, y: 0.58 },  // Front center (zone 3)
  MB2: { x: 0.17, y: 0.83 }, // Back left (zone 5)
  OPP: { x: 0.83, y: 0.83 }, // Back right (zone 1)
  L: { x: 0.5, y: 0.9 },     // Libero - back
}

// Default away positions (mirrored)
const DEFAULT_AWAY_POSITIONS: PositionCoordinates = {
  S: { x: 0.17, y: 0.42 },
  OH1: { x: 0.5, y: 0.17 },
  OH2: { x: 0.83, y: 0.42 },
  MB1: { x: 0.5, y: 0.42 },
  MB2: { x: 0.83, y: 0.17 },
  OPP: { x: 0.17, y: 0.17 },
}

export default function Court3DTestPage() {
  const [positions, setPositions] = useState<PositionCoordinates>(DEFAULT_POSITIONS)
  const [awayPositions, setAwayPositions] = useState<PositionCoordinates>(DEFAULT_AWAY_POSITIONS)
  const [arrows, setArrows] = useState<ArrowPositions>({})
  const [arrowCurves, setArrowCurves] = useState<Partial<Record<Role, ArrowCurveConfig>>>({})
  const [highlightedRole, setHighlightedRole] = useState<Role | null>(null)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('madden')
  const [showLibero, setShowLibero] = useState(true)
  const [showPosition, setShowPosition] = useState(true)
  const [showPlayer, setShowPlayer] = useState(false)

  // Handle position changes
  const handlePositionChange = (role: Role, position: Position) => {
    setPositions(prev => ({ ...prev, [role]: position }))
  }

  const handleAwayPositionChange = (role: Role, position: Position) => {
    setAwayPositions(prev => ({ ...prev, [role]: position }))
  }

  // Add sample arrows
  const addSampleArrows = () => {
    setArrows({
      OH1: { x: 0.3, y: 0.6 },  // OH1 moving toward front left
      MB1: { x: 0.5, y: 0.55 }, // MB1 moving to net
      OPP: { x: 0.7, y: 0.6 },  // OPP moving toward front
    })
    setArrowCurves({
      OH1: { x: 0.35, y: 0.75 }, // Curved path
    })
  }

  const clearArrows = () => {
    setArrows({})
    setArrowCurves({})
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Controls bar */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-white font-semibold">3D Court Test</h1>

        <div className="flex-1" />

        {/* Toggle options */}
        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={showLibero}
            onChange={e => setShowLibero(e.target.checked)}
            className="rounded"
          />
          Libero
        </label>

        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={showPosition}
            onChange={e => setShowPosition(e.target.checked)}
            className="rounded"
          />
          Position Labels
        </label>

        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={showPlayer}
            onChange={e => setShowPlayer(e.target.checked)}
            className="rounded"
          />
          Player Names
        </label>

        <div className="h-6 w-px bg-gray-600" />

        <button
          onClick={addSampleArrows}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500"
        >
          Add Arrows
        </button>

        <button
          onClick={clearArrows}
          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
        >
          Clear Arrows
        </button>
      </div>

      {/* 3D Court */}
      <div className="flex-1 relative min-h-0">
        <VolleyballCourt3D
          positions={positions}
          awayPositions={awayPositions}
          highlightedRole={highlightedRole}
          onPositionChange={handlePositionChange}
          onAwayPositionChange={handleAwayPositionChange}
          arrows={arrows}
          arrowCurves={arrowCurves}
          showPosition={showPosition}
          showPlayer={showPlayer}
          showLibero={showLibero}
          cameraPreset={cameraPreset}
          onCameraPresetChange={setCameraPreset}
          editable={true}
        />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 text-gray-400 text-sm">
        <p>
          <strong>Controls:</strong> Click and drag players to move them. Use the camera preset buttons to change view angles.
          Scroll to zoom, drag to rotate (in Free mode), right-click drag to pan.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Rotation, Role, ROLE_INFO } from '@/lib/types'
import { getRoleZone, isInFrontRow } from '@/lib/rotations'
import { cn } from '@/lib/utils'

interface RotationOverlayProps {
  rotation: Rotation
  isReceiving: boolean
  onClose: () => void
}

// All roles to display (including libero)
const ALL_ROLES: Role[] = ['S', 'OH1', 'OH2', 'MB1', 'MB2', 'OPP', 'L']

// Zone positions on court (percentages)
// Court layout: net at top, zones 4-3-2 front, 5-6-1 back
const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  4: { x: 20, y: 25 },  // front left
  3: { x: 50, y: 20 },  // front center
  2: { x: 80, y: 25 },  // front right
  5: { x: 20, y: 75 },  // back left
  6: { x: 50, y: 70 },  // back center
  1: { x: 80, y: 75 },  // back right
}

// Libero position (replaces back row MB, slightly offset)
const LIBERO_OFFSET = { x: 0, y: 5 }

export function RotationOverlay({ rotation, isReceiving, onClose }: RotationOverlayProps) {
  const [currentRotation, setCurrentRotation] = useState<Rotation>(rotation)

  // Navigate rotations
  const nextRotation = () => {
    setCurrentRotation(prev => prev === 6 ? 1 : (prev + 1) as Rotation)
  }

  const prevRotation = () => {
    setCurrentRotation(prev => prev === 1 ? 6 : (prev - 1) as Rotation)
  }

  // Get position for each role
  const getPosition = (role: Role) => {
    if (role === 'L') {
      // Libero replaces back row MB - find which MB is in back row
      const mb1Zone = getRoleZone(currentRotation, 'MB1')
      const mb2Zone = getRoleZone(currentRotation, 'MB2')
      const backRowMBZone = !isInFrontRow(currentRotation, 'MB1') ? mb1Zone : mb2Zone
      const basePos = ZONE_POSITIONS[backRowMBZone]
      return {
        x: basePos.x + LIBERO_OFFSET.x,
        y: basePos.y + LIBERO_OFFSET.y,
      }
    }
    const zone = getRoleZone(currentRotation, role)
    return ZONE_POSITIONS[zone]
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Rotation {currentRotation}</h2>
          {currentRotation === rotation && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">
              Current
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Court visualization */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          {/* Court background */}
          <div className="absolute inset-0 bg-amber-900/30 rounded-xl border-2 border-amber-700/50">
            {/* Net */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-300/80 rounded-t-xl" />

            {/* Attack line (3m line) */}
            <div className="absolute top-[33%] left-0 right-0 h-0.5 bg-white/30" />

            {/* Center line vertical */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
          </div>

          {/* Players */}
          {ALL_ROLES.filter(role => {
            // Hide back row MB when showing libero
            if (role === 'L') return true
            if (role === 'MB1' && !isInFrontRow(currentRotation, 'MB1')) return false
            if (role === 'MB2' && !isInFrontRow(currentRotation, 'MB2')) return false
            return true
          }).map(role => {
            const roleInfo = ROLE_INFO[role]
            const pos = getPosition(role)
            const zone = role === 'L' ? null : getRoleZone(currentRotation, role)

            return (
              <div
                key={role}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center text-base font-bold border-2 shadow-lg transition-colors",
                    role === 'L' && "border-dashed"
                  )}
                  style={{
                    backgroundColor: `${roleInfo.color}25`,
                    borderColor: roleInfo.color,
                    color: roleInfo.color,
                  }}
                >
                  {role}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 whitespace-nowrap">
                  {roleInfo.name}
                  {zone && <span className="text-zinc-600 ml-1">Z{zone}</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-zinc-800">
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
          <span>Front Row: Zones 4-3-2</span>
          <span>•</span>
          <span>Back Row: Zones 5-6-1</span>
        </div>
      </div>

      {/* Rotation navigation */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <button
            onClick={prevRotation}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">R{currentRotation === 1 ? 6 : currentRotation - 1}</span>
          </button>

          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as Rotation[]).map(r => (
              <button
                key={r}
                onClick={() => setCurrentRotation(r)}
                className={cn(
                  "w-8 h-8 rounded-full text-sm font-bold transition-colors",
                  r === currentRotation
                    ? "bg-primary text-primary-foreground"
                    : r === rotation
                      ? "bg-green-900/50 text-green-400 border border-green-600"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={nextRotation}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <span className="text-sm">R{currentRotation === 6 ? 1 : currentRotation + 1}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Return to current rotation */}
        {currentRotation !== rotation && (
          <div className="text-center mt-3">
            <button
              onClick={() => setCurrentRotation(rotation)}
              className="text-sm text-green-400 hover:text-green-300"
            >
              ← Back to current rotation (R{rotation})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

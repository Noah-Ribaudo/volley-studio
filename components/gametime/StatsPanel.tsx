'use client'

import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { RallyEvent } from '@/lib/gametime/types'
import { Rotation } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatsPanelProps {
  history: RallyEvent[]
  currentRotation: Rotation
  onClose: () => void
}

interface RotationStats {
  rotation: Rotation
  pointsWon: number
  pointsLost: number
  rallies: number
  winRate: number
  servingWins: number
  receivingWins: number
}

export function StatsPanel({ history, currentRotation, onClose }: StatsPanelProps) {
  // Calculate stats by rotation
  const rotationStats: RotationStats[] = ([1, 2, 3, 4, 5, 6] as Rotation[]).map(rotation => {
    const rotationRallies = history.filter(r => r.rotation === rotation)
    const pointsWon = rotationRallies.filter(r => r.winner === 'us').length
    const pointsLost = rotationRallies.filter(r => r.winner === 'them').length
    const servingWins = rotationRallies.filter(r => r.winner === 'us' && r.serving === 'us').length
    const receivingWins = rotationRallies.filter(r => r.winner === 'us' && r.serving === 'them').length

    return {
      rotation,
      pointsWon,
      pointsLost,
      rallies: rotationRallies.length,
      winRate: rotationRallies.length > 0 ? pointsWon / rotationRallies.length : 0,
      servingWins,
      receivingWins,
    }
  })

  // Overall stats
  const totalWins = history.filter(r => r.winner === 'us').length
  const totalLosses = history.filter(r => r.winner === 'them').length
  const overallWinRate = history.length > 0 ? totalWins / history.length : 0

  // Find best and worst rotations
  const sortedByWinRate = [...rotationStats]
    .filter(s => s.rallies >= 2) // Only count rotations with enough data
    .sort((a, b) => b.winRate - a.winRate)

  const bestRotation = sortedByWinRate[0]
  const worstRotation = sortedByWinRate[sortedByWinRate.length - 1]

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-lg font-semibold">Game Stats</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Overall */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
              Overall Performance
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{totalWins}</div>
                <div className="text-xs text-zinc-500">Points Won</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{totalLosses}</div>
                <div className="text-xs text-zinc-500">Points Lost</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(overallWinRate * 100)}%</div>
                <div className="text-xs text-zinc-500">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Best/Worst rotations */}
          {sortedByWinRate.length >= 2 && (
            <div className="grid grid-cols-2 gap-3">
              {bestRotation && (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Strongest</span>
                  </div>
                  <div className="text-2xl font-bold">R{bestRotation.rotation}</div>
                  <div className="text-sm text-zinc-400">
                    {Math.round(bestRotation.winRate * 100)}% ({bestRotation.pointsWon}-{bestRotation.pointsLost})
                  </div>
                </div>
              )}
              {worstRotation && worstRotation !== bestRotation && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Needs Work</span>
                  </div>
                  <div className="text-2xl font-bold">R{worstRotation.rotation}</div>
                  <div className="text-sm text-zinc-400">
                    {Math.round(worstRotation.winRate * 100)}% ({worstRotation.pointsWon}-{worstRotation.pointsLost})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By rotation breakdown */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
              By Rotation
            </h3>
            <div className="space-y-2">
              {rotationStats.map(stats => (
                <div
                  key={stats.rotation}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg border",
                    stats.rotation === currentRotation
                      ? "bg-zinc-800 border-zinc-600"
                      : "bg-zinc-800/50 border-zinc-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      stats.rotation === currentRotation
                        ? "bg-primary text-primary-foreground"
                        : "bg-zinc-700"
                    )}>
                      {stats.rotation}
                    </span>
                    <div>
                      <div className="font-medium">Rotation {stats.rotation}</div>
                      {stats.rallies > 0 && (
                        <div className="text-xs text-zinc-500">
                          {stats.servingWins}W serving · {stats.receivingWins}W receiving
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.rallies === 0 ? (
                      <span className="text-zinc-500 text-sm">No data</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-green-400">{stats.pointsWon}</span>
                          <span className="text-zinc-500">-</span>
                          <span className="text-red-400">{stats.pointsLost}</span>
                        </div>
                        <div className={cn(
                          "text-xs",
                          stats.winRate > 0.5 ? "text-green-400" :
                          stats.winRate < 0.5 ? "text-red-400" : "text-zinc-400"
                        )}>
                          {Math.round(stats.winRate * 100)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching insight */}
          {sortedByWinRate.length >= 2 && worstRotation && worstRotation.winRate < 0.4 && (
            <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
              <h4 className="font-medium text-amber-400 mb-2">💡 Coaching Tip</h4>
              <p className="text-sm text-zinc-300">
                Rotation {worstRotation.rotation} is struggling with a {Math.round(worstRotation.winRate * 100)}% win rate.
                Consider running some plays from this rotation in practice.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

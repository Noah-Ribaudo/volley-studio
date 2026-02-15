'use client'

import { useState } from 'react'
import { X, Check, RotateCw } from 'lucide-react'
import { Rotation } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TimeoutChecklistProps {
  rotation: Rotation
  ourScore: number
  theirScore: number
  serving: 'us' | 'them'
  onClose: () => void
}

interface ChecklistItem {
  id: string
  category: 'mental' | 'tactical' | 'physical'
  label: string
  tip?: string
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Mental
  { id: 'breathe', category: 'mental', label: 'Take 3 deep breaths', tip: 'Reset the nervous system' },
  { id: 'focus', category: 'mental', label: 'Focus on next point only', tip: 'One point at a time' },
  { id: 'positive', category: 'mental', label: 'Give positive talk', tip: '"Great effort" not "Don\'t miss"' },

  // Tactical
  { id: 'serve', category: 'tactical', label: 'Check serve target', tip: 'Where are we serving?' },
  { id: 'block', category: 'tactical', label: 'Review blocking scheme', tip: 'Who\'s our best blocker against their hitter?' },
  { id: 'offense', category: 'tactical', label: 'Confirm offensive plays', tip: 'What plays are working?' },

  // Physical
  { id: 'water', category: 'physical', label: 'Hydrate', tip: 'Quick sip of water' },
  { id: 'stretch', category: 'physical', label: 'Quick stretch', tip: 'Shoulders, legs, ankles' },
]

const CATEGORY_LABELS: Record<string, string> = {
  mental: '🧠 Mental',
  tactical: '📋 Tactical',
  physical: '💪 Physical',
}

export function TimeoutChecklist({ rotation, ourScore, theirScore, serving, onClose }: TimeoutChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setChecked(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const resetChecklist = () => {
    setChecked(new Set())
  }

  // Group items by category
  const groupedItems = CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  // Calculate game context
  const pointDiff = ourScore - theirScore
  const isCloseGame = Math.abs(pointDiff) <= 3
  const isBehind = pointDiff < -2
  const isAhead = pointDiff > 2

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <div>
            <h2 className="text-lg font-semibold">Timeout Checklist</h2>
            <p className="text-sm text-zinc-400">
              R{rotation} · {ourScore}-{theirScore} · {serving === 'us' ? 'We serve' : 'They serve'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetChecklist}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Reset checklist"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Context-aware tip */}
        <div className="p-4 pb-0">
          <div className={cn(
            "rounded-xl p-4 border",
            isBehind ? "bg-amber-900/30 border-amber-700" :
            isAhead ? "bg-green-900/30 border-green-700" :
            "bg-blue-900/30 border-blue-700"
          )}>
            <p className="text-sm">
              {isBehind && (
                <>
                  <span className="font-medium">Behind by {Math.abs(pointDiff)}</span> —
                  Focus on positive energy. Remind players of what&apos;s working, not what&apos;s broken.
                </>
              )}
              {isAhead && (
                <>
                  <span className="font-medium">Leading by {pointDiff}</span> —
                  Stay focused. Keep the same intensity. Don&apos;t let them back in.
                </>
              )}
              {isCloseGame && !isBehind && !isAhead && (
                <>
                  <span className="font-medium">Close game</span> —
                  Big points ahead. Focus on execution and communication.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 rounded-lg border transition-all text-left",
                      checked.has(item.id)
                        ? "bg-green-900/30 border-green-700"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      checked.has(item.id)
                        ? "bg-green-500 text-white"
                        : "border-2 border-zinc-500"
                    )}>
                      {checked.has(item.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-medium",
                        checked.has(item.id) && "text-green-400"
                      )}>
                        {item.label}
                      </div>
                      {item.tip && (
                        <div className="text-xs text-zinc-500 mt-0.5">{item.tip}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  )
}

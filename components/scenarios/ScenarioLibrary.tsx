'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { allScenarios, searchScenarios } from '@/lib/scenarios'
import type { Scenario, ScenarioCategory, ScenarioDifficulty } from '@/lib/scenarios'
import { useAppStore } from '@/store/useAppStore'
import { Cancel01Icon, Search01Icon, BookOpen01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Phase } from '@/lib/types'

interface ScenarioLibraryProps {
  onClose: () => void
}

const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  'serve-receive': 'Serve Receive',
  'transition': 'Transition',
  'defense': 'Defense',
  'blocking': 'Blocking',
  'setting': 'Setting',
  'overlap-rules': 'Overlap Rules',
  'rotation-specific': 'Rotation Specific',
  'game-situation': 'Game Situations',
}

const DIFFICULTY_COLORS: Record<ScenarioDifficulty, string> = {
  beginner: 'bg-green-500/10 text-green-600 dark:text-green-400',
  intermediate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  advanced: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function ScenarioLibrary({ onClose }: ScenarioLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | 'all'>('all')
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)

  const { setRotation, setPhase, setHighlightedRole, setIsReceivingContext } = useAppStore()

  // Filter scenarios
  const filteredScenarios = searchQuery
    ? searchScenarios(searchQuery)
    : selectedCategory === 'all'
      ? allScenarios
      : allScenarios.filter(s => s.category === selectedCategory)

  // Load a scenario into the whiteboard
  const loadScenario = useCallback((scenario: Scenario) => {
    setRotation(scenario.rotation)
    setPhase(scenario.phase as Phase)
    setIsReceivingContext(scenario.isReceiving)
    if (scenario.highlightRole) {
      setHighlightedRole(scenario.highlightRole)
    } else {
      setHighlightedRole(null)
    }
    onClose()
  }, [setRotation, setPhase, setIsReceivingContext, setHighlightedRole, onClose])

  // Categories for filter
  const categories: (ScenarioCategory | 'all')[] = [
    'all',
    'serve-receive',
    'transition',
    'defense',
    'overlap-rules',
    'game-situation',
  ]

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={BookOpen01Icon} className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Scenario Library</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
          <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 py-2 border-b overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Scenario list */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4",
          selectedScenario && "hidden md:block md:w-1/2"
        )}>
          <div className="space-y-3">
            {filteredScenarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scenarios found. Try a different search or category.
              </div>
            ) : (
              filteredScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    "hover:border-primary/50 hover:bg-muted/50",
                    selectedScenario?.id === scenario.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{scenario.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {scenario.description}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full whitespace-nowrap",
                      DIFFICULTY_COLORS[scenario.difficulty]
                    )}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {scenario.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Scenario detail panel */}
        {selectedScenario && (
          <div className={cn(
            "flex-1 overflow-y-auto border-l bg-muted/20",
            "md:w-1/2"
          )}>
            {/* Mobile back button */}
            <div className="md:hidden p-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedScenario(null)}
              >
                ← Back to list
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold">{selectedScenario.title}</h2>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    DIFFICULTY_COLORS[selectedScenario.difficulty]
                  )}>
                    {selectedScenario.difficulty}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2">{selectedScenario.description}</p>
              </div>

              {/* Info badges */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm px-3 py-1.5 rounded-lg bg-muted">
                  Rotation {selectedScenario.rotation}
                </span>
                <span className="text-sm px-3 py-1.5 rounded-lg bg-muted">
                  {selectedScenario.isReceiving ? 'Receiving' : 'Serving'}
                </span>
                <span className="text-sm px-3 py-1.5 rounded-lg bg-muted">
                  {CATEGORY_LABELS[selectedScenario.category]}
                </span>
              </div>

              {/* Focus points */}
              <div>
                <h3 className="font-semibold mb-2">Focus Points</h3>
                <ul className="space-y-2">
                  {selectedScenario.focusPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common mistakes */}
              {selectedScenario.commonMistakes && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                    Common Mistakes
                  </h3>
                  <ul className="space-y-2">
                    {selectedScenario.commonMistakes.map((mistake, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-red-500">✗</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coaching tips */}
              {selectedScenario.coachingTips && (
                <div>
                  <h3 className="font-semibold mb-2 text-green-600 dark:text-green-400">
                    Coaching Tips
                  </h3>
                  <ul className="space-y-2">
                    {selectedScenario.coachingTips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Load button */}
              <Button
                size="lg"
                onClick={() => loadScenario(selectedScenario)}
                className="w-full"
              >
                Load Scenario
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RotateCcw, CheckCircle2, Lightbulb, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useSituationStore,
  contextToBlackboard,
  extractDecisionFromTrace,
  type GameContext,
  type ContextQuestion,
} from '@/store/useSituationStore'
import { useBTEditorStore, type PlayerRole } from '@/store/useBTEditorStore'
import { createTreeFromPreset, getDefaultPresetId } from '@/lib/bt-editor/presets'
import { roleDisplayNames } from '@/lib/bt-editor/sampleTrace'
import type { BTContext } from '@/lib/sim/bt'

const roles: PlayerRole[] = ['setter', 'outside', 'opposite', 'middle', 'libero']

interface SituationBuilderProps {
  className?: string
  onTraceGenerated?: (trace: import('@/lib/sim/trace').BTNodeTrace) => void
}

export default function SituationBuilder({ className, onTraceGenerated }: SituationBuilderProps) {
  const {
    context,
    role,
    result,
    isContextComplete,
    setContext,
    resetContext,
    setResult,
    getRelevantQuestions,
    isQuestionAnswered,
  } = useSituationStore()

  const { selectedRole, setSelectedRole, setCurrentTrace } = useBTEditorStore()

  // Sync role from editor store and reset context when role changes
  useEffect(() => {
    const store = useSituationStore.getState()
    store.setRole(selectedRole)
    store.resetContext()
  }, [selectedRole])

  // Run the BT when context is complete
  const runTree = useCallback(() => {
    if (!isContextComplete) return

    const presetId = getDefaultPresetId(role)
    const tree = createTreeFromPreset(presetId)
    if (!tree) return

    const { blackboard, player } = contextToBlackboard(context, role)

    const btContext: BTContext = {
      blackboard,
      self: player,
      allPlayers: [player],
      simTimeMs: 5000,
    }

    const btResult = tree.tick(btContext)
    const decision = extractDecisionFromTrace(btResult.trace)

    setResult(decision)
    setCurrentTrace(btResult.trace)
    onTraceGenerated?.(btResult.trace)
  }, [context, role, isContextComplete, setResult, setCurrentTrace, onTraceGenerated])

  // Auto-run when context becomes complete
  useEffect(() => {
    if (isContextComplete) {
      runTree()
    }
  }, [isContextComplete, runTree])

  const relevantQuestions = getRelevantQuestions()

  // Group questions by category
  const questionsByCategory = relevantQuestions.reduce(
    (acc, q) => {
      if (!acc[q.category]) acc[q.category] = []
      acc[q.category].push(q)
      return acc
    },
    {} as Record<string, ContextQuestion[]>
  )

  return (
    <div className={cn('flex flex-col h-full bg-slate-900', className)}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Build the Situation</h2>
            <p className="text-[11px] text-slate-400">Answer to see what the player decides</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetContext} className="text-slate-400 h-7 px-2">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>

        {/* Role selector */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">Playing as</label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PlayerRole)}>
            <SelectTrigger className="w-full h-8 bg-slate-800 border-slate-600">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleDisplayNames[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(questionsByCategory).map(([category, questions]) => (
          <div key={category} className="space-y-1.5">
            <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {category}
            </h3>
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={context[q.id]}
                isAnswered={isQuestionAnswered(q.id)}
                onChange={(val) => setContext(q.id, val as GameContext[typeof q.id])}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="border-t border-slate-700 bg-slate-800/50">
          <DecisionResult result={result} />
        </div>
      )}

      {/* Progress indicator when not complete */}
      {!isContextComplete && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ChevronRight className="w-3.5 h-3.5" />
            <span>
              {relevantQuestions.filter((q) => !isQuestionAnswered(q.id)).length} more to see decision
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Question Card
// ============================================================================

interface QuestionCardProps {
  question: ContextQuestion
  value: unknown
  isAnswered: boolean
  onChange: (value: unknown) => void
}

function QuestionCard({ question, value, isAnswered, onChange }: QuestionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 transition-all',
        isAnswered
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-slate-800 border-amber-500/30'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-slate-200">
          {question.question}
        </span>
        {isAnswered && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {question.options.map((opt) => {
          const isSelected = value === opt.value
          return (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs transition-all',
                'border',
                isSelected
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Decision Result
// ============================================================================

interface DecisionResultProps {
  result: {
    thought: string
    goalType: string
    nodePath: string[]
  }
}

function DecisionResult({ result }: DecisionResultProps) {
  return (
    <div className="p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Lightbulb className="w-3 h-3 text-amber-400" />
        </div>
        <span className="text-xs font-medium text-slate-300">Player&apos;s thought</span>
      </div>

      {/* The thought/decision */}
      <div className="bg-slate-900 rounded px-2.5 py-2 border border-slate-700">
        <p className="text-sm text-slate-100 leading-snug">{result.thought}</p>
      </div>

      {/* Path taken */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-slate-500 mr-1">Path:</span>
        {result.nodePath.slice(-4).map((node, i) => (
          <Badge
            key={i}
            variant="outline"
            className="bg-slate-800 border-slate-600 text-slate-400 text-[10px] px-1.5 py-0"
          >
            {formatNodeName(node)}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function formatNodeName(name: string): string {
  // Convert CamelCase to readable
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

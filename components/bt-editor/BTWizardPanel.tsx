'use client'

import { useBTWizardStore, type WizardQuestion } from '@/store/useBTWizardStore'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, RotateCcw, Eye, Focus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BTWizardPanelProps {
  className?: string
}

export default function BTWizardPanel({ className }: BTWizardPanelProps) {
  const {
    isWizardActive,
    highlightMode,
    visitedPath,
    currentNodeId,
    getCurrentQuestion,
    answerCondition,
    selectBranch,
    goBack,
    reset,
    setHighlightMode,
  } = useBTWizardStore()

  const question = getCurrentQuestion()

  if (!isWizardActive) return null

  return (
    <div className={cn(
      'w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="font-semibold text-slate-100">Explore Mode</h2>
        <p className="text-xs text-slate-400 mt-1">
          Answer questions to navigate the decision tree
        </p>
      </div>

      {/* Progress breadcrumb */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Progress:</span>
          <span className="font-mono text-slate-300">
            {visitedPath.length} steps
          </span>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {question ? (
          <QuestionDisplay
            question={question}
            onAnswerCondition={answerCondition}
            onSelectBranch={selectBranch}
          />
        ) : currentNodeId ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-200 font-medium">End of path</p>
            <p className="text-sm text-slate-400 mt-1">
              You&apos;ve reached a terminal node
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={reset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            Loading tree...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-slate-700 space-y-4">
        {/* Highlight mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {highlightMode === 'cumulative' ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Focus className="w-4 h-4" />
            )}
            <span>
              {highlightMode === 'cumulative' ? 'Full path' : 'Focus mode'}
            </span>
          </div>
          <Switch
            checked={highlightMode === 'focused'}
            onCheckedChange={(checked) =>
              setHighlightMode(checked ? 'focused' : 'cumulative')
            }
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={goBack}
            disabled={visitedPath.length <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={reset}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

interface QuestionDisplayProps {
  question: WizardQuestion
  onAnswerCondition: (nodeId: string, answer: boolean) => void
  onSelectBranch: (nodeId: string, childIndex: number) => void
}

function QuestionDisplay({
  question,
  onAnswerCondition,
  onSelectBranch,
}: QuestionDisplayProps) {
  const isCondition = question.type === 'condition'

  return (
    <div className="space-y-4">
      {/* Node type badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            isCondition
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-blue-500/20 text-blue-300'
          )}
        >
          {isCondition ? 'Condition' : 'Choose a path'}
        </span>
      </div>

      {/* Question text */}
      <div className="space-y-1">
        <p className="text-xs text-slate-400">{question.nodeName}</p>
        <p className="text-slate-100 font-medium leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2 pt-2">
        {isCondition ? (
          // Yes/No buttons for conditions
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-green-600/50 hover:bg-green-600/20 hover:border-green-500 text-green-400"
              onClick={() => onAnswerCondition(question.nodeId, true)}
            >
              Yes
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-600/50 hover:bg-red-600/20 hover:border-red-500 text-red-400"
              onClick={() => onAnswerCondition(question.nodeId, false)}
            >
              No
            </Button>
          </div>
        ) : (
          // Selection buttons for selector nodes
          question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4"
              onClick={() => onSelectBranch(question.nodeId, index)}
            >
              <span className="text-blue-400 mr-2">{index + 1}.</span>
              <span className="text-slate-200">{option}</span>
            </Button>
          ))
        )}
      </div>
    </div>
  )
}

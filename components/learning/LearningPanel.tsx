'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getLessonById, getNextLesson } from '@/lib/learning/allModules'
import { Button } from '@/components/ui/button'
import { DragHandle } from '@/components/ui/drag-handle'
import { useDraggable } from '@/hooks/useDraggable'
import { cn } from '@/lib/utils'
import type { Phase, Role } from '@/lib/types'
import type { LearningPanelPosition, QuizOption } from '@/lib/learning/types'
import { Cancel01Icon, CheckmarkCircle01Icon, Cancel01Icon as XCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function LearningPanel() {
  const {
    learningMode,
    learningLessonId,
    learningStepIndex,
    learningPanelPosition,
    learningSelectedRole,
    advanceLearningStep,
    prevLearningStep,
    exitLearning,
    completeLearningLesson,
    startLesson,
    setRotation,
    setPhase,
    setHighlightedRole,
    setLearningSelectedRole,
  } = useAppStore()

  // Get the current lesson
  const lesson = learningLessonId ? getLessonById(learningLessonId) : null
  const currentStep = lesson?.steps[learningStepIndex]
  const isLastStep = lesson ? learningStepIndex >= lesson.steps.length - 1 : false
  const isFirstStep = learningStepIndex === 0

  // Check if there's a next module
  const nextLesson = lesson ? getNextLesson(lesson.id) : null

  // Ref for auto-advance timeout
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)

  // Handle advancing to next step
  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeLearningLesson()
    } else {
      advanceLearningStep()
    }
  }, [isLastStep, completeLearningLesson, advanceLearningStep])

  // Handle going back
  const handleBack = useCallback(() => {
    prevLearningStep()
  }, [prevLearningStep])

  // Handle close
  const handleClose = useCallback(() => {
    setHighlightedRole(null)
    exitLearning()
  }, [exitLearning, setHighlightedRole])

  // Handle role selection
  const handleRoleSelect = useCallback((role: Role) => {
    setLearningSelectedRole(role)
    advanceLearningStep()
  }, [setLearningSelectedRole, advanceLearningStep])

  // Handle continuing to next module
  const handleNextModule = useCallback(() => {
    if (nextLesson) {
      startLesson(nextLesson.id)
    }
  }, [nextLesson, startLesson])

  // Apply step's court state when step changes
  useEffect(() => {
    if (!currentStep || !learningMode) return

    // Apply rotation if specified
    if (currentStep.rotation !== undefined) {
      setRotation(currentStep.rotation)
    }

    // Apply phase if specified
    if (currentStep.phase !== undefined) {
      setPhase(currentStep.phase as Phase)
    }

    // Apply highlight if specified
    if (currentStep.highlightRole !== undefined) {
      setHighlightedRole(currentStep.highlightRole)
    } else {
      // Clear highlight if not specified
      setHighlightedRole(null)
    }

    // Handle auto-advance
    if (currentStep.advance === 'auto' && currentStep.autoAdvanceDelay) {
      autoAdvanceRef.current = setTimeout(() => {
        if (!isLastStep) {
          advanceLearningStep()
        }
      }, currentStep.autoAdvanceDelay)
    }

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current)
        autoAdvanceRef.current = null
      }
    }
  }, [
    currentStep,
    learningMode,
    learningStepIndex,
    isLastStep,
    setRotation,
    setPhase,
    setHighlightedRole,
    advanceLearningStep,
  ])

  // Calculate progress
  const progress = lesson ? ((learningStepIndex + 1) / lesson.steps.length) * 100 : 0

  if (!learningMode || !lesson) return null

  // Render the appropriate layout based on position setting
  return (
    <LearningPanelLayout
      position={learningPanelPosition}
      lesson={lesson}
      currentStep={currentStep}
      stepIndex={learningStepIndex}
      totalSteps={lesson.steps.length}
      progress={progress}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      nextLesson={nextLesson}
      onNext={handleNext}
      onBack={handleBack}
      onClose={handleClose}
      onRoleSelect={handleRoleSelect}
      onNextModule={handleNextModule}
      selectedRole={learningSelectedRole}
    />
  )
}

interface LearningPanelLayoutProps {
  position: LearningPanelPosition
  lesson: { title: string }
  currentStep: {
    content: string
    subtitle?: string
    advance: 'tap' | 'auto' | 'role-select' | 'quiz' | 'tap-court'
    roleOptions?: Role[]
    quizOptions?: QuizOption[]
    successFeedback?: string
    failureFeedback?: string
  } | undefined
  stepIndex: number
  totalSteps: number
  progress: number
  isFirstStep: boolean
  isLastStep: boolean
  nextLesson: { id: string; title: string } | null | undefined
  onNext: () => void
  onBack: () => void
  onClose: () => void
  onRoleSelect: (role: Role) => void
  onNextModule: () => void
  selectedRole: Role | null
}

function LearningPanelLayout({
  position,
  lesson,
  currentStep,
  stepIndex,
  totalSteps,
  progress,
  isFirstStep,
  isLastStep,
  nextLesson,
  onNext,
  onBack,
  onClose,
  onRoleSelect,
  onNextModule,
  selectedRole,
}: LearningPanelLayoutProps) {
  // Quiz answer state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Reset quiz state when step changes
  useEffect(() => {
    setSelectedAnswer(null)
    setShowFeedback(false)
    setIsCorrect(false)
  }, [stepIndex])

  // Handle quiz answer selection
  const handleQuizAnswer = (index: number, option: QuizOption) => {
    setSelectedAnswer(index)
    setIsCorrect(option.correct)
    setShowFeedback(true)
  }

  // Handle continuing after quiz feedback
  const handleQuizContinue = () => {
    if (isCorrect) {
      onNext()
    } else {
      // Reset to try again
      setSelectedAnswer(null)
      setShowFeedback(false)
    }
  }

  // Shared content component
  const Content = (
    <>
      {currentStep && (
        <div className="space-y-3">
          <p className="text-sm sm:text-base leading-relaxed">{currentStep.content}</p>
          {currentStep.subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {currentStep.subtitle}
            </p>
          )}

          {/* Role Selection UI */}
          {currentStep.advance === 'role-select' && currentStep.roleOptions && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {currentStep.roleOptions.map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onRoleSelect(role)}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <span className="font-semibold text-base">{role}</span>
                  <span className="text-xs opacity-80">
                    {role === 'S' && 'Setter'}
                    {role === 'OH1' && 'Outside Hitter 1'}
                    {role === 'OH2' && 'Outside Hitter 2'}
                    {role === 'MB1' && 'Middle Blocker 1'}
                    {role === 'MB2' && 'Middle Blocker 2'}
                    {role === 'OPP' && 'Opposite'}
                    {role === 'L' && 'Libero'}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* Quiz UI */}
          {currentStep.advance === 'quiz' && currentStep.quizOptions && (
            <div className="space-y-2 pt-2">
              {!showFeedback ? (
                // Show answer options
                currentStep.quizOptions.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuizAnswer(index, option)}
                    className={cn(
                      "w-full justify-start text-left h-auto py-3 px-4",
                      selectedAnswer === index && "ring-2 ring-primary"
                    )}
                  >
                    <span className="text-sm">{option.label}</span>
                  </Button>
                ))
              ) : (
                // Show feedback
                <div className={cn(
                  "rounded-lg p-4 space-y-3",
                  isCorrect
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                )}>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={isCorrect ? CheckmarkCircle01Icon : XCircleIcon}
                      className={cn(
                        "h-5 w-5",
                        isCorrect ? "text-green-500" : "text-red-500"
                      )}
                    />
                    <span className={cn(
                      "font-semibold",
                      isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {isCorrect ? "Correct!" : "Not quite..."}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isCorrect
                      ? (currentStep.successFeedback || currentStep.quizOptions?.[selectedAnswer!]?.feedback)
                      : (currentStep.quizOptions?.[selectedAnswer!]?.feedback || currentStep.failureFeedback || "Try again!")}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleQuizContinue}
                    className={cn(
                      "w-full",
                      isCorrect
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    )}
                  >
                    {isCorrect ? "Continue" : "Try Again"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )

  // Shared progress bar
  const ProgressBar = (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )

  // Shared navigation
  const Navigation = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onBack}
        disabled={isFirstStep}
        className="h-8"
      >
        Back
      </Button>
      <div className="flex-1" />
      {currentStep?.advance === 'auto' ? (
        <span className="text-xs text-muted-foreground animate-pulse">
          Continuing...
        </span>
      ) : currentStep?.advance === 'role-select' ? (
        <span className="text-xs text-muted-foreground">
          Select a role to continue
        </span>
      ) : currentStep?.advance === 'quiz' ? (
        <span className="text-xs text-muted-foreground">
          {showFeedback ? '' : 'Select an answer'}
        </span>
      ) : isLastStep && nextLesson ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            className="h-8"
          >
            Finish
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onNextModule}
            className="h-8 bg-green-600 hover:bg-green-700"
          >
            Next Module →
          </Button>
        </div>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={onNext}
          className={cn(
            "h-8",
            isLastStep && "bg-green-600 hover:bg-green-700"
          )}
        >
          {isLastStep ? 'Finish' : 'Continue'}
        </Button>
      )}
    </div>
  )

  // Bottom drawer layout
  if (position === 'bottom') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto px-2 pb-2 pointer-events-auto">
          <div className="bg-card/95 backdrop-blur-sm border rounded-t-xl shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{lesson.title}</span>
                <span className="text-xs text-muted-foreground">
                  {stepIndex + 1} / {totalSteps}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </Button>
            </div>
            {ProgressBar}
            {/* Content */}
            <div className="p-4 max-h-[30vh] overflow-y-auto">
              {Content}
            </div>
            {/* Navigation */}
            <div className="p-3 border-t bg-muted/30">
              {Navigation}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Side panel layout (no overlay)
  if (position === 'side') {
    return (
      <div className="fixed top-0 left-0 bottom-0 z-40 w-[280px] sm:w-[320px] bg-card border-r shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <span className="text-sm font-semibold">{lesson.title}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
          </Button>
        </div>
        {ProgressBar}
        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {Content}
        </div>
        {/* Navigation */}
        <div className="p-3 border-t bg-muted/30">
          {Navigation}
        </div>
      </div>
    )
  }

  // Floating card layout
  if (position === 'floating') {
    return <FloatingCard
      lesson={lesson}
      currentStep={currentStep}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      progress={progress}
      Content={Content}
      ProgressBar={ProgressBar}
      Navigation={Navigation}
      onClose={onClose}
    />
  }

  // Inline layout (rendered via portal-like approach, but actually we need to render this differently)
  // For inline, we return null here and the parent component will render it inline
  if (position === 'inline') {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="bg-card border-t shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{lesson.title}</span>
                <span className="text-xs text-muted-foreground">
                  {stepIndex + 1} / {totalSteps}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </Button>
            </div>
            {ProgressBar}
            {/* Content */}
            <div className="p-4">
              {Content}
            </div>
            {/* Navigation */}
            <div className="p-3 border-t bg-muted/30">
              {Navigation}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

interface FloatingCardProps {
  lesson: { title: string }
  currentStep: {
    content: string
    subtitle?: string
    advance: 'tap' | 'auto' | 'role-select' | 'quiz' | 'tap-court'
    roleOptions?: Role[]
    quizOptions?: QuizOption[]
  } | undefined
  stepIndex: number
  totalSteps: number
  progress: number
  Content: React.ReactNode
  ProgressBar: React.ReactNode
  Navigation: React.ReactNode
  onClose: () => void
}

function FloatingCard({
  lesson,
  stepIndex,
  totalSteps,
  Content,
  ProgressBar,
  Navigation,
  onClose
}: FloatingCardProps) {
  const {
    position,
    isDragging,
    dragRef,
    handleRef
  } = useDraggable({
    initialPosition: { x: 16, y: 64 }, // top-16 left-4 equivalent
    storageKey: 'learning-panel-position',
    constrainToViewport: true
  })

  return (
    <div
      ref={dragRef}
      className="fixed z-40 w-[280px] sm:w-[320px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'left 0.2s, top 0.2s'
      }}
    >
      <div className={cn(
        "bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg",
        isDragging && "shadow-2xl cursor-grabbing"
      )}>
        {/* Header with drag handle */}
        <div
          ref={handleRef}
          className={cn(
            "flex items-center gap-2 p-2 border-b",
            "cursor-grab active:cursor-grabbing"
          )}
        >
          <DragHandle showGrip={true} gripPosition="left" className="ml-1" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold truncate">{lesson.title}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
          </Button>
        </div>
        {ProgressBar}
        {/* Content */}
        <div className="p-3 max-h-[200px] overflow-y-auto">
          {Content}
        </div>
        {/* Navigation */}
        <div className="p-2 border-t bg-muted/30">
          {Navigation}
        </div>
      </div>
    </div>
  )
}

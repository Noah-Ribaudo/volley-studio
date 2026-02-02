'use client'

import { SafeAreaHeader } from '@/components/ui/SafeAreaHeader'

import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { allLessons, getLessonById } from '@/lib/learning/allModules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  ArrowLeft01Icon,
  PlayIcon,
  Tick01Icon,
  Clock01Icon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export default function LearnPage() {
  const router = useRouter()
  const {
    startLesson,
    learningProgress,
    learningLessonId,
    learningStepIndex,
  } = useAppStore()

  // Check if a lesson is completed
  const isCompleted = (lessonId: string) => {
    return learningProgress?.completedLessonIds?.includes(lessonId) ?? false
  }

  // Check if user is currently on this lesson
  const isInProgress = (lessonId: string) => {
    return learningLessonId === lessonId && !isCompleted(lessonId)
  }

  // Calculate progress for in-progress lesson
  const getProgress = (lessonId: string) => {
    if (!isInProgress(lessonId)) return 0
    const lesson = getLessonById(lessonId)
    if (!lesson) return 0
    return Math.round((learningStepIndex / (lesson.steps.length - 1)) * 100)
  }

  // Handle starting a lesson
  const handleStartLesson = (lessonId: string) => {
    startLesson(lessonId)
    router.push('/')
  }

  // Handle continuing a lesson
  const handleContinueLesson = () => {
    if (learningLessonId) {
      // Re-enable learning mode and go to whiteboard
      useAppStore.getState().setLearningMode(true)
      router.push('/')
    }
  }

  // Count completed lessons
  const completedCount = allLessons.filter(l => isCompleted(l.id)).length
  const overallProgress = Math.round((completedCount / allLessons.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <SafeAreaHeader>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/volleyball">
              <Button variant="ghost" size="icon" className="min-w-11 min-h-11" aria-label="Back to whiteboard">
                <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-primary">Learn 5-1</h1>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {allLessons.length} lessons completed
              </p>
            </div>
          </div>
        </div>
      </SafeAreaHeader>

      <div className="container mx-auto px-4 py-4 pb-32 max-w-2xl space-y-6">
        {/* Overall Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <HugeiconsIcon icon={BookOpen01Icon} className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-muted-foreground">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Continue Banner (if in progress) */}
        {learningLessonId && !isCompleted(learningLessonId) && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Continue where you left off</p>
                  <p className="text-xs text-muted-foreground">
                    {getLessonById(learningLessonId)?.title}
                  </p>
                </div>
                <Button onClick={handleContinueLesson} size="sm">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lesson List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground px-1">All Lessons</h2>

          {allLessons.map((lesson, index) => {
            const completed = isCompleted(lesson.id)
            const inProgress = isInProgress(lesson.id)
            const progress = getProgress(lesson.id)

            return (
              <Card
                key={lesson.id}
                className={cn(
                  "transition-colors",
                  completed && "bg-muted/30",
                  inProgress && "border-primary/50"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    {/* Lesson Number */}
                    <div className={cn(
                      "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                      completed
                        ? "bg-green-500/20 text-green-600"
                        : inProgress
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {completed ? (
                        <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <CardTitle className="text-base">{lesson.title}</CardTitle>
                        {completed && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                        {inProgress && (
                          <Badge variant="default" className="text-xs">
                            In Progress
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {lesson.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between gap-4">
                    {/* Duration */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HugeiconsIcon icon={Clock01Icon} className="h-3.5 w-3.5" />
                      <span>{lesson.estimatedTime}</span>
                    </div>

                    {/* Progress or Start Button */}
                    {inProgress ? (
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Progress value={progress} className="h-1.5" />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleContinueLesson}
                          className="gap-1.5"
                        >
                          <HugeiconsIcon icon={PlayIcon} className="h-3.5 w-3.5" />
                          Continue
                        </Button>
                      </div>
                    ) : completed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartLesson(lesson.id)}
                        className="gap-1.5"
                      >
                        <HugeiconsIcon icon={PlayIcon} className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartLesson(lesson.id)}
                        className="gap-1.5"
                      >
                        <HugeiconsIcon icon={PlayIcon} className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Coming Soon */}
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">More lessons coming soon!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Advanced tactics, position-specific guides, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

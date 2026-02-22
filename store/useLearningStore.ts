'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeLocalStorage } from '@/store/safeStorage'
import type { Role } from '@/lib/types'
import type { LearningProgress, LearningPanelPosition } from '@/lib/learning/types'

export type LearningPersistedState = {
  learningLessonId: string | null
  learningStepIndex: number
  learningProgress: LearningProgress | null
  learningPanelPosition: LearningPanelPosition
  learningSelectedRole: Role | null
}

interface LearningState {
  learningMode: boolean
  learningLessonId: string | null
  learningStepIndex: number
  learningProgress: LearningProgress | null
  learningPanelPosition: LearningPanelPosition
  learningSelectedRole: Role | null
  isHydrated: boolean

  setLearningMode: (active: boolean) => void
  startLesson: (lessonId: string) => void
  goToLearningStep: (stepIndex: number) => void
  advanceLearningStep: () => void
  prevLearningStep: () => void
  exitLearning: () => void
  completeLearningLesson: () => void
  setLearningPanelPosition: (position: LearningPanelPosition) => void
  setLearningSelectedRole: (role: Role | null) => void
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      learningMode: false,
      learningLessonId: null,
      learningStepIndex: 0,
      learningProgress: null,
      learningPanelPosition: 'floating',
      learningSelectedRole: null,
      isHydrated: false,

      setLearningMode: (active) => set({ learningMode: active }),

      startLesson: (lessonId) =>
        set({
          learningMode: true,
          learningLessonId: lessonId,
          learningStepIndex: 0,
        }),

      goToLearningStep: (stepIndex) => set({ learningStepIndex: stepIndex }),

      advanceLearningStep: () =>
        set((state) => ({
          learningStepIndex: state.learningStepIndex + 1,
        })),

      prevLearningStep: () =>
        set((state) => ({
          learningStepIndex: Math.max(0, state.learningStepIndex - 1),
        })),

      exitLearning: () =>
        set({
          learningMode: false,
        }),

      completeLearningLesson: () =>
        set((state) => {
          const completedIds = state.learningProgress?.completedLessonIds || []
          const lessonId = state.learningLessonId
          if (!lessonId) return {}

          return {
            learningMode: false,
            learningProgress: {
              currentLessonId: lessonId,
              currentStepIndex: 0,
              completedLessonIds: completedIds.includes(lessonId)
                ? completedIds
                : [...completedIds, lessonId],
            },
          }
        }),

      setLearningPanelPosition: (position) => set({ learningPanelPosition: position }),
      setLearningSelectedRole: (role) => set({ learningSelectedRole: role }),
    }),
    {
      name: 'volley-learning',
      storage: createSafeLocalStorage<LearningPersistedState>(),
      skipHydration: true,
      partialize: (state) => ({
        learningLessonId: state.learningLessonId,
        learningStepIndex: state.learningStepIndex,
        learningProgress: state.learningProgress,
        learningPanelPosition: state.learningPanelPosition,
        learningSelectedRole: state.learningSelectedRole,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          useLearningStore.setState({ isHydrated: true })
          return
        }

        state.learningMode = false
        if (!state.learningPanelPosition) {
          state.learningPanelPosition = 'floating'
        }

        state.isHydrated = true
      },
    }
  )
)

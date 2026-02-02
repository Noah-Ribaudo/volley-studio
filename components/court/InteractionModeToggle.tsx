'use client'

import { useInteractionStore, InteractionMode } from '@/store/useInteractionStore'
import { Label } from '@/components/ui/label'

export function InteractionModeToggle() {
  const mode = useInteractionStore((state) => state.mode)
  const setMode = useInteractionStore((state) => state.setMode)

  const handleChange = (newMode: InteractionMode) => {
    setMode(newMode)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-900 dark:text-white">
        Mobile Interaction Mode
      </Label>
      <div className="space-y-2">
        <label
          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'radial'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <input
            type="radio"
            name="interaction-mode"
            value="radial"
            checked={mode === 'radial'}
            onChange={() => handleChange('radial')}
            className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Radial Menu
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Hold player to open radial menu with actions
            </div>
          </div>
        </label>

        <label
          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            mode === 'classic'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <input
            type="radio"
            name="interaction-mode"
            value="classic"
            checked={mode === 'classic'}
            onChange={() => handleChange('classic')}
            className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              Classic
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Tap player to open menu
            </div>
          </div>
        </label>
      </div>
    </div>
  )
}

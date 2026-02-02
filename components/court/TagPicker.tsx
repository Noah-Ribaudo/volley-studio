'use client'

import { Role, TokenTag, TOKEN_TAGS, ROLE_INFO } from '@/lib/types'
import { X } from 'lucide-react'

interface TagPickerProps {
  /** The role being tagged */
  role: Role
  /** Current tags for this role */
  currentTags: TokenTag[]
  /** Callback when tags are changed */
  onTagsChange: (tags: TokenTag[]) => void
  /** Callback to close the picker */
  onClose: () => void
}

export function TagPicker({ role, currentTags, onTagsChange, onClose }: TagPickerProps) {
  const roleInfo = ROLE_INFO[role]

  const toggleTag = (tag: TokenTag) => {
    if (currentTags.includes(tag)) {
      onTagsChange(currentTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...currentTags, tag])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tags for {roleInfo.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select tags to apply
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tag list */}
        <div className="p-4 space-y-2">
          {TOKEN_TAGS.map((tag) => {
            const isSelected = currentTags.includes(tag)
            return (
              <label
                key={tag}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTag(tag)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {tag}
                </span>
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Lineup } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Add01Icon,
  MoreHorizontalIcon,
  StarIcon,
  Copy01Icon,
  PencilEdit01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface LineupSelectorProps {
  lineups: Lineup[]
  selectedLineupId: string | null
  activeLineupId: string | null
  onSelectLineup: (lineupId: string) => void
  onCreateLineup: (name: string) => void
  onRenameLineup: (lineupId: string, newName: string) => void
  onDuplicateLineup: (lineupId: string, newName: string) => void
  onDeleteLineup: (lineupId: string) => void
  onSetActiveLineup: (lineupId: string) => void
  disabled?: boolean
}

type DialogMode = 'create' | 'rename' | 'duplicate' | null

export function LineupSelector({
  lineups,
  selectedLineupId,
  activeLineupId,
  onSelectLineup,
  onCreateLineup,
  onRenameLineup,
  onDuplicateLineup,
  onDeleteLineup,
  onSetActiveLineup,
  disabled = false,
}: LineupSelectorProps) {
  const CREATE_LINEUP_VALUE = '__create_lineup__'
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [dialogInput, setDialogInput] = useState('')
  const [targetLineupId, setTargetLineupId] = useState<string | null>(null)

  const selectedLineup = lineups.find(l => l.id === selectedLineupId)
  const isActiveLineup = selectedLineupId === activeLineupId

  const handleOpenDialog = (mode: DialogMode, existingName = '', lineupId: string | null = null) => {
    setDialogMode(mode)
    setDialogInput(mode === 'duplicate' ? `${existingName} (Copy)` : existingName)
    setTargetLineupId(lineupId)
  }

  const handleCloseDialog = () => {
    setDialogMode(null)
    setDialogInput('')
    setTargetLineupId(null)
  }

  const handleDialogSubmit = () => {
    const name = dialogInput.trim()
    if (!name) return

    switch (dialogMode) {
      case 'create':
        onCreateLineup(name)
        break
      case 'rename':
        if (targetLineupId) {
          onRenameLineup(targetLineupId, name)
        }
        break
      case 'duplicate':
        if (targetLineupId) {
          onDuplicateLineup(targetLineupId, name)
        }
        break
    }
    handleCloseDialog()
  }

  const handleDelete = () => {
    if (!selectedLineupId) return
    if (lineups.length <= 1) return // Don't allow deleting the last lineup

    const confirmed = window.confirm(
      `Delete "${selectedLineup?.name}"? This cannot be undone.`
    )
    if (confirmed) {
      onDeleteLineup(selectedLineupId)
    }
  }

  const getDialogTitle = () => {
    switch (dialogMode) {
      case 'create':
        return 'New Lineup'
      case 'rename':
        return 'Rename Lineup'
      case 'duplicate':
        return 'Duplicate Lineup'
      default:
        return ''
    }
  }

  const getDialogDescription = () => {
    switch (dialogMode) {
      case 'create':
        return 'Create a new lineup with different position assignments.'
      case 'rename':
        return 'Enter a new name for this lineup.'
      case 'duplicate':
        return 'Create a copy of this lineup with a new name.'
      default:
        return ''
    }
  }

  const handleLineupValueChange = (value: string) => {
    if (value === CREATE_LINEUP_VALUE) {
      handleOpenDialog('create')
      return
    }
    onSelectLineup(value)
  }

  return (
    <div className="space-y-3">
      {/* Lineup selector row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={selectedLineupId || ''}
            onValueChange={handleLineupValueChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select lineup" />
            </SelectTrigger>
            <SelectContent>
              {lineups.map((lineup) => (
                <SelectItem key={lineup.id} value={lineup.id}>
                  <div className="flex items-center gap-2">
                    {lineup.id === activeLineupId && (
                      <HugeiconsIcon
                        icon={StarIcon}
                        className="h-3.5 w-3.5 text-amber-500 fill-amber-500"
                      />
                    )}
                    <span>{lineup.name}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={CREATE_LINEUP_VALUE}>
                <div className="flex items-center gap-2 font-medium">
                  <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />
                  <span>Create lineup...</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* More actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={disabled || !selectedLineupId}
              aria-label="Lineup actions"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isActiveLineup && (
              <>
                <DropdownMenuItem onClick={() => selectedLineupId && onSetActiveLineup(selectedLineupId)}>
                  <HugeiconsIcon icon={StarIcon} className="h-4 w-4 mr-2" />
                  Set as Active
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() =>
                handleOpenDialog('rename', selectedLineup?.name || '', selectedLineupId)
              }
            >
              <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleOpenDialog('duplicate', selectedLineup?.name || '', selectedLineupId)
              }
            >
              <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              disabled={lineups.length <= 1}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog for create/rename/duplicate */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="lineup-name" className="text-sm font-medium">
              Lineup Name
            </Label>
            <Input
              id="lineup-name"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder="e.g., Varsity Starting 6"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleDialogSubmit()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleDialogSubmit} disabled={!dialogInput.trim()}>
              {dialogMode === 'create' ? 'Create' : dialogMode === 'rename' ? 'Rename' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

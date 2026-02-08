'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import {
  ROLE_INFO,
  ROLES,
  PLAYER_STATUSES,
  PLAYER_STATUS_INFO,
  type Role,
  type RosterPlayer,
  type PositionAssignments,
  type PlayerStatus,
} from '@/lib/types'
import { getTextColorForOklch } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PlayerContextContentProps {
  role: Role
  roster?: RosterPlayer[]
  assignments?: PositionAssignments
  mode?: 'whiteboard' | 'simulation'
  currentStatuses?: PlayerStatus[]
  onStatusToggle?: (status: PlayerStatus) => void
  isHighlighted?: boolean
  onHighlightToggle?: () => void
  /** Whether this player has an arrow */
  hasArrow?: boolean
  /** Whether we're on mobile */
  isMobile?: boolean
  /** Whether arrow placement can be started */
  canStartArrow?: boolean
  /** Callback to start arrow placement mode */
  onStartArrow?: () => void
  /** Whether a team is currently selected */
  hasTeam?: boolean
  /** Callback to open roster management (for assigning players) */
  onManageRoster?: () => void
  /** Callback to assign a player to this role */
  onPlayerAssign?: (role: Role, playerId: string | undefined) => void
}

export function PlayerContextContent({
  role,
  roster = [],
  assignments = {},
  mode = 'whiteboard',
  currentStatuses = [],
  onStatusToggle,
  isHighlighted,
  onHighlightToggle,
  hasArrow,
  isMobile,
  canStartArrow,
  onStartArrow,
  hasTeam,
  onManageRoster,
  onPlayerAssign,
}: PlayerContextContentProps) {
  const roleInfo = ROLE_INFO[role]

  // Get assigned player info
  const playerId = assignments[role]
  const player = playerId ? roster.find(p => p.id === playerId) : null

  // Get first name from full name
  const getFirstName = (name: string | undefined): string => {
    if (!name) return ''
    return name.split(/\s+/)[0] || name
  }

  return (
    <div className={cn("flex flex-col py-1", isMobile ? "gap-4" : "gap-3")}>
      {/* Header with role badge and player info */}
      <div className={cn("flex items-center", isMobile ? "gap-4" : "gap-3")}>
        {/* Role badge */}
        <Badge
          className={cn("font-semibold", isMobile ? "text-base px-3 py-1.5" : "text-sm px-2.5 py-1")}
          style={{
            backgroundColor: roleInfo.color,
            color: getTextColorForOklch(roleInfo.color),
            border: 'none',
          }}
        >
          {role}
        </Badge>

        {/* Player name and number */}
        <div className="flex flex-col min-w-0">
          {player ? (
            <>
              <span className={cn("font-medium text-foreground truncate", isMobile && "text-lg")}>
                {getFirstName(player.name)}
              </span>
              {player.number !== undefined && (
                <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
                  #{player.number}
                </span>
              )}
            </>
          ) : (
            <span className={cn("text-muted-foreground", isMobile ? "text-base" : "text-sm")}>
              {hasTeam ? 'No player assigned' : roleInfo.name}
            </span>
          )}
        </div>
      </div>

      {/* Role full name */}
      <div className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
        {roleInfo.name}
      </div>

      {/* Roster picker - when team exists with players */}
      {hasTeam && roster.length > 0 && onPlayerAssign && (
        <div className={cn("border-t border-border mt-1", isMobile ? "pt-4" : "pt-3")}>
          <div className={cn("text-muted-foreground", isMobile ? "text-sm mb-3" : "text-xs mb-2")}>
            Assign Player
          </div>
          <div className={cn("grid grid-cols-2", isMobile ? "gap-2" : "gap-1")}>
            {[...roster].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)).map((rosterPlayer) => {
              const isAssignedHere = playerId === rosterPlayer.id
              const otherRole = ROLES.find(r => r !== role && assignments[r] === rosterPlayer.id)
              const isAssignedElsewhere = !!otherRole

              return (
                <button
                  key={rosterPlayer.id}
                  onClick={() => {
                    if (isAssignedHere) {
                      onPlayerAssign(role, undefined)
                    } else if (!isAssignedElsewhere) {
                      onPlayerAssign(role, rosterPlayer.id)
                    }
                  }}
                  disabled={isAssignedElsewhere}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md transition-colors text-left min-w-0',
                    isMobile ? 'px-2.5 py-2.5' : 'px-2 py-1.5',
                    isAssignedHere
                      ? 'bg-muted'
                      : isAssignedElsewhere
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-muted active:bg-muted/80'
                  )}
                >
                  <span className={cn(
                    'font-bold shrink-0',
                    isMobile ? 'text-sm' : 'text-xs',
                    isAssignedHere ? 'text-primary' : 'text-foreground'
                  )}>
                    #{rosterPlayer.number}
                  </span>
                  <span className={cn(
                    'truncate',
                    isMobile ? 'text-sm' : 'text-xs',
                    'text-muted-foreground'
                  )}>
                    {rosterPlayer.name}
                  </span>
                  {isAssignedElsewhere && (
                    <span className={cn("shrink-0 text-muted-foreground/60", isMobile ? "text-[10px]" : "text-[9px]")}>
                      {otherRole}
                    </span>
                  )}
                  {isAssignedHere && (
                    <Check className={cn("shrink-0 text-primary", isMobile ? "w-3.5 h-3.5" : "w-3 h-3")} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Set up team link - when no team exists */}
      {!hasTeam && onManageRoster && (
        <div className={cn("border-t border-border mt-1", isMobile ? "pt-4" : "pt-3")}>
          <button
            onClick={onManageRoster}
            className={cn(
              "text-left text-primary hover:underline transition-colors",
              isMobile ? "text-base" : "text-sm"
            )}
          >
            Set up your team →
          </button>
        </div>
      )}

      {/* Status selection for whiteboard mode - multi-select */}
      {mode === 'whiteboard' && onStatusToggle && (
        <div className={cn("border-t border-border mt-1", isMobile ? "pt-4" : "pt-3")}>
          <div className={cn("text-muted-foreground", isMobile ? "text-sm mb-3" : "text-xs mb-2")}>Status (select multiple)</div>
          <div className={cn("grid grid-cols-2", isMobile ? "gap-2.5" : "gap-1.5")}>
            {PLAYER_STATUSES.map((status) => {
              const statusInfo = PLAYER_STATUS_INFO[status]
              const isSelected = currentStatuses.includes(status)
              return (
                <button
                  key={status}
                  onClick={() => onStatusToggle(status)}
                  className={cn(
                    'font-medium rounded-md transition-all',
                    'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    isMobile ? 'px-3 py-3 text-sm' : 'px-2 py-1.5 text-xs',
                    isSelected
                      ? 'border-transparent'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                  style={isSelected ? {
                    backgroundColor: statusInfo.color,
                    color: getTextColorForOklch(statusInfo.color),
                  } : undefined}
                >
                  {statusInfo.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Highlight toggle for whiteboard mode */}
      {mode === 'whiteboard' && onHighlightToggle && (
        <div className={cn("border-t border-border mt-1", isMobile ? "pt-4" : "pt-3")}>
          <button
            onClick={onHighlightToggle}
            className={cn(
              'w-full font-medium rounded-md transition-all',
              'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              isMobile ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-xs',
              isHighlighted
                ? 'border-white/50 bg-white/10 text-foreground'
                : 'border-border bg-background hover:bg-muted text-muted-foreground'
            )}
          >
            {isHighlighted ? '✓ Highlighted' : 'Highlight Player'}
          </button>
        </div>
      )}

      {/* Mobile arrow placement */}
      {mode === 'whiteboard' && isMobile && canStartArrow && onStartArrow && (
        <div className={cn("border-t border-border mt-1", isMobile ? "pt-4" : "pt-3")}>
          <Button
            onClick={onStartArrow}
            className="w-full"
            size={isMobile ? 'default' : 'sm'}
            variant="outline"
            type="button"
          >
            Draw Arrow
          </Button>
        </div>
      )}

      {/* Placeholder for future phase-specific content in simulation mode */}
      {mode === 'simulation' && (
        <div className="text-xs text-muted-foreground/60 italic border-t border-border pt-2 mt-1">
          Intent and actions coming soon...
        </div>
      )}
    </div>
  )
}

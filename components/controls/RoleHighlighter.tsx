'use client'

import { Button } from '@/components/ui/button'
import { Role, ROLES, ROLE_INFO } from '@/lib/types'
import { cn, getTextColorForOklch } from '@/lib/utils'

interface RoleHighlighterProps {
  highlightedRole: Role | null
  onRoleSelect: (role: Role | null) => void
}

export function RoleHighlighter({ highlightedRole, onRoleSelect }: RoleHighlighterProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Highlight Your Position
        </span>
        {highlightedRole && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRoleSelect(null)}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5 justify-center">
        {ROLES.map(role => {
          const info = ROLE_INFO[role]
          const isSelected = highlightedRole === role
          
          return (
            <Button
              key={role}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onRoleSelect(isSelected ? null : role)}
              data-active={isSelected}
              aria-pressed={isSelected}
              className={cn(
                "h-9 px-3 transition-all border-2 font-bold",
                isSelected 
                  ? "shadow-lg scale-105 border-primary/60 ring-2 ring-primary/40 ring-offset-2 ring-offset-background" 
                  : "border-transparent opacity-80 hover:opacity-100 hover:border-border"
              )}
              style={{
                backgroundColor: isSelected ? info.color : undefined,
                color: isSelected ? getTextColorForOklch(info.color) : info.color,
                borderColor: isSelected ? info.color : undefined,
              }}
            >
              <span className="mr-1.5">{role}</span>
              <span className="text-xs hidden sm:inline opacity-90">
                {info.name.split(' ')[0]}
              </span>
            </Button>
          )
        })}
      </div>
      
      {highlightedRole && (
        <div className="text-center text-sm mt-1">
          <span className="font-medium" style={{ color: ROLE_INFO[highlightedRole].color }}>
            {ROLE_INFO[highlightedRole].name}
          </span>
          <span className="text-muted-foreground"> highlighted</span>
        </div>
      )}
    </div>
  )
}


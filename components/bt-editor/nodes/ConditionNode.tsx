'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { BTFlowNodeData } from '@/lib/bt-editor/traceToFlow'
import { getStatusStyles, getWizardStyles } from '@/lib/bt-editor/traceToFlow'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RallyPhase } from '@/lib/sim/types'
import { RALLY_PHASE_INFO } from '@/lib/types'

// Phase badge colors (matching the FSM timeline colors)
const PHASE_BADGE_COLORS: Record<RallyPhase, { bg: string; ring: string }> = {
  'PRE_SERVE': { bg: 'bg-yellow-500', ring: 'ring-yellow-400/50' },
  'SERVE_IN_AIR': { bg: 'bg-orange-500', ring: 'ring-orange-400/50' },
  'SERVE_RECEIVE': { bg: 'bg-blue-500', ring: 'ring-blue-400/50' },
  'TRANSITION_TO_OFFENSE': { bg: 'bg-cyan-500', ring: 'ring-cyan-400/50' },
  'SET_PHASE': { bg: 'bg-teal-500', ring: 'ring-teal-400/50' },
  'ATTACK_PHASE': { bg: 'bg-red-500', ring: 'ring-red-400/50' },
  'TRANSITION_TO_DEFENSE': { bg: 'bg-purple-500', ring: 'ring-purple-400/50' },
  'DEFENSE_PHASE': { bg: 'bg-indigo-500', ring: 'ring-indigo-400/50' },
  'BALL_DEAD': { bg: 'bg-gray-500', ring: 'ring-gray-400/50' },
}

function ConditionNode({ data }: NodeProps<BTFlowNodeData>) {
  const styles = getStatusStyles(data.status)
  const wizardStyles = getWizardStyles(data.wizardState)

  // Calculate opacity: wizard state takes precedence, then isDimmed
  const opacity = wizardStyles.opacity ?? (data.isDimmed ? 0.35 : 1)

  // Check if this node has a phase affinity and if it matches the current phase
  const hasPhaseAffinity = !!data.phaseAffinity
  const isPhaseMatch = data.phaseAffinity && data.currentPhase === data.phaseAffinity
  const badgeColors = data.phaseAffinity ? PHASE_BADGE_COLORS[data.phaseAffinity] : null

  const nodeContent = (
    <div
      className="relative transition-all duration-300"
      style={{
        minWidth: 100,
        opacity,
        transform: wizardStyles.scale ? `scale(${wizardStyles.scale})` : undefined,
        filter: wizardStyles.filter ?? (data.isDimmed ? 'grayscale(0.5)' : undefined),
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !border-amber-400 !w-2 !h-2"
      />

      {/* Phase affinity badge - shows when this condition checks a specific phase */}
      {hasPhaseAffinity && badgeColors && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'absolute -top-1.5 -left-1.5 z-10 w-3.5 h-3.5 rounded-full border-2 border-slate-900 transition-all duration-300',
                badgeColors.bg,
                isPhaseMatch && 'ring-2 ring-offset-1 ring-offset-slate-900 scale-110',
                isPhaseMatch && badgeColors.ring
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Checks: {RALLY_PHASE_INFO[data.phaseAffinity!].name}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Diamond shape using rotated square */}
      <div
        className="flex items-center justify-center border-2 bg-amber-900/30 backdrop-blur-sm transition-all duration-200"
        style={{
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
          boxShadow: wizardStyles.ring || styles.shadow,
          animation: wizardStyles.ringAnimation,
          width: 80,
          height: 44,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          margin: '0 auto',
        }}
      />

      {/* Text overlay (positioned on top of diamond) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-amber-200 text-xs font-medium text-center px-2 leading-tight">
          {data.nodeName}
        </span>
      </div>

      {/* Visited checkmark */}
      {data.wizardState === 'visited' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !border-amber-400 !w-2 !h-2"
      />
    </div>
  )

  // Wrap with tooltip if description exists
  if (data.description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {nodeContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[200px] bg-slate-900 border-slate-700 shadow-xl px-2.5 py-2"
        >
          <p className="text-[11px] text-slate-300 leading-snug">{data.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return nodeContent
}

export default memo(ConditionNode)

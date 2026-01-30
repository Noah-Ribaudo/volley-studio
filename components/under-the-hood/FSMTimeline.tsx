'use client'

import { cn } from '@/lib/utils'
import type { RallyPhase } from '@/lib/sim/types'
import { RALLY_PHASES, RALLY_PHASE_INFO } from '@/lib/types'
import { PHASE_COLORS, RALLY_PHASE_ICONS } from '@/lib/phaseIcons'
import { useSituationStore } from '@/store/useSituationStore'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FSMTimelineProps {
  currentPhase: RallyPhase | null
  className?: string
}

// Map phase colors to ring/glow colors
const PHASE_RING_COLORS: Record<RallyPhase, string> = {
  'PRE_SERVE': 'ring-yellow-400/60',
  'SERVE_IN_AIR': 'ring-orange-400/60',
  'SERVE_RECEIVE': 'ring-blue-400/60',
  'TRANSITION_TO_OFFENSE': 'ring-cyan-400/60',
  'SET_PHASE': 'ring-teal-400/60',
  'ATTACK_PHASE': 'ring-red-400/60',
  'TRANSITION_TO_DEFENSE': 'ring-purple-400/60',
  'DEFENSE_PHASE': 'ring-indigo-400/60',
  'BALL_DEAD': 'ring-gray-400/60',
}

// Map phase colors to border colors (for inactive chips)
const PHASE_BORDER_COLORS: Record<RallyPhase, string> = {
  'PRE_SERVE': 'border-yellow-500/40 hover:border-yellow-500/70',
  'SERVE_IN_AIR': 'border-orange-500/40 hover:border-orange-500/70',
  'SERVE_RECEIVE': 'border-blue-500/40 hover:border-blue-500/70',
  'TRANSITION_TO_OFFENSE': 'border-cyan-500/40 hover:border-cyan-500/70',
  'SET_PHASE': 'border-teal-500/40 hover:border-teal-500/70',
  'ATTACK_PHASE': 'border-red-500/40 hover:border-red-500/70',
  'TRANSITION_TO_DEFENSE': 'border-purple-500/40 hover:border-purple-500/70',
  'DEFENSE_PHASE': 'border-indigo-500/40 hover:border-indigo-500/70',
  'BALL_DEAD': 'border-gray-500/40 hover:border-gray-500/70',
}

// Map phase colors to text colors
const PHASE_TEXT_COLORS: Record<RallyPhase, string> = {
  'PRE_SERVE': 'text-yellow-400',
  'SERVE_IN_AIR': 'text-orange-400',
  'SERVE_RECEIVE': 'text-blue-400',
  'TRANSITION_TO_OFFENSE': 'text-cyan-400',
  'SET_PHASE': 'text-teal-400',
  'ATTACK_PHASE': 'text-red-400',
  'TRANSITION_TO_DEFENSE': 'text-purple-400',
  'DEFENSE_PHASE': 'text-indigo-400',
  'BALL_DEAD': 'text-gray-400',
}

// Short labels for phases
const PHASE_SHORT_LABELS: Record<RallyPhase, string> = {
  'PRE_SERVE': 'Pre-Serve',
  'SERVE_IN_AIR': 'Serve',
  'SERVE_RECEIVE': 'Receive',
  'TRANSITION_TO_OFFENSE': 'To Offense',
  'SET_PHASE': 'Set',
  'ATTACK_PHASE': 'Attack',
  'TRANSITION_TO_DEFENSE': 'To Defense',
  'DEFENSE_PHASE': 'Defense',
  'BALL_DEAD': 'Dead',
}

export default function FSMTimeline({ currentPhase, className }: FSMTimelineProps) {
  const { setContext } = useSituationStore()

  const handlePhaseClick = (phase: RallyPhase) => {
    setContext('phase', phase)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('px-4 py-4', className)}>
        {/* Title */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Rally Phase (FSM)
          </span>
          <span className="text-xs text-slate-500">
            Click to select
          </span>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {RALLY_PHASES.map((phase, index) => {
            const isActive = currentPhase === phase
            const info = RALLY_PHASE_INFO[phase]
            const isIntermediate = info.isIntermediate

            return (
              <div key={phase} className="flex items-center">
                {/* Phase chip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handlePhaseClick(phase)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
                        isIntermediate && 'opacity-60',
                        isActive
                          ? cn(
                              PHASE_COLORS[phase],
                              'text-white border-transparent',
                              'ring-2 ring-offset-2 ring-offset-slate-900',
                              PHASE_RING_COLORS[phase],
                              'scale-105 shadow-lg'
                            )
                          : cn(
                              'bg-slate-800/50',
                              PHASE_BORDER_COLORS[phase],
                              PHASE_TEXT_COLORS[phase],
                              'hover:bg-slate-700/50'
                            )
                      )}
                    >
                      <span className={cn(
                        'flex-shrink-0',
                        isActive ? 'text-white' : PHASE_TEXT_COLORS[phase]
                      )}>
                        {RALLY_PHASE_ICONS[phase]}
                      </span>
                      <span className={cn(
                        'text-xs font-medium whitespace-nowrap',
                        isActive ? 'text-white' : 'text-slate-300'
                      )}>
                        {PHASE_SHORT_LABELS[phase]}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <div className="text-sm font-medium">{info.name}</div>
                    <div className="text-xs text-slate-400">{info.description}</div>
                  </TooltipContent>
                </Tooltip>

                {/* Arrow connector (except after last) */}
                {index < RALLY_PHASES.length - 1 && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    className="flex-shrink-0 text-slate-600"
                  >
                    <path
                      d="M4 10h12M12 6l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* Current phase description */}
        {currentPhase && (
          <div className="mt-3 flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              PHASE_COLORS[currentPhase]
            )} />
            <span className="text-sm text-slate-300">
              {RALLY_PHASE_INFO[currentPhase].description}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

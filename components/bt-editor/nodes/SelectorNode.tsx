'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { BTFlowNodeData } from '@/lib/bt-editor/traceToFlow'
import { getStatusStyles, getWizardStyles } from '@/lib/bt-editor/traceToFlow'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check } from 'lucide-react'

function SelectorNode({ data }: NodeProps<BTFlowNodeData>) {
  const styles = getStatusStyles(data.status)
  const wizardStyles = getWizardStyles(data.wizardState)

  // Calculate opacity: wizard state takes precedence, then isDimmed
  const opacity = wizardStyles.opacity ?? (data.isDimmed ? 0.35 : 1)

  const nodeContent = (
    <div
      className="relative px-3 py-2 rounded-lg border-2 bg-slate-800/80 backdrop-blur-sm transition-all duration-300"
      style={{
        borderColor: styles.borderColor,
        backgroundColor: styles.backgroundColor,
        boxShadow: wizardStyles.ring || styles.shadow,
        animation: wizardStyles.ringAnimation,
        minWidth: 120,
        opacity,
        transform: wizardStyles.scale ? `scale(${wizardStyles.scale})` : undefined,
        filter: wizardStyles.filter ?? (data.isDimmed ? 'grayscale(0.5)' : undefined),
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-500 !border-slate-400 !w-2 !h-2"
      />

      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-bold text-sm">?</span>
        <span className="text-slate-200 text-sm font-medium truncate">
          {data.nodeName}
        </span>
      </div>

      {data.note && (
        <div className="text-xs text-slate-400 mt-1 truncate">{data.note}</div>
      )}

      {/* Visited checkmark */}
      {data.wizardState === 'visited' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-500 !border-slate-400 !w-2 !h-2"
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

export default memo(SelectorNode)

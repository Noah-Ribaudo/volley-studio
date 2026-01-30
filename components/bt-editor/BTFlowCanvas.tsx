'use client'

import { useMemo, useEffect, useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import type { BTNodeTrace } from '@/lib/sim/trace'
import type { RallyPhase } from '@/lib/sim/types'
import { traceToFlow } from '@/lib/bt-editor/traceToFlow'
import type { BTFlowNodeData } from '@/lib/bt-editor/traceToFlow'
import {
  SelectorNode,
  SequenceNode,
  ConditionNode,
  ActionNode,
  DecoratorNode,
} from './nodes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBTWizardStore } from '@/store/useBTWizardStore'

// Register custom node types
const nodeTypes = {
  selector: SelectorNode,
  sequence: SequenceNode,
  condition: ConditionNode,
  action: ActionNode,
  decorator: DecoratorNode,
}

export type TraceDisplayMode = 'preview' | 'result'

interface BTFlowCanvasProps {
  trace: BTNodeTrace | null
  /** 'preview' shows neutral colors, 'result' shows success/failure highlighting */
  displayMode?: TraceDisplayMode
  /** Current phase for highlighting phase-related condition nodes */
  currentPhase?: RallyPhase | null
}

// Inner component that has access to ReactFlow instance
function BTFlowCanvasInner({ trace, displayMode = 'result', currentPhase }: BTFlowCanvasProps) {
  const { fitView, setCenter, getNodes } = useReactFlow()
  const { isWizardActive, currentNodeId, getNodeState, visitedPath, highlightMode } = useBTWizardStore()

  // Convert trace to ReactFlow format with wizard state
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!trace) {
      return { initialNodes: [], initialEdges: [] }
    }
    const { nodes, edges } = traceToFlow(trace, 'TB')

    // In preview mode, neutralize all statuses
    if (displayMode === 'preview') {
      const neutralNodes = nodes.map(node => ({
        ...node,
        data: { ...node.data, status: undefined as unknown as typeof node.data.status },
      }))
      const neutralEdges = edges.map(edge => ({
        ...edge,
        style: { ...edge.style, stroke: '#475569' }, // slate-600 neutral color
      }))
      return { initialNodes: neutralNodes, initialEdges: neutralEdges }
    }

    // In result mode, dim nodes that failed and highlight successes
    const resultNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Mark non-success nodes as dimmed
        isDimmed: node.data.status !== 'SUCCESS',
      },
    }))

    return { initialNodes: resultNodes, initialEdges: edges }
  }, [trace, displayMode])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Build mapping from wizard node IDs to ReactFlow node IDs
  const wizardToFlowIdMap = useRef<Map<string, string>>(new Map())

  // Update nodes/edges when trace or displayMode changes
  useEffect(() => {
    if (trace) {
      const { nodes: rawNodes, edges: rawEdges } = traceToFlow(trace, 'TB')

      // Build ID mapping - wizard IDs are wizard-0, wizard-1, etc.
      // ReactFlow IDs are node-0, node-1, etc. in the same order
      wizardToFlowIdMap.current.clear()
      rawNodes.forEach((node, index) => {
        wizardToFlowIdMap.current.set(`wizard-${index}`, node.id)
      })

      // Apply displayMode transformations and add currentPhase
      if (displayMode === 'preview') {
        const neutralNodes = rawNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            status: undefined as unknown as typeof node.data.status,
            currentPhase,
          },
        }))
        const neutralEdges = rawEdges.map(edge => ({
          ...edge,
          style: { ...edge.style, stroke: '#475569' },
        }))
        setNodes(neutralNodes)
        setEdges(neutralEdges)
      } else {
        const resultNodes = rawNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            isDimmed: node.data.status !== 'SUCCESS',
            currentPhase,
          },
        }))
        setNodes(resultNodes)
        setEdges(rawEdges)
      }
    }
  }, [trace, displayMode, currentPhase, setNodes, setEdges])

  // Apply wizard state to nodes
  useEffect(() => {
    if (!isWizardActive) {
      // Clear wizard states when not active
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, wizardState: undefined },
        }))
      )
      return
    }

    setNodes((nds) =>
      nds.map((node) => {
        // Find corresponding wizard node ID
        let wizardNodeId: string | undefined
        wizardToFlowIdMap.current.forEach((flowId, wizId) => {
          if (flowId === node.id) {
            wizardNodeId = wizId
          }
        })

        const wizardState = wizardNodeId ? getNodeState(wizardNodeId) : 'unvisited'

        return {
          ...node,
          data: { ...node.data, wizardState } as BTFlowNodeData,
        }
      })
    )
  }, [isWizardActive, currentNodeId, visitedPath, highlightMode, setNodes, getNodeState])

  // Auto-pan to current node when it changes
  useEffect(() => {
    if (!isWizardActive || !currentNodeId) return

    // Find the corresponding ReactFlow node
    const flowNodeId = wizardToFlowIdMap.current.get(currentNodeId)
    if (!flowNodeId) return

    // Small delay to let the layout settle
    const timer = setTimeout(() => {
      const flowNodes = getNodes()
      const targetNode = flowNodes.find((n) => n.id === flowNodeId)
      if (targetNode && targetNode.position) {
        setCenter(
          targetNode.position.x + 70, // center on node (approx half width)
          targetNode.position.y + 22, // center on node (approx half height)
          { duration: 300, zoom: 1 }
        )
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [currentNodeId, isWizardActive, setCenter, getNodes])

  if (!trace) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700">
        <p className="text-slate-400">No trace data available</p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-700">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#334155"
          />
          <Controls
            className="!bg-slate-800 !border-slate-600 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-600"
          />
          <MiniMap
            className="!bg-slate-800 !border-slate-600 !rounded-lg"
            nodeColor={(node) => {
              const data = node.data as BTFlowNodeData | undefined
              // In wizard mode, color by wizard state
              if (data?.wizardState === 'current') return '#fbbf24' // amber
              if (data?.wizardState === 'visited') return '#22c55e' // green
              if (data?.wizardState === 'dimmed') return '#334155' // dark

              // Otherwise color by status
              const status = data?.status
              switch (status) {
                case 'SUCCESS':
                  return '#22c55e'
                case 'FAILURE':
                  return '#ef4444'
                case 'RUNNING':
                  return '#3b82f6'
                default:
                  return '#64748b'
              }
            }}
            maskColor="rgba(15, 23, 42, 0.8)"
          />
        </ReactFlow>
      </div>
    </TooltipProvider>
  )
}

// Wrapper component that provides ReactFlow context
export default function BTFlowCanvas({ trace, displayMode = 'result', currentPhase }: BTFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <BTFlowCanvasInner trace={trace} displayMode={displayMode} currentPhase={currentPhase} />
    </ReactFlowProvider>
  )
}

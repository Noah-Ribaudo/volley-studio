import dagre from '@dagrejs/dagre'
import type { Node, Edge } from 'reactflow'
import type { BTNodeTrace, BTNodeType } from '@/lib/sim/trace'
import type { BTStatus } from '@/lib/sim/bt'
import type { WizardNodeState } from '@/store/useBTWizardStore'
import type { RallyPhase } from '@/lib/sim/types'

// Node dimensions by type
const NODE_DIMENSIONS: Record<BTNodeType, { width: number; height: number }> = {
  Selector: { width: 140, height: 44 },
  Sequence: { width: 140, height: 44 },
  Condition: { width: 120, height: 50 },
  Action: { width: 160, height: 44 },
  Decorator: { width: 120, height: 36 },
}

// Data passed to custom nodes
export type BTFlowNodeData = {
  nodeType: BTNodeType
  nodeName: string
  status: BTStatus
  note?: string
  description?: string
  wizardState?: WizardNodeState
  /** When true, node should be shown at reduced opacity (for non-traversed paths) */
  isDimmed?: boolean
  /** Phase this condition node checks for (if any) - used for color coding */
  phaseAffinity?: RallyPhase
  /** Current phase selected in the FSM - for highlighting matching phase badges */
  currentPhase?: RallyPhase | null
}

// Map condition node names to their phase affinity
const PHASE_AFFINITY_MAP: Record<string, RallyPhase> = {
  // Pre-serve
  'IsPreServePhase': 'PRE_SERVE',
  'IsPreServe': 'PRE_SERVE',
  // Serve in air
  'IsServeInAir': 'SERVE_IN_AIR',
  'IsServeInAirOrReceive': 'SERVE_IN_AIR', // Shows SERVE_IN_AIR (could be either)
  // Serve receive
  'IsServeReceive': 'SERVE_RECEIVE',
  'IsReceivePhase': 'SERVE_RECEIVE',
  // Transition to offense / Set phase
  'IsOffensePhase': 'SET_PHASE', // TRANSITION_TO_OFFENSE or SET_PHASE
  'IsSetPhase': 'SET_PHASE',
  // Attack phase
  'IsAttackPhase': 'ATTACK_PHASE',
  // Defense phase
  'IsDefensePhase': 'DEFENSE_PHASE',
  // Ball dead
  'IsBallDead': 'BALL_DEAD',
}

/**
 * Detect phase affinity from node name
 */
function detectPhaseAffinity(nodeName: string): RallyPhase | undefined {
  return PHASE_AFFINITY_MAP[nodeName]
}

/**
 * Convert a BTNodeTrace tree into ReactFlow nodes and edges with dagre layout
 */
export function traceToFlow(
  trace: BTNodeTrace,
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node<BTFlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<BTFlowNodeData>[] = []
  const edges: Edge[] = []

  // Create dagre graph for layout
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 60,
    marginx: 20,
    marginy: 20,
  })
  g.setDefaultEdgeLabel(() => ({}))

  let nodeCounter = 0

  // Recursively build nodes and edges
  function processNode(node: BTNodeTrace, parentId?: string): string {
    const id = `node-${nodeCounter++}`
    const dims = NODE_DIMENSIONS[node.nodeType]

    // Add to dagre for layout
    g.setNode(id, { width: dims.width, height: dims.height })

    // Detect phase affinity for condition nodes
    const nodeName = node.nodeName ?? node.nodeType
    const phaseAffinity = node.nodeType === 'Condition' ? detectPhaseAffinity(nodeName) : undefined

    // Create ReactFlow node
    nodes.push({
      id,
      type: node.nodeType.toLowerCase(),
      data: {
        nodeType: node.nodeType,
        nodeName,
        status: node.status,
        note: node.note,
        description: node.description,
        phaseAffinity,
      },
      position: { x: 0, y: 0 }, // Will be set by dagre
    })

    // Create edge from parent
    if (parentId) {
      const edgeId = `edge-${parentId}-${id}`
      g.setEdge(parentId, id)
      edges.push({
        id: edgeId,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: {
          stroke: getEdgeColor(node.status),
          strokeWidth: 2,
        },
      })
    }

    // Process children
    if (node.children) {
      for (const child of node.children) {
        processNode(child, id)
      }
    }

    return id
  }

  // Build the graph
  processNode(trace)

  // Run dagre layout
  dagre.layout(g)

  // Apply positions to nodes
  for (const node of nodes) {
    const layoutNode = g.node(node.id)
    if (layoutNode) {
      // Dagre gives center coordinates; convert to top-left
      const dims = NODE_DIMENSIONS[node.data.nodeType]
      node.position = {
        x: layoutNode.x - dims.width / 2,
        y: layoutNode.y - dims.height / 2,
      }
    }
  }

  return { nodes, edges }
}

/**
 * Get edge color based on status
 */
function getEdgeColor(status: BTStatus): string {
  switch (status) {
    case 'SUCCESS':
      return '#22c55e' // green
    case 'FAILURE':
      return '#9ca3af' // gray (failed paths are muted)
    case 'RUNNING':
      return '#3b82f6' // blue
    default:
      return '#9ca3af'
  }
}

/**
 * Get status-specific styles for nodes
 */
export function getStatusStyles(status: BTStatus): {
  borderColor: string
  backgroundColor: string
  shadow?: string
} {
  switch (status) {
    case 'SUCCESS':
      return {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        shadow: '0 0 8px rgba(34, 197, 94, 0.4)',
      }
    case 'FAILURE':
      return {
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
      }
    case 'RUNNING':
      return {
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        shadow: '0 0 12px rgba(59, 130, 246, 0.5)',
      }
    default:
      return {
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
      }
  }
}

/**
 * Get wizard-specific styles that overlay on node styling
 */
export function getWizardStyles(wizardState: WizardNodeState | undefined): {
  opacity?: number
  scale?: number
  ring?: string
  ringAnimation?: string
  filter?: string
} {
  if (!wizardState || wizardState === 'unvisited') {
    return {}
  }

  switch (wizardState) {
    case 'current':
      return {
        scale: 1.05,
        ring: '0 0 0 3px rgba(251, 191, 36, 0.6), 0 0 20px rgba(251, 191, 36, 0.4)',
        ringAnimation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    case 'visited':
      return {
        ring: '0 0 0 2px rgba(34, 197, 94, 0.5)',
      }
    case 'dimmed':
      return {
        opacity: 0.3,
        filter: 'grayscale(0.5)',
      }
    default:
      return {}
  }
}

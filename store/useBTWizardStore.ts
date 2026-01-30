'use client'

import { create } from 'zustand'
import type { BTNodeTrace, BTNodeType } from '@/lib/sim/trace'

export type WizardHighlightMode = 'cumulative' | 'focused'

export type WizardNodeState = 'unvisited' | 'current' | 'visited' | 'dimmed'

export interface WizardNode {
  id: string
  traceIndex: number // position in flat trace array for lookup
  type: BTNodeType
  name: string
  description?: string
  parentId: string | null
  childIds: string[]
  // For building questions
  note?: string
}

export interface WizardAnswer {
  nodeId: string
  answer: boolean | number // boolean for conditions, number for selector choice index
}

interface BTWizardState {
  // Mode
  isWizardActive: boolean
  highlightMode: WizardHighlightMode

  // Navigation state
  currentNodeId: string | null
  visitedPath: string[] // ordered list of visited node IDs
  answers: WizardAnswer[]

  // Tree structure
  nodeMap: Map<string, WizardNode>
  rootNodeId: string | null

  // Original trace for reference
  originalTrace: BTNodeTrace | null

  // Actions
  startWizard: (trace: BTNodeTrace) => void
  stopWizard: () => void
  toggleWizard: (trace: BTNodeTrace | null) => void

  answerCondition: (nodeId: string, answer: boolean) => void
  selectBranch: (nodeId: string, childIndex: number) => void
  goBack: () => void
  reset: () => void

  setHighlightMode: (mode: WizardHighlightMode) => void

  // Computed
  getNodeState: (nodeId: string) => WizardNodeState
  getCurrentQuestion: () => WizardQuestion | null
}

export interface WizardQuestion {
  nodeId: string
  type: 'condition' | 'selector'
  question: string
  options: string[] // ['Yes', 'No'] for conditions, child names for selectors
  nodeName: string
}

/**
 * Build a navigable map from BTNodeTrace
 */
function buildNodeMap(trace: BTNodeTrace): { nodeMap: Map<string, WizardNode>; rootId: string } {
  const nodeMap = new Map<string, WizardNode>()
  let counter = 0

  function processNode(node: BTNodeTrace, parentId: string | null): string {
    const id = `wizard-${counter++}`
    const childIds: string[] = []

    // Process children first to get their IDs
    if (node.children) {
      for (const child of node.children) {
        const childId = processNode(child, id)
        childIds.push(childId)
      }
    }

    nodeMap.set(id, {
      id,
      traceIndex: counter - 1,
      type: node.nodeType,
      name: node.nodeName ?? node.nodeType,
      description: node.description,
      note: node.note,
      parentId,
      childIds,
    })

    return id
  }

  const rootId = processNode(trace, null)
  return { nodeMap, rootId }
}

/**
 * Find the next decision point (Condition or Selector with multiple children)
 */
function findNextDecisionPoint(
  nodeId: string,
  nodeMap: Map<string, WizardNode>,
  visitedPath: string[]
): string | null {
  const node = nodeMap.get(nodeId)
  if (!node) return null

  // Check if this node is a decision point
  if (node.type === 'Condition') {
    return nodeId
  }

  if (node.type === 'Selector' && node.childIds.length > 1) {
    return nodeId
  }

  // For Sequence, Decorator, or single-child Selector: auto-advance
  if (node.childIds.length === 1) {
    return findNextDecisionPoint(node.childIds[0], nodeMap, [...visitedPath, nodeId])
  }

  // For Action nodes or Sequence with multiple children, advance through first child
  if (node.childIds.length > 0) {
    return findNextDecisionPoint(node.childIds[0], nodeMap, [...visitedPath, nodeId])
  }

  // Terminal node (Action with no children)
  return nodeId
}

/**
 * Generate a human-readable question from a node
 */
function generateQuestion(node: WizardNode, nodeMap: Map<string, WizardNode>): WizardQuestion {
  if (node.type === 'Condition') {
    // Use description if available, otherwise format the name as a question
    const question = node.description || formatNameAsQuestion(node.name)
    return {
      nodeId: node.id,
      type: 'condition',
      question,
      options: ['Yes', 'No'],
      nodeName: node.name,
    }
  }

  if (node.type === 'Selector') {
    const childNames = node.childIds.map(id => {
      const child = nodeMap.get(id)
      return child?.name ?? 'Unknown'
    })

    return {
      nodeId: node.id,
      type: 'selector',
      question: node.description || `Which path should ${formatNodeName(node.name)} take?`,
      options: childNames,
      nodeName: node.name,
    }
  }

  // For Action or terminal nodes
  return {
    nodeId: node.id,
    type: 'condition',
    question: node.description || `${node.name} - End of path`,
    options: [],
    nodeName: node.name,
  }
}

function formatNameAsQuestion(name: string): string {
  // Convert CamelCase or snake_case to readable question
  const readable = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()

  // Check if it already looks like a question
  if (readable.includes('?')) return readable

  // Common patterns
  if (readable.startsWith('is ') || readable.startsWith('has ') || readable.startsWith('can ')) {
    return readable.charAt(0).toUpperCase() + readable.slice(1) + '?'
  }

  return `Is "${name}" true?`
}

function formatNodeName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
}

export const useBTWizardStore = create<BTWizardState>((set, get) => ({
  isWizardActive: false,
  highlightMode: 'cumulative',
  currentNodeId: null,
  visitedPath: [],
  answers: [],
  nodeMap: new Map(),
  rootNodeId: null,
  originalTrace: null,

  startWizard: (trace) => {
    const { nodeMap, rootId } = buildNodeMap(trace)

    // Find first decision point
    const firstDecision = findNextDecisionPoint(rootId, nodeMap, [])
    const pathToFirst = firstDecision ? collectPathTo(rootId, firstDecision, nodeMap) : [rootId]

    set({
      isWizardActive: true,
      nodeMap,
      rootNodeId: rootId,
      originalTrace: trace,
      currentNodeId: firstDecision || rootId,
      visitedPath: pathToFirst,
      answers: [],
    })
  },

  stopWizard: () => {
    set({
      isWizardActive: false,
      currentNodeId: null,
      visitedPath: [],
      answers: [],
    })
  },

  toggleWizard: (trace) => {
    const { isWizardActive, startWizard, stopWizard } = get()
    if (isWizardActive) {
      stopWizard()
    } else if (trace) {
      startWizard(trace)
    }
  },

  answerCondition: (nodeId, answer) => {
    const { nodeMap, visitedPath, answers } = get()
    const node = nodeMap.get(nodeId)
    if (!node) return

    // Record the answer
    const newAnswers = [...answers, { nodeId, answer }]

    // Determine next node based on answer
    // For conditions: Yes (true) = first child, No (false) = we're done with this branch
    // This is simplified - in real BT, conditions don't have children the same way
    // We'll advance to next sibling or parent's next

    let nextNodeId: string | null = null

    if (answer && node.childIds.length > 0) {
      // Yes - follow the path
      nextNodeId = findNextDecisionPoint(node.childIds[0], nodeMap, [...visitedPath, nodeId])
    } else {
      // No - this condition failed, try to find next sibling or backtrack
      nextNodeId = findNextAfterFailure(nodeId, nodeMap, visitedPath)
    }

    const newPath = [...visitedPath]
    if (!newPath.includes(nodeId)) {
      newPath.push(nodeId)
    }

    if (nextNodeId && !newPath.includes(nextNodeId)) {
      // Add path to next node
      const pathToNext = collectPathTo(nodeId, nextNodeId, nodeMap)
      for (const id of pathToNext) {
        if (!newPath.includes(id)) {
          newPath.push(id)
        }
      }
    }

    set({
      currentNodeId: nextNodeId,
      visitedPath: newPath,
      answers: newAnswers,
    })
  },

  selectBranch: (nodeId, childIndex) => {
    const { nodeMap, visitedPath, answers } = get()
    const node = nodeMap.get(nodeId)
    if (!node || childIndex >= node.childIds.length) return

    const selectedChildId = node.childIds[childIndex]
    const newAnswers = [...answers, { nodeId, answer: childIndex }]

    // Find next decision point from selected child
    const nextNodeId = findNextDecisionPoint(selectedChildId, nodeMap, [...visitedPath, nodeId])

    const newPath = [...visitedPath]
    if (!newPath.includes(nodeId)) {
      newPath.push(nodeId)
    }

    // Add path to next node
    const pathToNext = collectPathTo(nodeId, nextNodeId || selectedChildId, nodeMap)
    for (const id of pathToNext) {
      if (!newPath.includes(id)) {
        newPath.push(id)
      }
    }

    set({
      currentNodeId: nextNodeId,
      visitedPath: newPath,
      answers: newAnswers,
    })
  },

  goBack: () => {
    const { visitedPath, answers, nodeMap, rootNodeId } = get()
    if (visitedPath.length <= 1 || answers.length === 0) {
      // Reset to start
      get().reset()
      return
    }

    // Remove last answer and recalculate current position
    const newAnswers = answers.slice(0, -1)

    // Find the node for the last answer and go back to it
    const lastAnsweredNodeId = newAnswers.length > 0
      ? newAnswers[newAnswers.length - 1].nodeId
      : rootNodeId

    // Rebuild path up to last answered node
    const newPath: string[] = []
    for (const nodeId of visitedPath) {
      newPath.push(nodeId)
      if (nodeId === lastAnsweredNodeId) break
    }

    // Find next decision from last answered
    const nextDecision = lastAnsweredNodeId
      ? findNextDecisionPoint(lastAnsweredNodeId, nodeMap, newPath)
      : rootNodeId

    set({
      currentNodeId: nextDecision || lastAnsweredNodeId,
      visitedPath: newPath,
      answers: newAnswers,
    })
  },

  reset: () => {
    const { nodeMap, rootNodeId } = get()
    if (!rootNodeId) return

    const firstDecision = findNextDecisionPoint(rootNodeId, nodeMap, [])
    const pathToFirst = firstDecision ? collectPathTo(rootNodeId, firstDecision, nodeMap) : [rootNodeId]

    set({
      currentNodeId: firstDecision || rootNodeId,
      visitedPath: pathToFirst,
      answers: [],
    })
  },

  setHighlightMode: (mode) => set({ highlightMode: mode }),

  getNodeState: (nodeId) => {
    const { isWizardActive, currentNodeId, visitedPath, highlightMode } = get()

    if (!isWizardActive) return 'unvisited'

    if (nodeId === currentNodeId) return 'current'

    if (visitedPath.includes(nodeId)) return 'visited'

    if (highlightMode === 'focused') return 'dimmed'

    return 'unvisited'
  },

  getCurrentQuestion: () => {
    const { currentNodeId, nodeMap, isWizardActive } = get()

    if (!isWizardActive || !currentNodeId) return null

    const node = nodeMap.get(currentNodeId)
    if (!node) return null

    return generateQuestion(node, nodeMap)
  },
}))

/**
 * Find next node after a condition failure (need to backtrack to parent's next sibling)
 */
function findNextAfterFailure(
  nodeId: string,
  nodeMap: Map<string, WizardNode>,
  visitedPath: string[]
): string | null {
  const node = nodeMap.get(nodeId)
  if (!node || !node.parentId) return null

  const parent = nodeMap.get(node.parentId)
  if (!parent) return null

  // Find current node's index in parent's children
  const nodeIndex = parent.childIds.indexOf(nodeId)

  // If parent is a Selector and there's a next sibling, try it
  if (parent.type === 'Selector' && nodeIndex < parent.childIds.length - 1) {
    const nextSiblingId = parent.childIds[nodeIndex + 1]
    return findNextDecisionPoint(nextSiblingId, nodeMap, visitedPath)
  }

  // Otherwise, continue backtracking up the tree
  return findNextAfterFailure(parent.id, nodeMap, visitedPath)
}

/**
 * Collect the path between two nodes (for adding to visited path)
 */
function collectPathTo(
  fromId: string,
  toId: string,
  nodeMap: Map<string, WizardNode>
): string[] {
  const path: string[] = []

  // Simple DFS to find path
  function dfs(currentId: string, target: string, currentPath: string[]): boolean {
    if (currentId === target) {
      path.push(...currentPath, currentId)
      return true
    }

    const node = nodeMap.get(currentId)
    if (!node) return false

    for (const childId of node.childIds) {
      if (dfs(childId, target, [...currentPath, currentId])) {
        return true
      }
    }

    return false
  }

  dfs(fromId, toId, [])
  return path
}

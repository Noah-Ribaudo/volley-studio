'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type FlowNodeKind = 'start' | 'step' | 'decision' | 'end'

type FlowNode = {
  id: string
  label: string
  notes: string
  x: number
  y: number
  kind: FlowNodeKind
}

type FlowEdge = {
  id: string
  source: string
  target: string
  label: string
}

type FlowDocument = {
  title: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const STORAGE_KEY = 'volley-studio-sequence-flow-board-v1'
const CANVAS_WIDTH = 880
const CANVAS_HEIGHT = 360
const FOCUSED_CANVAS_WIDTH = 1680
const FOCUSED_CANVAS_HEIGHT = 980

const NODE_SIZE: Record<FlowNodeKind, { width: number; height: number }> = {
  start: { width: 152, height: 74 },
  step: { width: 168, height: 88 },
  decision: { width: 176, height: 96 },
  end: { width: 152, height: 74 },
}

const KIND_LABEL: Record<FlowNodeKind, string> = {
  start: 'Start',
  step: 'Step',
  decision: 'Decision',
  end: 'End',
}

const INITIAL_DOCUMENT: FlowDocument = {
  title: 'Special Attack Flow',
  nodes: [
    { id: 'start', label: 'Receive', notes: 'Entry point for the special attack flow.', x: 56, y: 124, kind: 'start' },
    { id: 'trigger', label: 'Trigger Read', notes: 'What has to happen for the special attack to become available?', x: 280, y: 108, kind: 'decision' },
    { id: 'attack', label: 'Special Attack', notes: 'Describe the look, who is involved, and the expected outcome.', x: 532, y: 108, kind: 'step' },
    { id: 'fallback', label: 'Regular Attack', notes: 'Where the sequence goes when the special attack is not on.', x: 532, y: 236, kind: 'end' },
  ],
  edges: [
    { id: 'edge-1', source: 'start', target: 'trigger', label: 'ball controlled' },
    { id: 'edge-2', source: 'trigger', target: 'attack', label: 'yes' },
    { id: 'edge-3', source: 'trigger', target: 'fallback', label: 'no' },
  ],
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getNodeSize(kind: FlowNodeKind) {
  return NODE_SIZE[kind]
}

function getNodeStyles(kind: FlowNodeKind, selected: boolean) {
  if (kind === 'start') {
    return selected
      ? 'border-amber-500 bg-amber-100/90 text-amber-950 shadow-[0_10px_24px_rgba(180,120,0,0.16)]'
      : 'border-amber-200 bg-amber-50/92 text-amber-950 shadow-[0_6px_18px_rgba(180,120,0,0.08)]'
  }

  if (kind === 'decision') {
    return selected
      ? 'border-blue-500 bg-blue-100/92 text-blue-950 shadow-[0_10px_24px_rgba(37,99,235,0.14)]'
      : 'border-blue-200 bg-blue-50/92 text-blue-950 shadow-[0_6px_18px_rgba(37,99,235,0.08)]'
  }

  if (kind === 'end') {
    return selected
      ? 'border-emerald-500 bg-emerald-100/92 text-emerald-950 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
      : 'border-emerald-200 bg-emerald-50/92 text-emerald-950 shadow-[0_6px_18px_rgba(16,185,129,0.08)]'
  }

  return selected
    ? 'border-border/90 bg-card text-foreground shadow-[0_12px_28px_rgba(0,0,0,0.12)]'
    : 'border-border bg-card/95 text-foreground shadow-[0_8px_18px_rgba(0,0,0,0.08)]'
}

function buildSummary(document: FlowDocument) {
  const nodeMap = new Map(document.nodes.map((node) => [node.id, node]))
  const lines = [`${document.title}`, '']

  for (const node of document.nodes) {
    lines.push(`${KIND_LABEL[node.kind]}: ${node.label}`)

    if (node.notes.trim()) {
      lines.push(`Notes: ${node.notes.trim()}`)
    }

    const outgoing = document.edges.filter((edge) => edge.source === node.id)
    if (outgoing.length === 0) {
      lines.push('Next: none')
    } else {
      for (const edge of outgoing) {
        const target = nodeMap.get(edge.target)
        lines.push(`Next: ${target?.label || edge.target}${edge.label ? ` (${edge.label})` : ''}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function SequenceFlowBoard({ className }: { className?: string }) {
  const [document, setDocument] = useState<FlowDocument>(INITIAL_DOCUMENT)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(INITIAL_DOCUMENT.nodes[0]?.id ?? null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectFromNodeId, setConnectFromNodeId] = useState<string | null>(null)
  const [importValue, setImportValue] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'summary' | 'json'>('idle')
  const [isFocused, setIsFocused] = useState(false)
  const dragStateRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const canvasWidth = isFocused ? FOCUSED_CANVAS_WIDTH : CANVAS_WIDTH
  const canvasHeight = isFocused ? FOCUSED_CANVAS_HEIGHT : CANVAS_HEIGHT

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as FlowDocument
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return
      setDocument(parsed)
      setSelectedNodeId(parsed.nodes[0]?.id ?? null)
    } catch {
      // Ignore malformed local data and fall back to the starter board.
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
  }, [document])

  useEffect(() => {
    if (copyState === 'idle') return
    const timeout = window.setTimeout(() => setCopyState('idle'), 1400)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current
      const board = boardRef.current
      if (!drag || !board) return

      const rect = board.getBoundingClientRect()
      setDocument((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          if (node.id !== drag.nodeId) return node
          const size = getNodeSize(node.kind)
          return {
            ...node,
            x: clamp(event.clientX - rect.left - drag.offsetX, 0, canvasWidth - size.width),
            y: clamp(event.clientY - rect.top - drag.offsetY, 0, canvasHeight - size.height),
          }
        }),
      }))
    }

    const handlePointerUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [canvasHeight, canvasWidth])

  const nodeMap = useMemo(() => new Map(document.nodes.map((node) => [node.id, node])), [document.nodes])
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null
  const selectedEdge = selectedEdgeId ? document.edges.find((edge) => edge.id === selectedEdgeId) ?? null : null

  const edgePaths = useMemo(() => {
    return document.edges
      .map((edge) => {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)
        if (!source || !target) return null

        const sourceSize = getNodeSize(source.kind)
        const targetSize = getNodeSize(target.kind)
        const startX = source.x + sourceSize.width
        const startY = source.y + sourceSize.height / 2
        const endX = target.x
        const endY = target.y + targetSize.height / 2
        const deltaX = Math.max(64, Math.abs(endX - startX) * 0.45)
        const path = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`
        const labelX = startX + (endX - startX) / 2
        const labelY = startY + (endY - startY) / 2

        return { edge, path, labelX, labelY }
      })
      .filter(Boolean) as Array<{ edge: FlowEdge; path: string; labelX: number; labelY: number }>
  }, [document.edges, nodeMap])

  const updateSelectedNode = (patch: Partial<FlowNode>) => {
    if (!selectedNodeId) return
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)),
    }))
  }

  const updateSelectedEdge = (patch: Partial<FlowEdge>) => {
    if (!selectedEdgeId) return
    setDocument((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === selectedEdgeId ? { ...edge, ...patch } : edge)),
    }))
  }

  const addNode = (kind: FlowNodeKind) => {
    const nextId = `node-${Math.random().toString(36).slice(2, 8)}`
    const size = getNodeSize(kind)
    const nextNode: FlowNode = {
      id: nextId,
      kind,
      label: `${KIND_LABEL[kind]} ${document.nodes.length + 1}`,
      notes: '',
      x: clamp(40 + document.nodes.length * 18, 0, canvasWidth - size.width),
      y: clamp(40 + document.nodes.length * 14, 0, canvasHeight - size.height),
    }

    setDocument((current) => ({ ...current, nodes: [...current.nodes, nextNode] }))
    setSelectedNodeId(nextId)
    setSelectedEdgeId(null)
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return
    setDocument((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    }))
    setSelectedNodeId(null)
  }

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return
    setDocument((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
    }))
    setSelectedEdgeId(null)
  }

  const resetBoard = () => {
    setDocument(INITIAL_DOCUMENT)
    setSelectedNodeId(INITIAL_DOCUMENT.nodes[0]?.id ?? null)
    setSelectedEdgeId(null)
    setConnectFromNodeId(null)
    setImportValue('')
  }

  const handleNodeClick = (nodeId: string) => {
    if (connectFromNodeId && connectFromNodeId !== nodeId) {
      const exists = document.edges.some((edge) => edge.source === connectFromNodeId && edge.target === nodeId)
      if (!exists) {
        const nextEdge: FlowEdge = {
          id: `edge-${Math.random().toString(36).slice(2, 8)}`,
          source: connectFromNodeId,
          target: nodeId,
          label: '',
        }
        setDocument((current) => ({ ...current, edges: [...current.edges, nextEdge] }))
        setSelectedEdgeId(nextEdge.id)
      }
      setConnectFromNodeId(null)
      setSelectedNodeId(null)
      return
    }

    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    setConnectFromNodeId((current) => (current === nodeId ? null : current))
  }

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, node: FlowNode) => {
    if (connectFromNodeId) return
    const rect = event.currentTarget.getBoundingClientRect()
    dragStateRef.current = {
      nodeId: node.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
  }

  const controlBar = (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => addNode('step')}>
        Add step
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => addNode('decision')}>
        Add decision
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => addNode('end')}>
        Add end
      </Button>
      <Button
        type="button"
        size="sm"
        variant={connectFromNodeId ? 'default' : 'outline'}
        onClick={() => setConnectFromNodeId((current) => (current ? null : selectedNodeId))}
      >
        {connectFromNodeId ? 'Pick target' : 'Connect'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          const copied = await copyText(buildSummary(document))
          if (copied) setCopyState('summary')
        }}
      >
        {copyState === 'summary' ? 'Summary copied' : 'Copy summary'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          const copied = await copyText(JSON.stringify(document, null, 2))
          if (copied) setCopyState('json')
        }}
      >
        {copyState === 'json' ? 'JSON copied' : 'Copy JSON'}
      </Button>
      <Button type="button" size="sm" variant={isFocused ? 'default' : 'outline'} onClick={() => setIsFocused((prev) => !prev)}>
        {isFocused ? 'Exit focus' : 'Focus'}
      </Button>
    </>
  )

  const inspector = (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Board title</p>
        <Input
          value={document.title}
          onChange={(event) => setDocument((current) => ({ ...current, title: event.target.value }))}
          placeholder="Name this flow"
        />
      </div>

      {selectedNode ? (
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium">Selected step</p>
            <Input
              value={selectedNode.label}
              onChange={(event) => updateSelectedNode({ label: event.target.value })}
              placeholder="Step label"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">What should happen here?</p>
            <Textarea
              value={selectedNode.notes}
              onChange={(event) => updateSelectedNode({ notes: event.target.value })}
              placeholder="Add the meaning, rules, or coaching notes for this step."
              className="min-h-24"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Type</p>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={selectedNode.kind}
              onChange={(event) => updateSelectedNode({ kind: event.target.value as FlowNodeKind })}
            >
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={deleteSelectedNode}>
            Delete selected step
          </Button>
        </>
      ) : selectedEdge ? (
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium">Selected arrow</p>
            <Input
              value={selectedEdge.label}
              onChange={(event) => updateSelectedEdge({ label: event.target.value })}
              placeholder="Label what causes this move"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={deleteSelectedEdge}>
            Delete selected arrow
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click a step or arrow to edit it. Use connect mode to draw the sequence between steps.
        </p>
      )}
    </div>
  )

  const importPanel = (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Paste or save a full board</p>
        <Textarea
          value={importValue}
          onChange={(event) => setImportValue(event.target.value)}
          placeholder='Paste the copied JSON here if you want to load a different board.'
          className="min-h-32 font-mono text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              const parsed = JSON.parse(importValue) as FlowDocument
              if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || typeof parsed.title !== 'string') {
                return
              }
              setDocument(parsed)
              setSelectedNodeId(parsed.nodes[0]?.id ?? null)
              setSelectedEdgeId(null)
              setConnectFromNodeId(null)
            } catch {
              // Ignore invalid JSON input.
            }
          }}
        >
          Load pasted JSON
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetBoard}>
          Reset starter board
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        This board saves in your browser automatically, so you can sketch now and come back without losing the flow.
      </p>
    </div>
  )

  const boardCanvas = (
    <div className="overflow-auto rounded-2xl border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(245,240,232,0.88)_100%)]">
      <div
        ref={boardRef}
        className="relative"
          style={{ width: canvasWidth, height: canvasHeight }}
        onClick={() => {
          setSelectedNodeId(null)
          setSelectedEdgeId(null)
        }}
      >
        <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(120,120,120,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,120,120,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
        />

        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(71,85,105,0.8)" />
            </marker>
          </defs>

          {edgePaths.map(({ edge, path, labelX, labelY }) => {
            const selected = selectedEdgeId === edge.id
            return (
              <g key={edge.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={selected ? 'rgba(234, 88, 12, 0.95)' : 'rgba(71, 85, 105, 0.7)'}
                  strokeWidth={selected ? 3 : 2}
                  markerEnd="url(#flow-arrow)"
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                  }}
                />
                <g transform={`translate(${labelX} ${labelY})`}>
                  <rect
                    x={-56}
                    y={-11}
                    width={112}
                    height={22}
                    rx={11}
                    fill={selected ? 'rgba(255,237,213,0.94)' : 'rgba(255,255,255,0.92)'}
                    stroke={selected ? 'rgba(234,88,12,0.3)' : 'rgba(148,163,184,0.24)'}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-600 text-[11px] font-medium"
                  >
                    {edge.label || 'unlabeled'}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {document.nodes.map((node) => {
          const size = getNodeSize(node.kind)
          const selected = selectedNodeId === node.id

          return (
            <button
              key={node.id}
              type="button"
              className={cn(
                'absolute flex flex-col items-start justify-between rounded-2xl border p-3 text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring',
                getNodeStyles(node.kind, selected),
                connectFromNodeId === node.id && 'ring-2 ring-amber-500 ring-offset-2'
              )}
              style={{
                left: node.x,
                top: node.y,
                width: size.width,
                height: size.height,
              }}
              onClick={(event) => {
                event.stopPropagation()
                handleNodeClick(node.id)
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                handleNodePointerDown(event, node)
              }}
            >
              <Badge variant="outline" className="bg-white/70">
                {KIND_LABEL[node.kind]}
              </Badge>
              <div className="space-y-1">
                <div className="text-sm font-semibold leading-tight">{node.label || 'Untitled step'}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {node.notes || 'Add a short note so the sequence is easy to understand later.'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <Card className={cn('overflow-hidden py-0', className)}>
      <CardHeader className="gap-3 border-b border-border/60 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Flow Board</CardTitle>
            <CardDescription>
              Draw the sequence with notes and transition labels so I can use it as the working spec too.
            </CardDescription>
          </div>
          <Badge variant="outline">{document.nodes.length} steps</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {controlBar}
        </div>
        {connectFromNodeId ? (
          <p className="text-xs text-muted-foreground">
            Connection mode is on. Click another step to draw the arrow from{' '}
            <span className="font-medium text-foreground">{nodeMap.get(connectFromNodeId)?.label || 'selected step'}</span>.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-4">
        {boardCanvas}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {inspector}
          {importPanel}
        </div>
      </CardContent>
      </Card>

      <Dialog open={isFocused} onOpenChange={setIsFocused}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 left-0 top-0 h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:max-w-none"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Focused Flow Board</DialogTitle>
            <DialogDescription>Full-screen workspace for sketching and editing the flow sequence.</DialogDescription>
          </DialogHeader>

          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/96 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{document.title || 'Flow Board'}</p>
                <p className="text-xs text-muted-foreground">
                  Full-screen mode for editing the sequence with the board and controls kept in view.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {controlBar}
              </div>
            </div>

            {connectFromNodeId ? (
              <div className="border-b border-border/60 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                Connection mode is on. Click another step to draw the arrow from{' '}
                <span className="font-medium">{nodeMap.get(connectFromNodeId)?.label || 'selected step'}</span>.
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-0 overflow-hidden">{boardCanvas}</div>
              <div className="flex min-h-0 flex-col gap-4 overflow-auto">
                {inspector}
                {importPanel}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Data Model Definitions ───────────────────────────────────────────────────

interface Field {
  name: string
  type: string
  optional?: boolean
}

interface DataEntity {
  id: string
  name: string
  storage: 'convex' | 'localStorage' | 'memory' | 'generated'
  description: string
  fields: Field[]
  pages: { name: string; path: string; usage: string }[]
}

interface Relationship {
  from: string
  to: string
  label: string
  type: 'has-many' | 'has-one' | 'belongs-to' | 'references'
}

const ENTITIES: DataEntity[] = [
  {
    id: 'user',
    name: 'User',
    storage: 'convex',
    description: 'Authenticated user account from Convex Auth',
    fields: [
      { name: '_id', type: 'Id' },
      { name: 'name', type: 'string', optional: true },
      { name: 'email', type: 'string' },
      { name: 'image', type: 'string', optional: true },
    ],
    pages: [
      { name: 'Settings', path: '/settings', usage: 'Show account info, sign out' },
      { name: 'Navigation', path: '/', usage: 'Profile menu, auth state' },
    ],
  },
  {
    id: 'userSettings',
    name: 'UserSettings',
    storage: 'convex',
    description: 'Per-user preferences: display options, whiteboard config, theme',
    fields: [
      { name: 'userId', type: 'Id<"users">' },
      { name: 'themePreference', type: "'light' | 'dark' | 'auto'" },
      { name: 'showPosition', type: 'boolean' },
      { name: 'showPlayer', type: 'boolean' },
      { name: 'showLibero', type: 'boolean' },
      { name: 'circleTokens', type: 'boolean' },
      { name: 'hideAwayTeam', type: 'boolean' },
      { name: 'visiblePhases', type: 'string[]', optional: true },
      { name: 'phaseOrder', type: 'string[]', optional: true },
      { name: 'navMode', type: "'sidebar' | 'header'" },
      { name: 'tokenSize', type: "'big' | 'small'" },
      { name: 'backgroundShader', type: 'string', optional: true },
      { name: 'backgroundOpacity', type: 'number', optional: true },
    ],
    pages: [
      { name: 'Settings', path: '/settings', usage: 'All toggle controls and preference UI' },
      { name: 'Whiteboard', path: '/', usage: 'Display config (tokens, phases, libero)' },
      { name: 'Navigation', path: '/', usage: 'Sidebar vs header nav mode' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    storage: 'convex',
    description: 'A volleyball team with roster and lineups. Can also be local-only (localStorage).',
    fields: [
      { name: '_id', type: 'Id<"teams">' },
      { name: 'name', type: 'string' },
      { name: 'slug', type: 'string' },
      { name: 'userId', type: 'Id<"users">' },
      { name: 'roster', type: 'RosterPlayer[]' },
      { name: 'lineups', type: 'Lineup[]' },
      { name: 'active_lineup_id', type: 'string | null' },
      { name: 'archived', type: 'boolean', optional: true },
      { name: 'hasPassword', type: 'boolean', optional: true },
    ],
    pages: [
      { name: 'Teams', path: '/teams', usage: 'List, search, create, clone teams' },
      { name: 'Team Edit', path: '/teams/[id]', usage: 'Edit name, roster, lineups, delete' },
      { name: 'Whiteboard', path: '/', usage: 'Select active team, load layouts' },
      { name: 'GameTime', path: '/gametime', usage: 'Select team for live game tracking' },
      { name: 'Settings', path: '/settings', usage: 'Show team count' },
    ],
  },
  {
    id: 'rosterPlayer',
    name: 'RosterPlayer',
    storage: 'convex',
    description: 'A player on a team roster with name and jersey number',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string', optional: true },
      { name: 'number', type: 'number', optional: true },
    ],
    pages: [
      { name: 'Team Edit', path: '/teams/[id]', usage: 'Add, edit, remove players' },
      { name: 'Whiteboard', path: '/', usage: 'Show player names/numbers on tokens' },
      { name: 'GameTime', path: '/gametime', usage: 'Display lineup with player info' },
    ],
  },
  {
    id: 'lineup',
    name: 'Lineup',
    storage: 'convex',
    description: 'A named position assignment mapping roles to players (e.g., "Lineup 1")',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'position_assignments', type: 'Record<Role, playerId>' },
      { name: 'position_source', type: "'custom' | '5-1' | '6-2'", optional: true },
      { name: 'created_at', type: 'string' },
    ],
    pages: [
      { name: 'Team Edit', path: '/teams/[id]', usage: 'Create, edit, duplicate, delete lineups' },
      { name: 'Whiteboard', path: '/', usage: 'Court Setup menu — select active lineup' },
      { name: 'GameTime', path: '/gametime', usage: 'Setup phase — pick lineup for game' },
    ],
  },
  {
    id: 'customLayout',
    name: 'CustomLayout',
    storage: 'convex',
    description: 'Saved court positions for a specific team + rotation + phase combination',
    fields: [
      { name: '_id', type: 'Id<"customLayouts">' },
      { name: 'teamId', type: 'Id<"teams">' },
      { name: 'rotation', type: '1-6' },
      { name: 'phase', type: 'RallyPhase' },
      { name: 'positions', type: 'PositionCoordinates' },
      { name: 'flags', type: 'LayoutExtendedData', optional: true },
      { name: 'updated_at', type: 'string', optional: true },
    ],
    pages: [
      { name: 'Whiteboard', path: '/', usage: 'Load/save positions, arrows, status flags, tags' },
    ],
  },
  {
    id: 'layoutExtendedData',
    name: 'LayoutExtendedData',
    storage: 'convex',
    description: 'Rich metadata stored inside CustomLayout: arrows, status badges, token tags',
    fields: [
      { name: 'arrows', type: 'Record<Role, Position>', optional: true },
      { name: 'arrowFlips', type: 'Record<Role, boolean>', optional: true },
      { name: 'arrowCurves', type: 'Record<Role, CurveConfig>', optional: true },
      { name: 'statusFlags', type: 'Record<Role, PlayerStatus[]>', optional: true },
      { name: 'attackBallPosition', type: 'Position', optional: true },
      { name: 'tagFlags', type: 'Record<Role, TokenTag[]>', optional: true },
    ],
    pages: [
      { name: 'Whiteboard', path: '/', usage: 'Render arrows, status badges, token tags on court' },
    ],
  },
  {
    id: 'positionCoordinates',
    name: 'PositionCoordinates',
    storage: 'generated',
    description: 'Normalized (0-1) x/y positions for all 7 roles on the court',
    fields: [
      { name: 'S', type: 'Position {x, y}' },
      { name: 'OH1', type: 'Position {x, y}' },
      { name: 'OH2', type: 'Position {x, y}' },
      { name: 'MB1', type: 'Position {x, y}' },
      { name: 'MB2', type: 'Position {x, y}' },
      { name: 'OPP', type: 'Position {x, y}' },
      { name: 'L', type: 'Position {x, y}', optional: true },
    ],
    pages: [
      { name: 'Whiteboard', path: '/', usage: 'Core token positions on the court' },
      { name: 'Print Dialog', path: '/', usage: 'Render positions in print layout' },
    ],
  },
  {
    id: 'gameState',
    name: 'GameTimeState',
    storage: 'localStorage',
    description: 'Live game tracking state — scores, rotation, timeouts, libero status',
    fields: [
      { name: 'phase', type: "'setup' | 'playing' | 'finished'" },
      { name: 'rotation', type: '1-6' },
      { name: 'ourScore', type: 'number' },
      { name: 'theirScore', type: 'number' },
      { name: 'serving', type: "'us' | 'them'" },
      { name: 'timeouts', type: '{ us: number, them: number }' },
      { name: 'liberoOnCourt', type: 'boolean' },
      { name: 'liberoReplacedRole', type: 'Role | null' },
      { name: 'rallyHistory', type: 'RallyEvent[]' },
    ],
    pages: [
      { name: 'GameTime', path: '/gametime', usage: 'Full game tracking UI' },
    ],
  },
  {
    id: 'rallyEvent',
    name: 'RallyEvent',
    storage: 'localStorage',
    description: 'Record of a single point scored during a game',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'pointNumber', type: 'number' },
      { name: 'winner', type: "'us' | 'them'" },
      { name: 'rotation', type: '1-6' },
      { name: 'serving', type: "'us' | 'them'" },
      { name: 'ourScore', type: 'number' },
      { name: 'theirScore', type: 'number' },
      { name: 'timestamp', type: 'number' },
    ],
    pages: [
      { name: 'GameTime', path: '/gametime', usage: 'Rally history list, undo' },
    ],
  },
  {
    id: 'presetSystem',
    name: 'PresetSystem',
    storage: 'generated',
    description: 'Read-only position templates generated from whiteboard algorithm (5-1, 6-2)',
    fields: [
      { name: 'system', type: "'full-5-1' | '5-1-libero' | '6-2'" },
      { name: 'rotation', type: '1-6' },
      { name: 'phase', type: 'RallyPhase' },
      { name: 'positions', type: 'PositionCoordinates' },
      { name: 'flags', type: 'LayoutExtendedData', optional: true },
    ],
    pages: [
      { name: 'Whiteboard', path: '/', usage: 'Positions when lineup uses a preset source' },
    ],
  },
  {
    id: 'suggestion',
    name: 'SuggestionSubmission',
    storage: 'convex',
    description: 'User-submitted feedback and suggestions',
    fields: [
      { name: '_id', type: 'Id' },
      { name: 'userId', type: 'Id<"users">' },
      { name: 'submitterName', type: 'string', optional: true },
      { name: 'createdAt', type: 'number' },
    ],
    pages: [
      { name: 'Settings', path: '/settings', usage: 'SuggestionBox form' },
    ],
  },
]

const RELATIONSHIPS: Relationship[] = [
  { from: 'user', to: 'team', label: 'owns many', type: 'has-many' },
  { from: 'user', to: 'userSettings', label: 'has one', type: 'has-one' },
  { from: 'user', to: 'suggestion', label: 'creates', type: 'has-many' },
  { from: 'team', to: 'rosterPlayer', label: 'has many', type: 'has-many' },
  { from: 'team', to: 'lineup', label: 'has many', type: 'has-many' },
  { from: 'team', to: 'customLayout', label: 'has many', type: 'has-many' },
  { from: 'lineup', to: 'rosterPlayer', label: 'assigns roles to', type: 'references' },
  { from: 'lineup', to: 'presetSystem', label: 'can use', type: 'references' },
  { from: 'customLayout', to: 'positionCoordinates', label: 'contains', type: 'has-one' },
  { from: 'customLayout', to: 'layoutExtendedData', label: 'contains', type: 'has-one' },
  { from: 'presetSystem', to: 'positionCoordinates', label: 'generates', type: 'has-one' },
  { from: 'gameState', to: 'rallyEvent', label: 'records', type: 'has-many' },
  { from: 'gameState', to: 'team', label: 'can use', type: 'references' },
  { from: 'gameState', to: 'lineup', label: 'uses', type: 'references' },
]

// ─── Layout positions for the diagram ─────────────────────────────────────────

// Manually positioned for a clean, readable layout
const ENTITY_POSITIONS: Record<string, { x: number; y: number }> = {
  user:                { x: 100,  y: 60  },
  userSettings:        { x: 100,  y: 260 },
  suggestion:          { x: 100,  y: 460 },
  team:                { x: 420,  y: 60  },
  rosterPlayer:        { x: 420,  y: 260 },
  lineup:              { x: 720,  y: 60  },
  customLayout:        { x: 720,  y: 260 },
  layoutExtendedData:  { x: 720,  y: 460 },
  positionCoordinates: { x: 1020, y: 260 },
  presetSystem:        { x: 1020, y: 60  },
  gameState:           { x: 420,  y: 460 },
  rallyEvent:          { x: 420,  y: 630 },
}

const ENTITY_WIDTH = 200
const ENTITY_HEIGHT = 56

const STORAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  convex:       { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  localStorage: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  memory:       { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  generated:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  'has-many':   '#3b82f6',
  'has-one':    '#8b5cf6',
  'belongs-to': '#f59e0b',
  'references': '#6b7280',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataMapPage() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Pan & zoom state
  const [viewBox, setViewBox] = useState({ x: -40, y: -20, w: 1300, h: 750 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 })

  const selected = selectedEntity ? ENTITIES.find(e => e.id === selectedEntity) : null

  // Get all relationships connected to an entity
  const getConnectedRelationships = useCallback((entityId: string) => {
    return RELATIONSHIPS.filter(r => r.from === entityId || r.to === entityId)
  }, [])

  // Get connected entity IDs
  const getConnectedEntityIds = useCallback((entityId: string) => {
    const rels = getConnectedRelationships(entityId)
    const ids = new Set<string>()
    rels.forEach(r => {
      ids.add(r.from)
      ids.add(r.to)
    })
    return ids
  }, [getConnectedRelationships])

  // Mouse handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('.entity-node')) return
    setIsPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y })
  }, [viewBox.x, viewBox.y])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = viewBox.w / rect.width
    const scaleY = viewBox.h / rect.height
    const dx = (e.clientX - panStart.x) * scaleX
    const dy = (e.clientY - panStart.y) * scaleY
    setViewBox(prev => ({ ...prev, x: panStart.vx - dx, y: panStart.vy - dy }))
  }, [isPanning, panStart, viewBox.w, viewBox.h])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y
    const newW = viewBox.w * zoomFactor
    const newH = viewBox.h * zoomFactor
    const newX = mouseX - (mouseX - viewBox.x) * zoomFactor
    const newY = mouseY - (mouseY - viewBox.y) * zoomFactor
    setViewBox({ x: newX, y: newY, w: newW, h: newH })
  }, [viewBox])

  // Prevent default wheel on the SVG to avoid page scroll
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const preventScroll = (e: WheelEvent) => e.preventDefault()
    svg.addEventListener('wheel', preventScroll, { passive: false })
    return () => svg.removeEventListener('wheel', preventScroll)
  }, [])

  // Compute edge points between two entities
  const getEdgePoints = (fromId: string, toId: string) => {
    const from = ENTITY_POSITIONS[fromId]
    const to = ENTITY_POSITIONS[toId]
    if (!from || !to) return null

    const fCx = from.x + ENTITY_WIDTH / 2
    const fCy = from.y + ENTITY_HEIGHT / 2
    const tCx = to.x + ENTITY_WIDTH / 2
    const tCy = to.y + ENTITY_HEIGHT / 2

    // Determine best connection points (center of each side)
    const dx = tCx - fCx
    const dy = tCy - fCy

    let x1: number, y1: number, x2: number, y2: number

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        x1 = from.x + ENTITY_WIDTH
        y1 = fCy
        x2 = to.x
        y2 = tCy
      } else {
        x1 = from.x
        y1 = fCy
        x2 = to.x + ENTITY_WIDTH
        y2 = tCy
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        x1 = fCx
        y1 = from.y + ENTITY_HEIGHT
        x2 = tCx
        y2 = to.y
      } else {
        x1 = fCx
        y1 = from.y
        x2 = tCx
        y2 = to.y + ENTITY_HEIGHT
      }
    }

    return { x1, y1, x2, y2 }
  }

  const activeEntity = hoveredEntity || selectedEntity

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4">
      <div>
        <h1 className="text-xl font-semibold">Data Relationship Map</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive visualization of all data entities, their relationships, and which pages use them.
          Click an entity to see details. Scroll to zoom, drag to pan.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground font-medium">Storage:</span>
          {Object.entries(STORAGE_COLORS).map(([key, colors]) => (
            <span key={key} className={`px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {key === 'convex' ? 'Convex DB' : key === 'localStorage' ? 'LocalStorage' : key === 'memory' ? 'Memory' : 'Generated'}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground font-medium">Lines:</span>
          {Object.entries(RELATIONSHIP_COLORS).map(([key, color]) => (
            <span key={key} className="flex items-center gap-1">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray={key === 'references' ? '4 2' : 'none'} /></svg>
              <span className="text-muted-foreground">{key}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* SVG Diagram */}
        <div className="flex-1 min-w-0 border rounded-lg bg-muted/30 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="w-full h-full select-none"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Arrowhead markers */}
              {Object.entries(RELATIONSHIP_COLORS).map(([key, color]) => (
                <marker
                  key={key}
                  id={`arrow-${key}`}
                  viewBox="0 0 10 8"
                  refX="10"
                  refY="4"
                  markerWidth="8"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 4 L 0 8 z" fill={color} />
                </marker>
              ))}
            </defs>

            {/* Relationship lines */}
            {RELATIONSHIPS.map((rel, i) => {
              const pts = getEdgePoints(rel.from, rel.to)
              if (!pts) return null

              const isHighlighted = activeEntity ? (rel.from === activeEntity || rel.to === activeEntity) : false
              const isDimmed = activeEntity ? !isHighlighted : false
              const color = RELATIONSHIP_COLORS[rel.type] || '#6b7280'

              // Compute a curved path
              const midX = (pts.x1 + pts.x2) / 2
              const midY = (pts.y1 + pts.y2) / 2

              // Add slight curve offset to avoid overlapping lines
              const dx = pts.x2 - pts.x1
              const dy = pts.y2 - pts.y1
              const len = Math.sqrt(dx * dx + dy * dy)
              const nx = len > 0 ? -dy / len : 0
              const ny = len > 0 ? dx / len : 0
              const curveOffset = 15
              const cx = midX + nx * curveOffset
              const cy = midY + ny * curveOffset

              return (
                <g key={i} opacity={isDimmed ? 0.15 : 1} style={{ transition: 'opacity 0.2s' }}>
                  <path
                    d={`M ${pts.x1} ${pts.y1} Q ${cx} ${cy} ${pts.x2} ${pts.y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={rel.type === 'references' ? '6 3' : 'none'}
                    markerEnd={`url(#arrow-${rel.type})`}
                  />
                  {/* Label on the line */}
                  {isHighlighted && (
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      fill={color}
                      fontSize="10"
                      fontWeight="500"
                    >
                      {rel.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Entity nodes */}
            {ENTITIES.map((entity) => {
              const pos = ENTITY_POSITIONS[entity.id]
              if (!pos) return null

              const isActive = activeEntity === entity.id
              const isConnected = activeEntity ? getConnectedEntityIds(activeEntity).has(entity.id) : false
              const isDimmed = activeEntity ? (!isActive && !isConnected) : false
              // Determine border color based on storage
              const borderColorMap: Record<string, string> = {
                convex: '#3b82f6',
                localStorage: '#f59e0b',
                memory: '#a855f7',
                generated: '#10b981',
              }
              const borderColor = borderColorMap[entity.storage] || '#6b7280'

              return (
                <g
                  key={entity.id}
                  className="entity-node"
                  style={{
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.2 : 1,
                    transition: 'opacity 0.2s',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEntity(prev => prev === entity.id ? null : entity.id)
                  }}
                  onMouseEnter={() => setHoveredEntity(entity.id)}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Node background */}
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={ENTITY_WIDTH}
                    height={ENTITY_HEIGHT}
                    rx={8}
                    fill="var(--card)"
                    stroke={isActive ? borderColor : 'var(--border)'}
                    strokeWidth={isActive ? 2.5 : 1}
                  />
                  {/* Storage indicator stripe */}
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={5}
                    height={ENTITY_HEIGHT}
                    rx={8}
                    fill={borderColor}
                    clipPath={`inset(0 round 8px 0 0 8px)`}
                  />
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={5}
                    height={ENTITY_HEIGHT}
                    fill={borderColor}
                  />
                  <rect
                    x={pos.x}
                    y={pos.y}
                    width={8}
                    height={ENTITY_HEIGHT}
                    rx={8}
                    fill={borderColor}
                    style={{ clipPath: 'inset(0 3px 0 0)' }}
                  />

                  {/* Entity name */}
                  <text
                    x={pos.x + 16}
                    y={pos.y + 22}
                    fill="var(--card-foreground)"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="system-ui, sans-serif"
                  >
                    {entity.name}
                  </text>
                  {/* Storage label */}
                  <text
                    x={pos.x + 16}
                    y={pos.y + 40}
                    fill="var(--muted-foreground)"
                    fontSize="10"
                    fontFamily="system-ui, sans-serif"
                  >
                    {entity.storage === 'convex' ? 'Convex DB' : entity.storage === 'localStorage' ? 'LocalStorage' : entity.storage === 'memory' ? 'Memory' : 'Generated'}
                  </text>
                  {/* Page count badge */}
                  <text
                    x={pos.x + ENTITY_WIDTH - 12}
                    y={pos.y + 22}
                    fill="var(--muted-foreground)"
                    fontSize="10"
                    fontFamily="system-ui, sans-serif"
                    textAnchor="end"
                  >
                    {entity.pages.length} {entity.pages.length === 1 ? 'page' : 'pages'}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Detail panel */}
        <div className="w-80 shrink-0 overflow-y-auto hidden lg:block">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{selected.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${STORAGE_COLORS[selected.storage].bg} ${STORAGE_COLORS[selected.storage].text} ${STORAGE_COLORS[selected.storage].border}`}
                  >
                    {selected.storage === 'convex' ? 'Convex DB' : selected.storage === 'localStorage' ? 'LocalStorage' : selected.storage === 'memory' ? 'Memory' : 'Generated'}
                  </Badge>
                </div>
                <CardDescription>{selected.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fields */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Fields</h3>
                  <div className="space-y-1">
                    {selected.fields.map((field) => (
                      <div key={field.name} className="flex items-baseline gap-2 text-xs font-mono">
                        <span className="text-foreground">{field.name}</span>
                        {field.optional && <span className="text-muted-foreground">?</span>}
                        <span className="text-muted-foreground">: {field.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relationships */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Relationships</h3>
                  <div className="space-y-1.5">
                    {getConnectedRelationships(selected.id).map((rel, i) => {
                      const isFrom = rel.from === selected.id
                      const otherId = isFrom ? rel.to : rel.from
                      const other = ENTITIES.find(e => e.id === otherId)
                      return (
                        <div key={i} className="text-xs flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: RELATIONSHIP_COLORS[rel.type] }}
                          />
                          {isFrom ? (
                            <span>
                              <span className="text-muted-foreground">{rel.label}</span>{' '}
                              <button
                                className="text-foreground font-medium hover:underline"
                                onClick={() => setSelectedEntity(otherId)}
                              >
                                {other?.name}
                              </button>
                            </span>
                          ) : (
                            <span>
                              <button
                                className="text-foreground font-medium hover:underline"
                                onClick={() => setSelectedEntity(otherId)}
                              >
                                {other?.name}
                              </button>{' '}
                              <span className="text-muted-foreground">{rel.label} this</span>
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {getConnectedRelationships(selected.id).length === 0 && (
                      <span className="text-xs text-muted-foreground">No relationships</span>
                    )}
                  </div>
                </div>

                {/* Page Usage */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Used On Pages</h3>
                  <div className="space-y-2">
                    {selected.pages.map((page, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {page.name}
                          </Badge>
                          <span className="text-muted-foreground font-mono">{page.path}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 ml-0.5">{page.usage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select an Entity</CardTitle>
                <CardDescription>
                  Click on any entity in the diagram to see its fields, relationships, and page usage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium mb-1.5">All Entities</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {ENTITIES.map(e => (
                        <button
                          key={e.id}
                          className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors"
                          onClick={() => setSelectedEntity(e.id)}
                        >
                          {e.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1.5">Pages</h3>
                    <div className="space-y-1">
                      {[
                        { name: 'Whiteboard', path: '/' },
                        { name: 'Teams', path: '/teams' },
                        { name: 'Team Edit', path: '/teams/[id]' },
                        { name: 'GameTime', path: '/gametime' },
                        { name: 'Settings', path: '/settings' },
                      ].map((page) => {
                        const usedEntities = ENTITIES.filter(e =>
                          e.pages.some(p => p.name === page.name)
                        )
                        return (
                          <div key={page.path} className="text-xs">
                            <span className="font-medium">{page.name}</span>
                            <span className="text-muted-foreground ml-1">({page.path})</span>
                            <span className="text-muted-foreground"> — {usedEntities.length} entities</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile detail panel (below diagram) */}
      {selected && (
        <div className="lg:hidden">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${STORAGE_COLORS[selected.storage].bg} ${STORAGE_COLORS[selected.storage].text} ${STORAGE_COLORS[selected.storage].border}`}
                  >
                    {selected.storage === 'convex' ? 'Convex DB' : selected.storage === 'localStorage' ? 'LocalStorage' : selected.storage === 'memory' ? 'Memory' : 'Generated'}
                  </Badge>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedEntity(null)}
                >
                  Close
                </button>
              </div>
              <CardDescription className="text-xs">{selected.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Fields */}
                <div>
                  <h3 className="text-sm font-medium mb-1.5">Fields</h3>
                  <div className="space-y-0.5">
                    {selected.fields.map((field) => (
                      <div key={field.name} className="flex items-baseline gap-1 text-xs font-mono">
                        <span>{field.name}</span>
                        {field.optional && <span className="text-muted-foreground">?</span>}
                        <span className="text-muted-foreground">: {field.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Relationships */}
                <div>
                  <h3 className="text-sm font-medium mb-1.5">Relationships</h3>
                  <div className="space-y-1">
                    {getConnectedRelationships(selected.id).map((rel, i) => {
                      const isFrom = rel.from === selected.id
                      const otherId = isFrom ? rel.to : rel.from
                      const other = ENTITIES.find(e => e.id === otherId)
                      return (
                        <div key={i} className="text-xs">
                          {isFrom ? `${rel.label} → ${other?.name}` : `${other?.name} → ${rel.label} this`}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Pages */}
                <div>
                  <h3 className="text-sm font-medium mb-1.5">Pages</h3>
                  <div className="space-y-1">
                    {selected.pages.map((page, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{page.name}</span>
                        <span className="text-muted-foreground"> — {page.usage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

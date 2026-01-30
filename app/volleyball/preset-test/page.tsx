'use client'

import { useState, useRef } from 'react'
import { Position, Role, PlayerStatus, PLAYER_STATUS_INFO } from '@/lib/types'
import { rotation1NoLibero } from '@/lib/rotation-presets/5-1/rotation1-no-libero'
import { rotation1, rotation2, rotation3 } from '@/lib/rotation-presets/5-1/extracted-rotations-1-3'
import { rotation4, rotation5, rotation6 } from '@/lib/rotation-presets/5-1/extracted-rotations-4-6'
import { PresetPhase, PhasePreset, RotationPreset } from '@/lib/rotation-presets/schema'

// All rotations mapping
const ROTATIONS: Record<number, RotationPreset> = {
  1: rotation1,
  2: rotation2,
  3: rotation3,
  4: rotation4,
  5: rotation5,
  6: rotation6,
}

// Original manually-created rotation 1 for comparison
const ORIGINAL_ROTATION_1 = rotation1NoLibero

// Types for Gemini analysis response
interface GeminiAnalysis {
  success: boolean
  mode?: 'quick' | 'phased'
  positions?: Record<string, { x: number; y: number }>
  arrows?: Record<string, { x: number; y: number } | null>
  description?: string
  rawResponse?: string
  log?: string[]
  error?: string
}

/**
 * Test page for comparing preset positions against PDF diagrams
 *
 * This renders a court with positions from the preset data
 * so we can visually compare against the PDF reference.
 */

// Court dimensions for rendering
const COURT_WIDTH = 400
const COURT_HEIGHT = 500

// Player token colors
const ROLE_COLORS: Record<string, string> = {
  S: '#a855f7',    // Purple
  OH1: '#3b82f6',  // Blue
  OH2: '#eab308',  // Yellow
  MB1: '#f97316',  // Orange
  MB2: '#14b8a6',  // Teal
  RS: '#ec4899',   // Pink (OPP)
  L: '#22c55e',    // Green
}

// Map preset phase to display name
const PHASE_NAMES: Record<PresetPhase, string> = {
  home: 'Home (Legal Start)',
  serve: 'Serve (Your Team)',
  serveReceivePrimary: 'Serve Receive Primary',
  serveReceiveAlternate: 'Serve Receive Alternate',
  base: 'Base (Defense)',
}

// All phases in order
const PHASES: PresetPhase[] = ['home', 'serve', 'serveReceivePrimary', 'serveReceiveAlternate', 'base']

function PlayerToken({
  role,
  position,
  tag,
}: {
  role: string
  position: Position
  tag?: PlayerStatus
}) {
  // Convert normalized coordinates to pixel positions
  // y: 0.5 = net (top of court area), 1.0 = baseline (bottom)
  const courtTop = 60  // Leave room for NET label
  const courtBottom = COURT_HEIGHT - 20
  const courtLeft = 20
  const courtRight = COURT_WIDTH - 20

  // Map x: [0, 1] to [courtLeft, courtRight]
  const pixelX = courtLeft + position.x * (courtRight - courtLeft)

  // Map y: [0.5, 1.0] to [courtTop, courtBottom]
  const clampedY = Math.max(0.5, Math.min(1.0, position.y))
  const normalizedY = (clampedY - 0.5) / 0.5
  const pixelY = courtTop + normalizedY * (courtBottom - courtTop)

  const tagInfo = tag ? PLAYER_STATUS_INFO[tag] : null

  return (
    <g>
      <circle
        cx={pixelX}
        cy={pixelY}
        r={28}
        fill={ROLE_COLORS[role] || '#888'}
        stroke="white"
        strokeWidth={2}
      />
      <text
        x={pixelX}
        y={pixelY + 5}
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
      >
        {role}
      </text>
      {/* Status tag badge */}
      {tagInfo && (
        <>
          <rect
            x={pixelX - 20}
            y={pixelY + 18}
            width={40}
            height={14}
            rx={3}
            fill={tagInfo.color}
          />
          <text
            x={pixelX}
            y={pixelY + 28}
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="bold"
          >
            {tagInfo.label}
          </text>
        </>
      )}
    </g>
  )
}

function Arrow({ from, to }: { from: Position; to: Position }) {
  const courtTop = 60
  const courtBottom = COURT_HEIGHT - 20
  const courtLeft = 20
  const courtRight = COURT_WIDTH - 20

  const fromX = courtLeft + from.x * (courtRight - courtLeft)
  const fromY = courtTop + ((Math.max(0.5, Math.min(1.0, from.y)) - 0.5) / 0.5) * (courtBottom - courtTop)
  const toX = courtLeft + to.x * (courtRight - courtLeft)
  const toY = courtTop + ((Math.max(0.5, Math.min(1.0, to.y)) - 0.5) / 0.5) * (courtBottom - courtTop)

  // Calculate angle for arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const arrowLength = 10
  const arrowAngle = Math.PI / 6

  // Shorten the line slightly so it doesn't overlap with target
  const shortenBy = 30
  const dx = toX - fromX
  const dy = toY - fromY
  const length = Math.sqrt(dx * dx + dy * dy)
  const endX = fromX + (dx * (length - shortenBy)) / length
  const endY = fromY + (dy * (length - shortenBy)) / length

  return (
    <g>
      <line
        x1={fromX}
        y1={fromY}
        x2={endX}
        y2={endY}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={2}
        strokeDasharray="6,3"
      />
      {/* Arrowhead */}
      <polygon
        points={`
          ${endX},${endY}
          ${endX - arrowLength * Math.cos(angle - arrowAngle)},${endY - arrowLength * Math.sin(angle - arrowAngle)}
          ${endX - arrowLength * Math.cos(angle + arrowAngle)},${endY - arrowLength * Math.sin(angle + arrowAngle)}
        `}
        fill="rgba(255,255,255,0.8)"
      />
    </g>
  )
}

function Court({
  phase,
  preset,
  showZones,
  showArrows,
}: {
  phase: PresetPhase
  preset: PhasePreset
  showZones: boolean
  showArrows: boolean
}) {
  const positions = preset.positions
  const arrows = preset.arrows || {}
  const statusTags = preset.statusTags || {}

  // Get all roles from positions
  const roles = Object.keys(positions) as string[]

  return (
    <svg width={COURT_WIDTH} height={COURT_HEIGHT}>
      {/* Court background */}
      <rect
        x={20}
        y={60}
        width={COURT_WIDTH - 40}
        height={COURT_HEIGHT - 80}
        fill="#1e3a5f"
        stroke="#64748b"
        strokeWidth={2}
      />

      {/* NET label */}
      <text
        x={COURT_WIDTH / 2}
        y={50}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="14"
      >
        NET
      </text>

      {/* Net line */}
      <line
        x1={20}
        y1={60}
        x2={COURT_WIDTH - 20}
        y2={60}
        stroke="#fff"
        strokeWidth={3}
      />

      {/* 10ft line */}
      <line
        x1={20}
        y1={180}
        x2={COURT_WIDTH - 20}
        y2={180}
        stroke="#64748b"
        strokeWidth={1}
        strokeDasharray="8,4"
      />
      <text
        x={COURT_WIDTH - 25}
        y={175}
        textAnchor="end"
        fill="#64748b"
        fontSize="10"
      >
        10ft line
      </text>

      {/* Zone numbers */}
      {showZones && (
        <>
          <text x={80} y={120} fill="#475569" fontSize="24" textAnchor="middle">4</text>
          <text x={200} y={120} fill="#475569" fontSize="24" textAnchor="middle">3</text>
          <text x={320} y={120} fill="#475569" fontSize="24" textAnchor="middle">2</text>
          <text x={80} y={350} fill="#475569" fontSize="24" textAnchor="middle">5</text>
          <text x={200} y={350} fill="#475569" fontSize="24" textAnchor="middle">6</text>
          <text x={320} y={350} fill="#475569" fontSize="24" textAnchor="middle">1</text>
        </>
      )}

      {/* Vertical zone lines */}
      <line x1={140} y1={60} x2={140} y2={COURT_HEIGHT - 20} stroke="#334155" strokeWidth={1} />
      <line x1={260} y1={60} x2={260} y2={COURT_HEIGHT - 20} stroke="#334155" strokeWidth={1} />

      {/* Horizontal zone line */}
      <line x1={20} y1={260} x2={COURT_WIDTH - 20} y2={260} stroke="#334155" strokeWidth={1} />

      {/* Arrows (rendered behind players) */}
      {showArrows && roles.map((role) => {
        const arrowDest = arrows[role as keyof typeof arrows]
        if (!arrowDest) return null
        const from = positions[role as keyof typeof positions]
        if (!from) return null
        return <Arrow key={`arrow-${role}`} from={from} to={arrowDest} />
      })}

      {/* Player tokens */}
      {roles.map((role) => {
        const pos = positions[role as keyof typeof positions]
        if (!pos) return null
        const tag = statusTags[role as keyof typeof statusTags]
        return (
          <PlayerToken
            key={role}
            role={role}
            position={pos}
            tag={tag}
          />
        )
      })}
    </svg>
  )
}

// PDF page numbers for each phase (for reference link)
const PHASE_PDF_PAGES: Record<PresetPhase, number> = {
  home: 3,
  serve: 3,
  serveReceivePrimary: 3,
  serveReceiveAlternate: 3,
  base: 3,
}

export default function PresetTestPage() {
  const [currentRotation, setCurrentRotation] = useState(1)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [showZones, setShowZones] = useState(true)
  const [showArrows, setShowArrows] = useState(true)
  const [showPdf, setShowPdf] = useState(true)
  const [useOriginal, setUseOriginal] = useState(false)

  // Gemini analyzer state
  const [analyzing, setAnalyzing] = useState(false)
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysis | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showGeminiCourt, setShowGeminiCourt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentPhase = PHASES[currentPhaseIndex]
  const selectedRotation = useOriginal && currentRotation === 1
    ? ORIGINAL_ROTATION_1
    : ROTATIONS[currentRotation]
  const currentPreset = selectedRotation[currentPhase]
  const pdfPage = currentRotation <= 3 ? 3 : 4

  const nextPhase = () => {
    setCurrentPhaseIndex((prev) => (prev + 1) % PHASES.length)
  }

  const prevPhase = () => {
    setCurrentPhaseIndex((prev) => (prev - 1 + PHASES.length) % PHASES.length)
  }

  // Handle file upload for Gemini analysis
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    loadImageFile(file)
  }

  // Load image file into state
  const loadImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setUploadedImage(dataUrl)
      setGeminiResult(null) // Clear previous result
    }
    reader.readAsDataURL(file)
  }

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          loadImageFile(file)
          break
        }
      }
    }
  }

  // Analyze uploaded image with Gemini
  const analyzeWithGemini = async () => {
    if (!uploadedImage) return

    setAnalyzing(true)
    setGeminiResult(null)

    try {
      // Extract base64 data from data URL
      const base64Match = uploadedImage.match(/^data:(.+);base64,(.+)$/)
      if (!base64Match) {
        throw new Error('Invalid image data')
      }

      const mimeType = base64Match[1]
      const imageBase64 = base64Match[2]

      const response = await fetch('/api/analyze-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          phase: PHASE_NAMES[currentPhase],
        }),
      })

      const result = await response.json()
      setGeminiResult(result)
    } catch (error) {
      setGeminiResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-2xl font-bold text-white mb-4">
        5-1 Rotation {currentRotation} - No Libero
        {useOriginal && currentRotation === 1 && ' (Original)'}
      </h1>

      {/* Rotation selector */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-slate-400 text-sm">Rotation:</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((rot) => (
            <button
              key={rot}
              onClick={() => setCurrentRotation(rot)}
              className={`w-10 h-10 rounded font-bold ${
                currentRotation === rot
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {rot}
            </button>
          ))}
        </div>
        {currentRotation === 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-300 ml-4">
            <input
              type="checkbox"
              checked={useOriginal}
              onChange={(e) => setUseOriginal(e.target.checked)}
              className="rounded"
            />
            Use original (manually created)
          </label>
        )}
      </div>

      <p className="text-slate-500 text-sm mb-4">
        Source: 5-1 Volleyball Rotation Guidelines and Formation.pdf, page {pdfPage}
      </p>
      <label className="flex items-center gap-2 text-sm text-slate-300 mb-6">
        <input
          type="checkbox"
          checked={showPdf}
          onChange={(e) => setShowPdf(e.target.checked)}
          className="rounded"
        />
        Show PDF reference (scroll to page {pdfPage} for Rotation {currentRotation} diagrams)
      </label>

      {/* Phase navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={prevPhase}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
        >
          &larr; Prev
        </button>
        <div className="text-lg font-semibold text-white min-w-[280px] text-center">
          {PHASE_NAMES[currentPhase]}
        </div>
        <button
          onClick={nextPhase}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
        >
          Next &rarr;
        </button>
      </div>

      {/* Phase indicators */}
      <div className="flex gap-2 mb-6">
        {PHASES.map((phase, idx) => (
          <button
            key={phase}
            onClick={() => setCurrentPhaseIndex(idx)}
            className={`px-3 py-1 text-sm rounded ${
              idx === currentPhaseIndex
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Court with preset positions */}
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs mb-2 text-center">Current Preset</p>
          <Court
            phase={currentPhase}
            preset={currentPreset}
            showZones={showZones}
            showArrows={showArrows}
          />
        </div>

        {/* Court with Gemini's interpretation */}
        {showGeminiCourt && geminiResult?.positions && (
          <div className="bg-slate-800 rounded-lg p-4 border-2 border-green-600">
            <p className="text-green-400 text-xs mb-2 text-center">Gemini's Analysis</p>
            <Court
              phase={currentPhase}
              preset={{
                positions: geminiResult.positions as any,
                arrows: geminiResult.arrows as any,
              }}
              showZones={showZones}
              showArrows={showArrows}
            />
          </div>
        )}

        {/* Position data and controls */}
        <div className="text-slate-300">
          <h3 className="font-bold mb-2">Position Coordinates:</h3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="text-slate-500">
                <th className="pr-4 text-left">Role</th>
                <th className="pr-4 text-left">X</th>
                <th className="pr-4 text-left">Y</th>
                <th className="text-left">Tag</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentPreset.positions)
                .map(([role, pos]) => (
                  <tr key={role}>
                    <td className="pr-4 font-mono">{role}</td>
                    <td className="pr-4 font-mono">{pos.x.toFixed(2)}</td>
                    <td className="pr-4 font-mono">{pos.y.toFixed(2)}</td>
                    <td className="font-mono text-xs">
                      {currentPreset.statusTags?.[role as keyof typeof currentPreset.statusTags] || '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Arrows data */}
          {currentPreset.arrows && Object.keys(currentPreset.arrows).length > 0 && (
            <>
              <h3 className="font-bold mb-2 mt-4">Arrows (→ destinations):</h3>
              <table className="text-sm mb-4">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pr-4 text-left">Role</th>
                    <th className="pr-4 text-left">To X</th>
                    <th className="text-left">To Y</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentPreset.arrows)
                    .filter(([, dest]) => dest !== null && dest !== undefined)
                    .map(([role, dest]) => (
                      <tr key={role}>
                        <td className="pr-4 font-mono">{role}</td>
                        <td className="pr-4 font-mono">{dest!.x.toFixed(2)}</td>
                        <td className="font-mono">{dest!.y.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {/* Display toggles */}
          <div className="mt-6 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showZones}
                onChange={(e) => setShowZones(e.target.checked)}
                className="rounded"
              />
              Show zone numbers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArrows}
                onChange={(e) => setShowArrows(e.target.checked)}
                className="rounded"
              />
              Show movement arrows
            </label>
          </div>

          {/* Legend */}
          <div className="mt-6 text-sm text-slate-500">
            <p className="font-bold text-slate-400 mb-2">Legend:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(ROLE_COLORS).map(([role, color]) => (
                <div key={role} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Diagram Analyzer */}
      <div className="mt-8 bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          🔍 Gemini Diagram Analyzer
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Upload a screenshot of a diagram from the PDF below. Gemini will analyze the spatial
          positions and return coordinates.
        </p>

        <div className="flex gap-4 items-start">
          {/* Upload/Paste area */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Paste target area */}
            <div
              onPaste={handlePaste}
              tabIndex={0}
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div>
                  <img
                    src={uploadedImage}
                    alt="Uploaded diagram"
                    className="max-w-[400px] max-h-[400px] mx-auto border border-slate-600 rounded"
                  />
                  <p className="text-slate-500 text-sm mt-2">Click or paste to replace</p>
                </div>
              ) : (
                <div className="text-slate-400">
                  <p className="text-lg mb-2">📋 Paste screenshot here</p>
                  <p className="text-sm text-slate-500">or click to upload a file</p>
                </div>
              )}
            </div>

            {uploadedImage && (
              <button
                onClick={analyzeWithGemini}
                disabled={analyzing}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? '⏳ Analyzing…' : '✨ Analyze with Gemini'}
              </button>
            )}
          </div>

          {/* Results area */}
          {geminiResult && (
            <div className="flex-1 bg-slate-900 rounded p-4">
              <h3 className="font-bold text-white mb-2">
                {geminiResult.success ? '✅ Analysis Result' : '❌ Error'}
              </h3>

              {geminiResult.error && (
                <p className="text-red-400 text-sm">{geminiResult.error}</p>
              )}

              {geminiResult.positions && (
                <button
                  onClick={() => setShowGeminiCourt(!showGeminiCourt)}
                  className={`mb-4 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    showGeminiCourt
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {showGeminiCourt ? '✓ Showing on Court' : '📍 Show on Court'}
                </button>
              )}

              {geminiResult.description && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm font-semibold">Description:</p>
                  <p className="text-slate-300 text-sm">{geminiResult.description}</p>
                </div>
              )}

              {geminiResult.positions && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm font-semibold mb-1">Positions (Gemini):</p>
                  <table className="text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pr-4 text-left">Role</th>
                        <th className="pr-4 text-left">X</th>
                        <th className="text-left">Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(geminiResult.positions).map(([role, pos]) => (
                        <tr key={role} className="text-slate-300">
                          <td className="pr-4 font-mono">{role}</td>
                          <td className="pr-4 font-mono">{pos.x.toFixed(2)}</td>
                          <td className="font-mono">{pos.y.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {geminiResult.arrows && Object.keys(geminiResult.arrows).length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm font-semibold mb-1">Arrows (→ destinations):</p>
                  <table className="text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pr-4 text-left">Role</th>
                        <th className="pr-4 text-left">To X</th>
                        <th className="text-left">To Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(geminiResult.arrows)
                        .filter(([, dest]) => dest !== null)
                        .map(([role, dest]) => (
                          <tr key={role} className="text-slate-300">
                            <td className="pr-4 font-mono">{role}</td>
                            <td className="pr-4 font-mono">{dest!.x.toFixed(2)}</td>
                            <td className="font-mono">{dest!.y.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Raw response toggle */}
              <details className="mt-4">
                <summary className="text-slate-500 text-xs cursor-pointer hover:text-slate-400">
                  Show raw response
                </summary>
                <pre className="mt-2 text-xs text-slate-500 whitespace-pre-wrap overflow-auto max-h-[200px] bg-slate-950 p-2 rounded">
                  {geminiResult.rawResponse}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* PDF Reference */}
      {showPdf && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white mb-4">
            PDF Reference - Scroll to Page 3 for Rotation 1 (with arrows)
          </h2>
          <div className="bg-slate-800 rounded-lg overflow-hidden" style={{ height: '800px' }}>
            <iframe
              src={`/preset-reference/5-1-rotation-guide.pdf#page=${pdfPage}`}
              className="w-full h-full"
              title="5-1 Rotation Guide PDF"
            />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { getWhiteboardPositions } from '@/lib/whiteboard'
import { DEFAULT_BASE_ORDER } from '@/lib/rotations'
import {
  PositionCoordinates,
  RallyPhase,
  Role,
  Rotation,
  RALLY_PHASE_INFO,
  ROLE_INFO,
} from '@/lib/types'

const canvasPhase: RallyPhase = 'ATTACK_PHASE'
const canvasRotation: Rotation = 1
const featuredPhases: RallyPhase[] = ['PRE_SERVE', 'SERVE_RECEIVE', 'ATTACK_PHASE', 'DEFENSE_PHASE']
const phaseEntryLines = featuredPhases.map(
  (phase) => `${RALLY_PHASE_INFO[phase].name} — ${RALLY_PHASE_INFO[phase].description}`
)

const moduleData: Array<{ title: string; descriptionLines: string[] }> = [
  {
    title: 'Single page focus',
    descriptionLines: [
      'Everything sits inside one scroll so a coach never has to hunt through tabs.',
      'Cards wrap from wide layouts down to a single column for phones and tablets.',
    ],
  },
  {
    title: 'Context anchors',
    descriptionLines: [
      'Each block leads with a clear reason why it is here—setup, story, reminder.',
      'No hidden controls; the language describes what the coach should do next.',
    ],
  },
  {
    title: 'Prompted reflection',
    descriptionLines: [
      'Short sentences keep the narrative crisp and visible at all times.',
      'Keep expanding notes from these cards but start with plain words.',
    ],
  },
  {
    title: 'Visible phases',
    descriptionLines: phaseEntryLines,
  },
]

const clampNormalized = (value: number) => Math.min(1, Math.max(0, value))

type SimpleWhiteboardProps = {
  positions: PositionCoordinates
  phase: RallyPhase
}

const SimpleWhiteboard = ({ positions, phase }: SimpleWhiteboardProps) => {
  const tokens = useMemo(() => {
    return (Object.entries(positions) as Array<[Role, { x: number; y: number } | undefined]>).reduce<
      Array<{ role: Role; cx: number; cy: number; color: string }>
    >((acc, [role, point]) => {
      if (!point) return acc
      acc.push({
        role,
        cx: clampNormalized(point.x) * 100,
        cy: clampNormalized(point.y) * 60,
        color: ROLE_INFO[role].color,
      })
      return acc
    }, [])
  }, [positions])

  return (
    <figure className="m-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner">
        <svg
          viewBox="0 0 100 60"
          role="img"
          aria-label="Minimal volleyball court with seven tokens"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x="2" y="2" width="96" height="56" rx="4" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />
          <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(148,163,184,0.2)" strokeWidth="0.5" />
          <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(248,250,252,0.12)" strokeWidth="0.8" />
          <line x1="0" y1="2" x2="0" y2="58" stroke="rgba(148,163,184,0.1)" strokeWidth="0.6" />
          <line x1="100" y1="2" x2="100" y2="58" stroke="rgba(148,163,184,0.1)" strokeWidth="0.6" />
          {tokens.map(({ role, cx, cy, color }) => (
            <g key={role}>
              <circle cx={cx} cy={cy} r="3.6" fill={color} stroke="rgba(15,23,42,0.8)" strokeWidth="0.8" />
              <text
                x={cx}
                y={cy + 7}
                textAnchor="middle"
                fontSize="5"
                fontWeight="600"
                fill="#f8fafc"
                className="pointer-events-none"
              >
                {role}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-500">
        Phase: <span className="font-semibold text-white">{RALLY_PHASE_INFO[phase].name}</span>
      </figcaption>
    </figure>
  )
}

export default function MinimalSinglePage() {
  const positions = useMemo(() => {
    const layout = getWhiteboardPositions({
      rotation: canvasRotation,
      phase: canvasPhase,
      isReceiving: true,
      showLibero: true,
      baseOrder: DEFAULT_BASE_ORDER,
    })
    return layout.home
  }, [])

  return (
    <main className="bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-5 py-10 md:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Minimal single page</p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">A stripped-back view of Volley Studio</h1>
          <p className="max-w-3xl text-base text-slate-300">
            This landing pad keeps every thought and action on one scroll. The cards below explain the intent, and the whiteboard sits in the only place a coach really needs to look.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moduleData.map((module) => (
            <article
              key={module.title}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/40"
            >
              <h3 className="text-lg font-semibold text-white">{module.title}</h3>
              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
                {module.descriptionLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Whiteboard canvas</p>
              <h2 className="text-2xl font-semibold text-white">Rotation snapshot</h2>
            </div>
            <p className="text-sm text-slate-400">Attack Phase · Rotation {canvasRotation}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40">
            <SimpleWhiteboard positions={positions} phase={canvasPhase} />
          </div>
        </section>
      </div>
    </main>
  )
}

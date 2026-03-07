'use client'

import { motion, useReducedMotion } from 'motion/react'
import { type CorePhase, formatCorePhaseLabel } from '@/lib/rebuild/prototypeFlow'
import { cn } from '@/lib/utils'
import { TactilePlayJoystick } from './TactilePlayJoystick'
import { TactileRotationSwitch } from './TactileRotationSwitch'
import type { PrototypeControlProps } from './types'

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each state is ms after interaction.
 *
 *    0ms   compact control bank mounts with no extra chrome
 *  120ms   phase emphasis and connector strokes settle
 *  180ms   active control finishes tactile press travel
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  emphasisSettle: 0.14, // phase cards and connectors settle after state changes
}

const C4_LAYOUT = {
  mobileGap: '6px',
  controlPadding: '8px',
}

const LITERAL_STAGE = {
  width: 300,
  height: 144,
  topCardY: 10,
  bottomCardY: 92,
  cardWidth: 102,
  cardHeight: 42,
}

function getPhaseLabel(phase: CorePhase): string {
  if (phase === 'OFFENSE') return 'Attack'
  return formatCorePhaseLabel(phase)
}

function isFoundational(phase: CorePhase): boolean {
  return phase === 'SERVE' || phase === 'RECEIVE'
}

function getPhaseTone(phase: CorePhase): { base: string; active: string } {
  if (isFoundational(phase)) {
    return {
      base: 'oklch(78% 0.08 72)',
      active: 'oklch(80% 0.11 72)',
    }
  }

  return {
    base: 'oklch(74% 0.03 255)',
    active: 'oklch(76% 0.05 255)',
  }
}

function getPhaseContrast(phase: CorePhase, currentPhase: CorePhase, props: PrototypeControlProps): number {
  const currentIsFoundational = isFoundational(currentPhase)
  const phaseIsFoundational = isFoundational(phase)
  const contrast = currentIsFoundational
    ? props.tactileTuning.phaseEmphasis.foundationalContrast
    : props.tactileTuning.phaseEmphasis.reactiveContrast

  return phaseIsFoundational === currentIsFoundational
    ? 1 + contrast * 0.2
    : 1 - contrast * 0.16
}

function PhaseCard({
  label,
  phase,
  compact = false,
  props,
}: {
  label: string
  phase: CorePhase
  compact?: boolean
  props: PrototypeControlProps
}) {
  const prefersReducedMotion = useReducedMotion()
  const isActive = props.currentCorePhase === phase
  const isNext = props.nextByPlay === phase
  const contrast = getPhaseContrast(phase, props.currentCorePhase, props)
  const phaseEmphasis = props.tactileTuning.phaseEmphasis
  const tone = getPhaseTone(phase)

  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: props.switchMotion.spring.stiffness,
        damping: props.switchMotion.spring.damping,
        mass: props.switchMotion.spring.mass,
      }

  return (
    <motion.button
      type="button"
      aria-pressed={isActive}
      onClick={() => props.onPhaseSelect(phase)}
      animate={{
        y: isActive ? props.switchMotion.pressTravel * 0.72 : 0,
        scale: isActive ? 1.01 : 1,
      }}
      transition={transition}
      className={cn(
        'lab-raised lab-texture relative flex items-center justify-center overflow-hidden rounded-[18px] border text-center font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        compact ? 'min-h-[2.625rem] px-3 text-[1rem]' : 'min-h-14 px-4 text-lg',
        isActive ? 'lab-pressed border-border/85' : 'border-border/60'
      )}
      style={{
        opacity: isActive ? 1 : 0.9 + contrast * 0.04,
        background: isActive
          ? `color-mix(in oklch, var(--card) 58%, ${tone.active} 42%)`
          : `color-mix(in oklch, var(--card) 82%, ${tone.base} 18%)`,
        borderColor: isActive
          ? `color-mix(in oklch, var(--border) 32%, ${tone.active} 68%)`
          : `color-mix(in oklch, var(--border) 78%, ${tone.base} 22%)`,
        transitionDuration: `${TIMING.emphasisSettle}s`,
      }}
    >
      {isNext ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow: `0 0 ${10 + phaseEmphasis.nextGlow * 18}px oklch(72% 0.14 55 / ${phaseEmphasis.nextGlow * 0.22})`,
          }}
        />
      ) : null}
      <span>{label}</span>
    </motion.button>
  )
}

function ConnectorLine({
  active,
  x1,
  x2,
  y1,
  y2,
  dashed = false,
  vertical = false,
  props,
}: {
  active: boolean
  x1: number
  x2: number
  y1: number
  y2: number
  dashed?: boolean
  vertical?: boolean
  props: PrototypeControlProps
}) {
  const connectors = props.tactileTuning.connectors

  return (
    <line
      x1={x1}
      x2={x2}
      y1={y1}
      y2={y2}
      stroke="var(--primary)"
      strokeDasharray={dashed ? '3 2' : undefined}
      strokeLinecap="round"
      strokeOpacity={active ? connectors.activeOpacity : connectors.idleOpacity}
      strokeWidth={active ? connectors.activeThickness : 1.2}
      transform={vertical ? 'translate(0 0)' : undefined}
    />
  )
}

function LiteralMode(props: PrototypeControlProps) {
  const isServeLink = props.currentCorePhase === 'SERVE'
  const isReceiveLink = props.currentCorePhase === 'RECEIVE'
  const isLiveLoop = props.currentCorePhase === 'OFFENSE' || props.currentCorePhase === 'DEFENSE'

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-[300px] aspect-[300/144]">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${LITERAL_STAGE.width} ${LITERAL_STAGE.height}`}
        >
          <ConnectorLine
            active={isServeLink}
            x1={LITERAL_STAGE.cardWidth}
            x2={LITERAL_STAGE.width - LITERAL_STAGE.cardWidth}
            y1={LITERAL_STAGE.topCardY + LITERAL_STAGE.cardHeight / 2}
            y2={LITERAL_STAGE.topCardY + LITERAL_STAGE.cardHeight / 2}
            props={props}
          />
          <ConnectorLine
            active={isReceiveLink}
            x1={LITERAL_STAGE.cardWidth}
            x2={LITERAL_STAGE.width - LITERAL_STAGE.cardWidth}
            y1={LITERAL_STAGE.bottomCardY + LITERAL_STAGE.cardHeight / 2}
            y2={LITERAL_STAGE.bottomCardY + LITERAL_STAGE.cardHeight / 2}
            dashed
            props={props}
          />
          <ConnectorLine
            active={isLiveLoop}
            x1={LITERAL_STAGE.width - 55}
            x2={LITERAL_STAGE.width - 55}
            y1={LITERAL_STAGE.topCardY + LITERAL_STAGE.cardHeight / 2 + 12}
            y2={LITERAL_STAGE.bottomCardY + LITERAL_STAGE.cardHeight / 2 - 12}
            props={props}
            vertical
          />
        </svg>

        <div className="absolute left-0 top-[10px] w-[102px]">
          <PhaseCard label="Serve" phase="SERVE" compact props={props} />
        </div>

        <div className="absolute right-0 top-[10px] w-[102px]">
          <PhaseCard label="Defense" phase="DEFENSE" compact props={props} />
        </div>

        <div className="absolute left-0 top-[92px] w-[102px]">
          <PhaseCard label="Receive" phase="RECEIVE" compact props={props} />
        </div>

        <div className="absolute right-0 top-[92px] w-[102px]">
          <PhaseCard label="Attack" phase="OFFENSE" compact props={props} />
        </div>

        <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
          <TactilePlayJoystick
            currentPhase={props.currentCorePhase}
            nextPhase={props.nextByPlay}
            nextLabel={getPhaseLabel(props.nextByPlay)}
            mode="literal"
            switchMotion={props.switchMotion}
            joystickTuning={props.tactileTuning.joystick}
            phaseEmphasis={props.tactileTuning.phaseEmphasis}
            onPlay={props.onPlay}
            onPhaseSelect={props.onPhaseSelect}
          />
        </div>
      </div>
    </div>
  )
}

export function Concept4ReferenceLayout(props: PrototypeControlProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{
        gap: C4_LAYOUT.mobileGap,
      }}
    >
      <TactileRotationSwitch
        className="w-full"
        density="compact"
        value={props.currentRotation}
        onValueChange={props.onRotationSelect}
        switchMotion={props.switchMotion}
      />

      <div
        className="lab-inset relative min-h-0 flex-1 overflow-hidden rounded-[22px]"
        style={{
          padding: C4_LAYOUT.controlPadding,
        }}
      >
        <LiteralMode {...props} />
      </div>
    </div>
  )
}

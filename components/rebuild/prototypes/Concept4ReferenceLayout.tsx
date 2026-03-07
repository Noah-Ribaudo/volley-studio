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
 *    0ms   dock content mounts in compact mobile footprint
 *   90ms   mode toggle shifts between radial and literal
 *  140ms   phase emphasis and connector strokes settle
 *  180ms   active control finishes tactile press travel
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  modeSwap: 0.09, // mode toggle moves between radial and literal
  emphasisSettle: 0.14, // phase cards and connectors settle after state changes
}

const C4_LAYOUT = {
  mobileGap: 'var(--lab-dock-gap)',
  controlPadding: 'var(--lab-dock-inner-padding)',
}

function getPhaseLabel(phase: CorePhase): string {
  if (phase === 'OFFENSE') return 'Attack'
  return formatCorePhaseLabel(phase)
}

function isFoundational(phase: CorePhase): boolean {
  return phase === 'SERVE' || phase === 'RECEIVE'
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
        y: isActive ? props.switchMotion.pressTravel : 0,
        scale: isActive ? phaseEmphasis.currentWeight : 1,
      }}
      transition={transition}
      className={cn(
        'lab-pressable lab-texture relative flex items-center justify-center rounded-2xl border text-center font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        compact ? 'min-h-12 px-3 text-base' : 'min-h-14 px-4 text-lg',
        isActive ? 'lab-pressed border-border/85' : 'border-border/60'
      )}
      style={{
        opacity: isActive ? 1 : 0.84 + contrast * 0.08,
        background: `oklch(72% 0.14 55 / ${isActive ? 0.16 + contrast * 0.1 : 0.04 + contrast * 0.03})`,
        boxShadow: isNext
          ? `0 0 ${10 + phaseEmphasis.nextGlow * 18}px oklch(72% 0.14 55 / ${phaseEmphasis.nextGlow * 0.24})`
          : undefined,
        transitionDuration: `${TIMING.emphasisSettle}s`,
      }}
    >
      {isActive ? <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-foreground/85" /> : null}
      <span>{label}</span>
    </motion.button>
  )
}

function ModeToggle({
  value,
  onValueChange,
  props,
}: {
  value: PrototypeControlProps['concept4Mode']
  onValueChange: PrototypeControlProps['onConcept4ModeChange']
  props: PrototypeControlProps
}) {
  const prefersReducedMotion = useReducedMotion()
  const transition = prefersReducedMotion
    ? { duration: 0.001 }
    : {
        type: 'spring' as const,
        stiffness: props.switchMotion.spring.stiffness,
        damping: props.switchMotion.spring.damping,
        mass: props.switchMotion.spring.mass,
      }

  return (
    <div className="lab-inset flex rounded-xl p-1">
      {(['radial', 'literal'] as const).map((mode) => {
        const isActive = value === mode
        return (
          <motion.button
            key={mode}
            type="button"
            animate={{
              y: isActive ? props.switchMotion.pressTravel * 0.8 : 0,
              scale: isActive ? 0.985 : 1,
            }}
            transition={transition}
            className={cn(
              'lab-pressable min-w-[3.7rem] rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/90',
              isActive ? 'lab-pressed border-border/80' : 'border-border/50'
            )}
            style={{ transitionDuration: `${TIMING.modeSwap}s` }}
            onClick={() => onValueChange(mode)}
          >
            {mode}
          </motion.button>
        )
      })}
    </div>
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

function RadialMode(props: PrototypeControlProps) {
  const connectors = props.tactileTuning.connectors

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-hidden">
      <div className="relative flex w-full max-w-[240px] items-center justify-center">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 240 240"
        >
          <path
            d="M48 80 C82 32, 158 32, 192 80"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={props.currentCorePhase === 'SERVE' ? connectors.activeOpacity : connectors.idleOpacity}
            strokeWidth={props.currentCorePhase === 'SERVE' ? connectors.activeThickness : 1.2}
            strokeLinecap="round"
          />
          <path
            d="M48 160 C82 208, 158 208, 192 160"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={props.currentCorePhase === 'RECEIVE' ? connectors.activeOpacity : connectors.idleOpacity}
            strokeWidth={props.currentCorePhase === 'RECEIVE' ? connectors.activeThickness : 1.2}
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
          <path
            d="M192 88 C210 110, 210 130, 192 152"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={
              props.currentCorePhase === 'OFFENSE' || props.currentCorePhase === 'DEFENSE'
                ? connectors.activeOpacity
                : connectors.idleOpacity
            }
            strokeWidth={
              props.currentCorePhase === 'OFFENSE' || props.currentCorePhase === 'DEFENSE'
                ? connectors.activeThickness
                : 1.2
            }
            strokeLinecap="round"
          />
        </svg>

        <TactilePlayJoystick
          currentPhase={props.currentCorePhase}
          nextPhase={props.nextByPlay}
          nextLabel={getPhaseLabel(props.nextByPlay)}
          mode="radial"
          switchMotion={props.switchMotion}
          joystickTuning={props.tactileTuning.joystick}
          phaseEmphasis={props.tactileTuning.phaseEmphasis}
          onPlay={props.onPlay}
          onPhaseSelect={props.onPhaseSelect}
        />
      </div>
    </div>
  )
}

function LiteralMode(props: PrototypeControlProps) {
  const isServeLink = props.currentCorePhase === 'SERVE'
  const isReceiveLink = props.currentCorePhase === 'RECEIVE'
  const isLiveLoop = props.currentCorePhase === 'OFFENSE' || props.currentCorePhase === 'DEFENSE'

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 66"
        preserveAspectRatio="none"
      >
        <ConnectorLine active={isServeLink} x1={24} x2={76} y1={18} y2={18} props={props} />
        <ConnectorLine active={isReceiveLink} x1={24} x2={76} y1={48} y2={48} dashed props={props} />
        <ConnectorLine active={isLiveLoop} x1={82} x2={82} y1={22} y2={44} props={props} vertical />
      </svg>

      <div className="relative z-[2] grid w-full grid-cols-[1fr_auto_1fr] grid-rows-2 gap-2">
        <PhaseCard label="Serve" phase="SERVE" compact props={props} />
        <div className="row-span-2 flex items-center justify-center">
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
        <PhaseCard label="Defense" phase="DEFENSE" compact props={props} />
        <PhaseCard label="Receive" phase="RECEIVE" compact props={props} />
        <PhaseCard label="Attack" phase="OFFENSE" compact props={props} />
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
            Concept 4
          </div>
          <div className="rounded-full border border-border/55 bg-card/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            Next: {getPhaseLabel(props.nextByPlay)}
          </div>
        </div>
        <ModeToggle value={props.concept4Mode} onValueChange={props.onConcept4ModeChange} props={props} />
      </div>

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
        {props.concept4Mode === 'radial' ? <RadialMode {...props} /> : <LiteralMode {...props} />}
      </div>
    </div>
  )
}

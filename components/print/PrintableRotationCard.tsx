"use client";

import { Role, ROLES, ROLE_INFO, PositionCoordinates, RosterPlayer, PositionAssignments, Rotation, Phase } from "@/lib/types";
import { isInBackRow } from "@/lib/rotations";
import { cn } from "@/lib/utils";
import styles from "./print-layout.module.css";

export interface PrintConfig {
  showNumbersOnTokens: boolean;
  showNamesOnCourt: boolean;
  showRosterLegend: boolean;
  showZoneNumbers: boolean;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  showNumbersOnTokens: true,
  showNamesOnCourt: false,
  showRosterLegend: true,
  showZoneNumbers: false,
};

export type PrintCardSize = "single" | "standard" | "compact";

interface PrintableRotationCardProps {
  rotation: Rotation;
  phase: Phase;
  positions: PositionCoordinates;
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  baseOrder?: Role[];
  teamName?: string;
  showPhase?: boolean;
  config?: PrintConfig;
  size?: PrintCardSize;
}

// Court dimensions for print (aspect ratio 1:1 for half court)
const COURT_WIDTH = 200;
const COURT_HEIGHT = 200;
const PADDING = 10;

// Convert normalized position (0-1) to SVG coordinates
function toSvgCoords(pos: { x: number; y: number }) {
  return {
    x: PADDING + pos.x * (COURT_WIDTH - 2 * PADDING),
    y: PADDING + pos.y * (COURT_HEIGHT - 2 * PADDING),
  };
}

function PlayerTokenPrint({
  role,
  position,
  roster,
  assignments,
  rotation,
  baseOrder,
  config,
}: {
  role: Role;
  position: { x: number; y: number };
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  rotation: Rotation;
  baseOrder?: Role[];
  config: PrintConfig;
}) {
  const svgPos = toSvgCoords(position);
  const roleInfo = ROLE_INFO[role];
  const playerId = assignments?.[role];
  const player = roster?.find((p) => p.id === playerId);
  const isBack = isInBackRow(rotation, role, baseOrder);

  // Determine what to show on the token
  const displayText = config.showNumbersOnTokens
    ? (player?.number?.toString() || role)
    : role;
  const displayName = player?.name || roleInfo.name;

  // Pretty mode - use role colors
  const bgColor = roleInfo.color || "#f97316";

  return (
    <g>
      <circle
        cx={svgPos.x}
        cy={svgPos.y}
        r={14}
        fill={bgColor}
        stroke={isBack ? "transparent" : "rgba(0,0,0,0.2)"}
        strokeWidth={2}
        opacity={isBack ? 0.7 : 1}
      />
      <text
        x={svgPos.x}
        y={svgPos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
        fill="white"
      >
        {displayText}
      </text>
      {config.showNamesOnCourt && (
        <text
          x={svgPos.x}
          y={svgPos.y + 20}
          textAnchor="middle"
          fontSize={7}
          fill="#374151"
          fontWeight="500"
        >
          {displayName}
        </text>
      )}
    </g>
  );
}

export function PrintableRotationCard({
  rotation,
  phase,
  positions,
  roster,
  assignments,
  baseOrder,
  teamName,
  showPhase = true,
  config: propConfig,
  size = "standard",
}: PrintableRotationCardProps) {
  const activeRoles = ROLES.filter((r) => r !== "L");

  const config: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    ...propConfig,
  };

  const phaseName = phase
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const sizeClass = size === "compact"
    ? styles.cardCompact
    : size === "single"
      ? styles.cardSingle
      : styles.cardStandard;

  return (
    <div className={cn(styles.card, sizeClass)}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>Rotation {rotation}</div>
        {showPhase && (
          <div className={styles.cardMeta}>{phaseName}</div>
        )}
        {teamName && (
          <div className={styles.cardTeam}>{teamName}</div>
        )}
      </div>

      {/* Court */}
      <div className={styles.courtWrap}>
        <svg
          viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
          className={styles.courtSvg}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Court background */}
          <rect
            x={PADDING}
            y={PADDING}
            width={COURT_WIDTH - 2 * PADDING}
            height={COURT_HEIGHT - 2 * PADDING}
            fill="#fed7aa"
            stroke="#ea580c"
            strokeWidth={2}
          />

          {/* Attack line (3m line) */}
          <line
            x1={PADDING}
            y1={PADDING + (COURT_HEIGHT - 2 * PADDING) * 0.33}
            x2={COURT_WIDTH - PADDING}
            y2={PADDING + (COURT_HEIGHT - 2 * PADDING) * 0.33}
            stroke="#ea580c"
            strokeWidth={1}
          />

          {/* Center line */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={COURT_WIDTH - PADDING}
            y2={PADDING}
            stroke="#ea580c"
            strokeWidth={2}
          />

          {/* Zone labels */}
          {config.showZoneNumbers && (
            <>
              <text x={35} y={25} fontSize={8} fill="#9a3412">4</text>
              <text x={100} y={25} fontSize={8} fill="#9a3412">3</text>
              <text x={165} y={25} fontSize={8} fill="#9a3412">2</text>
              <text x={35} y={140} fontSize={8} fill="#9a3412">5</text>
              <text x={100} y={140} fontSize={8} fill="#9a3412">6</text>
              <text x={165} y={140} fontSize={8} fill="#9a3412">1</text>
            </>
          )}

          {/* Players */}
          {activeRoles.map((role) => {
            const pos = positions[role];
            if (!pos) return null;
            return (
              <PlayerTokenPrint
                key={role}
                role={role}
                position={pos}
                roster={roster}
                assignments={assignments}
                rotation={rotation}
                baseOrder={baseOrder}
                config={config}
              />
            );
          })}
        </svg>
      </div>

      {/* Roster Legend - shows player assignments */}
      {config.showRosterLegend && (
        <div className={styles.legend}>
          <div className={styles.legendGrid}>
            {activeRoles.map((role) => {
              const info = ROLE_INFO[role];
              const playerId = assignments?.[role];
              const player = roster?.find((p) => p.id === playerId);
              return (
                <div key={role} className={styles.legendRow}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: info.color }}
                  />
                  <span className={styles.legendRole}>{role}</span>
                  {player?.number ? (
                    <span className={styles.legendNumber}>#{player.number}</span>
                  ) : (
                    <span className={styles.legendNumber}> </span>
                  )}
                  {player?.name ? (
                    <span className={styles.legendName} title={player.name}>
                      {player.name}
                    </span>
                  ) : (
                    <span className={styles.legendName} title={info.name}>
                      {info.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

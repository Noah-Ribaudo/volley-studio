"use client";

import { Role, ROLES, ROLE_INFO, PositionCoordinates, RosterPlayer, PositionAssignments, Rotation, Phase } from "@/lib/types";
import { getRoleZone, isInBackRow } from "@/lib/rotations";
import { cn } from "@/lib/utils";

interface PrintableRotationCardProps {
  rotation: Rotation;
  phase: Phase;
  positions: PositionCoordinates;
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  baseOrder?: Role[];
  teamName?: string;
  mode: "pretty" | "plain";
  showPhase?: boolean;
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
  mode,
  rotation,
  baseOrder,
}: {
  role: Role;
  position: { x: number; y: number };
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  mode: "pretty" | "plain";
  rotation: Rotation;
  baseOrder?: Role[];
}) {
  const svgPos = toSvgCoords(position);
  const roleInfo = ROLE_INFO[role];
  const playerId = assignments?.[role];
  const player = roster?.find((p) => p.id === playerId);
  const zone = getRoleZone(rotation, role, baseOrder || (ROLES.filter(r => r !== 'L') as Role[]));
  const isBack = isInBackRow(rotation, role, baseOrder);

  const displayText = player?.number?.toString() || role;
  const displayName = player?.name || roleInfo.name;

  if (mode === "plain") {
    return (
      <g>
        <circle
          cx={svgPos.x}
          cy={svgPos.y}
          r={14}
          fill="white"
          stroke="black"
          strokeWidth={1.5}
        />
        <text
          x={svgPos.x}
          y={svgPos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          fill="black"
        >
          {displayText}
        </text>
        <text
          x={svgPos.x}
          y={svgPos.y + 20}
          textAnchor="middle"
          fontSize={7}
          fill="black"
        >
          {displayName}
        </text>
      </g>
    );
  }

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
  mode,
  showPhase = true,
}: PrintableRotationCardProps) {
  const activeRoles = ROLES.filter((r) => r !== "L");

  const phaseName = phase
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={cn(
        "print-card inline-block",
        mode === "pretty" ? "bg-white rounded-lg shadow-sm border border-gray-200 p-3" : "border border-black p-2"
      )}
      style={{ width: "220px" }}
    >
      {/* Header */}
      <div className={cn(
        "text-center mb-2 pb-2",
        mode === "pretty" ? "border-b border-gray-100" : "border-b border-black"
      )}>
        <div className={cn(
          "font-bold",
          mode === "pretty" ? "text-gray-900" : "text-black"
        )}>
          Rotation {rotation}
        </div>
        {showPhase && (
          <div className={cn(
            "text-xs",
            mode === "pretty" ? "text-gray-500" : "text-black"
          )}>
            {phaseName}
          </div>
        )}
        {teamName && (
          <div className={cn(
            "text-xs mt-1",
            mode === "pretty" ? "text-orange-600 font-medium" : "text-black"
          )}>
            {teamName}
          </div>
        )}
      </div>

      {/* Court */}
      <svg
        viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
        className="w-full"
        style={{ maxHeight: "200px" }}
      >
        {/* Court background */}
        <rect
          x={PADDING}
          y={PADDING}
          width={COURT_WIDTH - 2 * PADDING}
          height={COURT_HEIGHT - 2 * PADDING}
          fill={mode === "pretty" ? "#fed7aa" : "white"}
          stroke={mode === "pretty" ? "#ea580c" : "black"}
          strokeWidth={2}
        />

        {/* Attack line (3m line) */}
        <line
          x1={PADDING}
          y1={PADDING + (COURT_HEIGHT - 2 * PADDING) * 0.33}
          x2={COURT_WIDTH - PADDING}
          y2={PADDING + (COURT_HEIGHT - 2 * PADDING) * 0.33}
          stroke={mode === "pretty" ? "#ea580c" : "black"}
          strokeWidth={1}
          strokeDasharray={mode === "pretty" ? "none" : "4 2"}
        />

        {/* Center line */}
        <line
          x1={PADDING}
          y1={PADDING}
          x2={COURT_WIDTH - PADDING}
          y2={PADDING}
          stroke={mode === "pretty" ? "#ea580c" : "black"}
          strokeWidth={2}
        />

        {/* Zone labels (plain mode only) */}
        {mode === "plain" && (
          <>
            <text x={35} y={25} fontSize={8} fill="#666">4</text>
            <text x={100} y={25} fontSize={8} fill="#666">3</text>
            <text x={165} y={25} fontSize={8} fill="#666">2</text>
            <text x={35} y={140} fontSize={8} fill="#666">5</text>
            <text x={100} y={140} fontSize={8} fill="#666">6</text>
            <text x={165} y={140} fontSize={8} fill="#666">1</text>
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
              mode={mode}
              rotation={rotation}
              baseOrder={baseOrder}
            />
          );
        })}
      </svg>

      {/* Legend (pretty mode) */}
      {mode === "pretty" && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1 justify-center">
          {activeRoles.map((role) => {
            const info = ROLE_INFO[role];
            return (
              <span
                key={role}
                className="inline-flex items-center gap-1 text-xs"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <span className="text-gray-600">{role}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

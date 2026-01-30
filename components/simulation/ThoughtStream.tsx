"use client";

import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ThoughtMessage } from "@/lib/sim/types";
import { VERBOSITY_PRESETS, type VerbosityPreset } from "@/lib/sim/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  title: string;
  selectedLabel: string | null;
  messages: ThoughtMessage[];
};

const VERBOSITY_LABELS: Record<VerbosityPreset, string> = {
  beginner: "Simple",
  standard: "Standard",
  expert: "Detailed",
  debug: "All",
};

const formatTime = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function ThoughtStream({ title, selectedLabel, messages }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const thoughtVerbosity = useAppStore((s) => s.thoughtVerbosity);
  const setThoughtVerbosity = useAppStore((s) => s.setThoughtVerbosity);

  // Filter messages based on verbosity setting
  const filtered = useMemo(() => {
    const allowedLevels = VERBOSITY_PRESETS[thoughtVerbosity];
    return messages.filter((m) => {
      // Always show game events and system messages
      if (m.role === "game_event" || m.role === "system") return true;
      // Filter thoughts by verbosity level
      const level = m.verbosity ?? "standard";
      return allowedLevels.includes(level);
    });
  }, [messages, thoughtVerbosity]);

  const rendered = useMemo(() => filtered.slice(-200), [filtered]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lastMessage = filtered[filtered.length - 1];
    const lastMessageId = lastMessage?.id ?? null;

    // Scroll if there's a new message or on initial mount
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessageId;
      // Auto-scroll to bottom when new messages arrive
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    } else if (lastMessageIdRef.current === null && filtered.length > 0) {
      // Initial scroll on mount if messages exist
      lastMessageIdRef.current = lastMessageId;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [filtered]);

  return (
    <Card className="w-full max-h-[70vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
      <div className="border-b px-3 py-2 flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate">{title}</span>
            {selectedLabel ? (
              <Badge variant="secondary" className="truncate max-w-[120px] sm:max-w-[220px]">
                {selectedLabel}
              </Badge>
            ) : (
              <Badge variant="outline">Select a player</Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{rendered.length} msgs</span>
        </div>
        <Tabs
          value={thoughtVerbosity}
          onValueChange={(val) => setThoughtVerbosity(val as VerbosityPreset)}
          className="w-full"
        >
          <TabsList className="w-full h-7">
            {(Object.keys(VERBOSITY_LABELS) as VerbosityPreset[]).map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs px-2 py-1">
                {VERBOSITY_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20 min-h-0"
        aria-label="Player thought message stream"
      >
        {selectedLabel ? null : (
          <div className="text-xs text-muted-foreground">
            Click a player token to view their stream of consciousness.
          </div>
        )}

        {rendered.map((m) => {
          const isSystem = m.role === "system";
          const isGameEvent = m.role === "game_event";

          // Game event styling - center-aligned, different visual style
          if (isGameEvent) {
            return (
              <div key={m.id} className="flex justify-center">
                <div
                  className={cn(
                    "max-w-[95%] sm:max-w-[90%] rounded-md border border-dashed px-2 sm:px-3 py-1.5 text-xs",
                    "bg-muted/40 text-muted-foreground italic text-center"
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="opacity-60">⚡</span>
                    <span className="text-xs">{m.content}</span>
                    <span className="opacity-60 text-[11px]">{formatTime(m.createdAtMs)}</span>
                  </div>
                </div>
              </div>
            );
          }

          // Regular thought or system message
          return (
            <div key={m.id} className={cn("flex", isSystem ? "justify-center" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[92%] rounded-lg border px-3 py-2 text-sm leading-snug",
                  isSystem ? "bg-background text-muted-foreground" : "bg-background"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {isSystem ? "system" : "thought"} • {formatTime(m.createdAtMs)}
                  </span>
                  {m.meta?.phase ? (
                    <span className="text-[11px] text-muted-foreground">{m.meta.phase}</span>
                  ) : null}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


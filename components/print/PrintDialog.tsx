"use client";

import { useMemo, useRef, useEffect, useState, type CSSProperties } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PrintableRotationCard, PrintConfig, DEFAULT_PRINT_CONFIG, PrintCardSize } from "./PrintableRotationCard";
import {
  Role,
  PositionCoordinates,
  RosterPlayer,
  PositionAssignments,
  Rotation,
  ROTATIONS,
  RallyPhase,
  Phase,
  DEFAULT_VISIBLE_PHASES,
} from "@/lib/types";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./print-layout.module.css";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRotation: Rotation;
  currentPhase: Phase;
  getPositionsForRotation: (rotation: Rotation, phase: Phase) => PositionCoordinates;
  roster?: RosterPlayer[];
  assignments?: PositionAssignments;
  baseOrder?: Role[];
  teamName?: string;
  visiblePhases?: RallyPhase[];
}

type PrintScope = "current" | "all-rotations" | "all-phases";
type PrintDensity = "single" | "standard" | "compact";

const PAGE_WIDTH_PX = 8.5 * 96;
const PAGE_HEIGHT_PX = 11 * 96;
const CARDS_PER_PAGE: Record<PrintDensity, number> = {
  single: 1,
  standard: 4,
  compact: 6,
};

interface CardData {
  id: string;
  rotation: Rotation;
  phase: Phase;
  positions: PositionCoordinates;
}

interface PageData {
  id: string;
  title?: string;
  subtitle?: string;
  cards: CardData[];
  showPhaseOnCard: boolean;
}

function formatPhase(phase: Phase) {
  return phase
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function PrintDialog({
  open,
  onOpenChange,
  currentRotation,
  currentPhase,
  getPositionsForRotation,
  roster,
  assignments,
  baseOrder,
  teamName,
  visiblePhases = DEFAULT_VISIBLE_PHASES,
}: PrintDialogProps) {
  const [scope, setScope] = useState<PrintScope>("current");
  const [fitToOnePage, setFitToOnePage] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
  const [previewScale, setPreviewScale] = useState(0.9);

  const printRef = useRef<HTMLDivElement>(null);
  const previewBoundsRef = useRef<HTMLDivElement>(null);

  const totalCards = useMemo(() => {
    if (scope === "current") return 1;
    if (scope === "all-rotations") return ROTATIONS.length;
    return ROTATIONS.length * visiblePhases.length;
  }, [scope, visiblePhases.length]);

  const canFitOnOnePage = scope !== "current";

  useEffect(() => {
    if (scope === "current" && fitToOnePage) {
      setFitToOnePage(false);
    }
  }, [scope, fitToOnePage]);

  const density: PrintDensity = scope === "current" ? "single" : fitToOnePage ? "compact" : "standard";
  const cardsPerPage = CARDS_PER_PAGE[density];
  const cardSize: PrintCardSize = density === "compact" ? "compact" : density === "single" ? "single" : "standard";

  const pages = useMemo<PageData[]>(() => {
    if (scope === "current") {
      return [
        {
          id: "current",
          cards: [
            {
              id: `${currentRotation}-${currentPhase}`,
              rotation: currentRotation,
              phase: currentPhase,
              positions: getPositionsForRotation(currentRotation, currentPhase),
            },
          ],
          showPhaseOnCard: true,
        },
      ];
    }

    if (scope === "all-rotations") {
      const cards = ROTATIONS.map((rotation) => ({
        id: `${rotation}-${currentPhase}`,
        rotation,
        phase: currentPhase,
        positions: getPositionsForRotation(rotation, currentPhase),
      }));
      return chunk(cards, cardsPerPage).map((pageCards, index) => ({
        id: `rotations-${index}`,
        title: `Phase: ${formatPhase(currentPhase)}`,
        subtitle: teamName,
        cards: pageCards,
        showPhaseOnCard: false,
      }));
    }

    const pagesForPhases: PageData[] = [];
    visiblePhases.forEach((phase) => {
      const cards = ROTATIONS.map((rotation) => ({
        id: `${rotation}-${phase}`,
        rotation,
        phase,
        positions: getPositionsForRotation(rotation, phase),
      }));
      const phasePages = chunk(cards, cardsPerPage).map((pageCards, index) => ({
        id: `phase-${phase}-${index}`,
        title: `Phase: ${formatPhase(phase)}`,
        subtitle: teamName,
        cards: pageCards,
        showPhaseOnCard: false,
      }));
      pagesForPhases.push(...phasePages);
    });
    return pagesForPhases;
  }, [
    scope,
    currentRotation,
    currentPhase,
    visiblePhases,
    cardsPerPage,
    getPositionsForRotation,
    teamName,
  ]);

  const pageCount = pages.length;
  const currentPhaseLabel = formatPhase(currentPhase);

  useEffect(() => {
    if (!previewBoundsRef.current) return;

    const element = previewBoundsRef.current;
    const updateScale = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;

      const availableWidth = Math.max(0, width - 16);
      const availableHeight = Math.max(0, height - 16);
      const widthScale = availableWidth / PAGE_WIDTH_PX;
      const heightScale = availableHeight / PAGE_HEIGHT_PX;
      const scale = pageCount === 1
        ? Math.min(widthScale, heightScale)
        : widthScale;

      setPreviewScale(Number(scale.toFixed(3)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pageCount]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: teamName ? `${teamName} - Rotations` : "Volleyball Rotations",
  });

  const renderPage = (page: PageData) => {
    const gridClass = density === "compact"
      ? styles.gridCompact
      : density === "single"
        ? styles.gridSingle
        : styles.gridStandard;

    const headerHeight = page.title
      ? page.subtitle
        ? "0.45in"
        : "0.35in"
      : "0in";
    const sectionGap = page.title ? "0.16in" : "0in";
    const gridGap = density === "compact" ? "0.14in" : density === "single" ? "0.22in" : "0.18in";

    const pageStyle = {
      "--page-header-height": headerHeight,
      "--section-gap": sectionGap,
      "--grid-gap": gridGap,
    } as CSSProperties;

    return (
      <div
        key={page.id}
        className={styles.page}
        style={pageStyle}
      >
        {page.title && (
          <div className={styles.pageHeader}>
            <div className={styles.pageTitle}>{page.title}</div>
            {page.subtitle && (
              <div className={styles.pageSubtitle}>{page.subtitle}</div>
            )}
          </div>
        )}
        <div className={cn(styles.pageGrid, gridClass)}>
          {page.cards.map((card) => (
            <PrintableRotationCard
              key={card.id}
              rotation={card.rotation}
              phase={card.phase}
              positions={card.positions}
              roster={roster}
              assignments={assignments}
              baseOrder={baseOrder}
              teamName={scope === "current" ? teamName : undefined}
              showPhase={page.showPhaseOnCard}
              config={config}
              size={cardSize}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] h-[80vh] max-h-[80vh] min-h-0 overflow-hidden !flex !flex-col !gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Rotations
          </DialogTitle>
          <DialogDescription>
            Pick what to print, tweak details if needed, then preview and print.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-gray-700">What to print</Label>
                <RadioGroup
                  value={scope}
                  onValueChange={(value) => setScope(value as PrintScope)}
                  className="flex flex-wrap gap-3"
                >
                  <Label
                    htmlFor="print-scope-current"
                    className={cn(
                      "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
                      scope === "current" ? "border-orange-500 bg-orange-50/60" : "border-gray-200"
                    )}
                  >
                    <RadioGroupItem id="print-scope-current" value="current" className="mt-1" />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium">Current rotation</span>
                      <span className="text-xs text-muted-foreground">
                        Rotation {currentRotation} · {currentPhaseLabel} · 1 card
                      </span>
                    </div>
                  </Label>
                  <Label
                    htmlFor="print-scope-rotations"
                    className={cn(
                      "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
                      scope === "all-rotations" ? "border-orange-500 bg-orange-50/60" : "border-gray-200"
                    )}
                  >
                    <RadioGroupItem id="print-scope-rotations" value="all-rotations" className="mt-1" />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium">All 6 rotations</span>
                      <span className="text-xs text-muted-foreground">
                        {currentPhaseLabel} · {ROTATIONS.length} cards
                      </span>
                    </div>
                  </Label>
                  <Label
                    htmlFor="print-scope-phases"
                    className={cn(
                      "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
                      scope === "all-phases" ? "border-orange-500 bg-orange-50/60" : "border-gray-200"
                    )}
                  >
                    <RadioGroupItem id="print-scope-phases" value="all-phases" className="mt-1" />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium">All phases</span>
                      <span className="text-xs text-muted-foreground">
                        {visiblePhases.length} phases · {ROTATIONS.length * visiblePhases.length} cards
                      </span>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              {scope !== "current" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium">Fit to one page</span>
                    <span className="text-xs text-muted-foreground">
                      {scope === "all-phases"
                        ? "Use a compact layout so each phase fits on a single page."
                        : "Use a compact layout to keep all rotations on one page."}
                    </span>
                  </div>
                  <Switch
                    checked={fitToOnePage}
                    disabled={!canFitOnOnePage}
                    onCheckedChange={(checked) => setFitToOnePage(checked)}
                  />
                </div>
              )}
            </div>

            {showAdvanced && (
              <div id="print-advanced-options" className="rounded-lg border px-4 py-3">
                <div className="text-sm font-medium text-gray-700">Advanced options</div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={config.showNumbersOnTokens}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showNumbersOnTokens: checked }))
                      }
                    />
                    <span className="text-gray-700">Numbers on tokens</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={config.showNamesOnCourt}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showNamesOnCourt: checked }))
                      }
                    />
                    <span className="text-gray-700">Names on court</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={config.showRosterLegend}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showRosterLegend: checked }))
                      }
                    />
                    <span className="text-gray-700">Roster legend</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={config.showZoneNumbers}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showZoneNumbers: checked }))
                      }
                    />
                    <span className="text-gray-700">Zone numbers</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Preview</h3>
                <div className="text-xs text-muted-foreground">
                  {pageCount} {pageCount === 1 ? "page" : "pages"} · {totalCards} {totalCards === 1 ? "card" : "cards"}
                </div>
              </div>
              <div
                ref={previewBoundsRef}
                className="flex-1 min-h-0 rounded-lg border bg-gray-50 p-3 overflow-auto"
              >
                <div
                  ref={printRef}
                  className={styles.printRoot}
                  style={{ "--preview-scale": previewScale } as CSSProperties}
                >
                  <div className={styles.previewStack}>
                    {pages.map((page) => (
                      <div key={page.id} className={styles.previewPage}>
                        <div className={styles.previewPageInner}>{renderPage(page)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>

        <div className="border-t pt-4 mt-4 flex items-center justify-between gap-3 bg-card">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-expanded={showAdvanced}
            aria-controls="print-advanced-options"
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-900 bg-white hover:bg-gray-100 transition-colors"
          >
            {showAdvanced ? "Hide options" : "Advanced options"}
          </button>
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

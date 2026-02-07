"use client";

import { useMemo, useRef, useEffect, useState, type CSSProperties } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogClose,
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
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const isMobile = useIsMobile();
  const [scope, setScope] = useState<PrintScope>("current");
  const [fitToOnePage, setFitToOnePage] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
  const [previewScale, setPreviewScale] = useState(0.9);
  const [mobileStep, setMobileStep] = useState<"setup" | "preview">("setup");
  const [mobilePreviewPageIndex, setMobilePreviewPageIndex] = useState(0);

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

  useEffect(() => {
    if (!open) return;
    setMobileStep("setup");
    setMobilePreviewPageIndex(0);
  }, [open]);

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
    setMobilePreviewPageIndex(0);
  }, [scope, fitToOnePage, currentPhase, currentRotation, visiblePhases.length]);

  useEffect(() => {
    if (mobilePreviewPageIndex < pageCount) return;
    setMobilePreviewPageIndex(Math.max(0, pageCount - 1));
  }, [mobilePreviewPageIndex, pageCount]);

  useEffect(() => {
    if (!previewBoundsRef.current) return;
    if (isMobile && mobileStep !== "preview") return;

    const element = previewBoundsRef.current;
    let frameId = 0;
    const updateScale = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;

      const horizontalInset = isMobile ? 2 : 16;
      const verticalInset = isMobile ? 2 : 16;
      const availableWidth = Math.max(0, width - horizontalInset);
      const availableHeight = Math.max(0, height - verticalInset);
      const widthScale = availableWidth / PAGE_WIDTH_PX;
      const heightScale = availableHeight / PAGE_HEIGHT_PX;
      const scale = isMobile
        ? widthScale
        : pageCount === 1
          ? Math.min(widthScale, heightScale)
        : widthScale;

      setPreviewScale(Number(Math.max(0.1, scale).toFixed(3)));
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateScale);
    };

    scheduleUpdate();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [pageCount, isMobile, mobileStep]);

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

  const previewPages = isMobile
    ? pages.slice(mobilePreviewPageIndex, mobilePreviewPageIndex + 1)
    : pages;

  const renderScopeSelector = (compact: boolean) => (
    <div className="grid gap-2">
      {!compact && <Label className="text-sm font-medium">What to print</Label>}
      <RadioGroup
        value={scope}
        onValueChange={(value) => setScope(value as PrintScope)}
        className={cn(compact ? "grid gap-2" : "flex flex-wrap gap-3")}
      >
        <Label
          htmlFor="print-scope-current"
          className={cn(
            compact ? "flex items-start gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer" : "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
            scope === "current" ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <RadioGroupItem id="print-scope-current" value="current" className="mt-0.5" />
          <div className="grid gap-0.5">
            <span className={cn(compact ? "text-sm font-medium" : "text-sm font-medium")}>Current rotation</span>
            <span className="text-xs text-muted-foreground">
              R{currentRotation} · {currentPhaseLabel} · 1 card
            </span>
          </div>
        </Label>

        <Label
          htmlFor="print-scope-rotations"
          className={cn(
            compact ? "flex items-start gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer" : "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
            scope === "all-rotations" ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <RadioGroupItem id="print-scope-rotations" value="all-rotations" className="mt-0.5" />
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
            compact ? "flex items-start gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer" : "flex flex-1 min-w-[200px] items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer",
            scope === "all-phases" ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <RadioGroupItem id="print-scope-phases" value="all-phases" className="mt-0.5" />
          <div className="grid gap-0.5">
            <span className="text-sm font-medium">All phases</span>
            <span className="text-xs text-muted-foreground">
              {visiblePhases.length} phases · {ROTATIONS.length * visiblePhases.length} cards
            </span>
          </div>
        </Label>
      </RadioGroup>
    </div>
  );

  const renderFitToOnePage = () =>
    scope !== "current" ? (
      <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <div className="grid gap-0.5">
          <span className="text-sm font-medium">Fit to one page</span>
          <span className="text-xs text-muted-foreground">
            Use compact cards per page for this scope.
          </span>
        </div>
        <Switch
          checked={fitToOnePage}
          disabled={!canFitOnOnePage}
          onCheckedChange={(checked) => setFitToOnePage(checked)}
        />
      </div>
    ) : null;

  const renderAdvancedOptions = (compact: boolean) => (
    <>
      <button
        type="button"
        onClick={() => setShowAdvanced((prev) => !prev)}
        aria-expanded={showAdvanced}
        aria-controls="print-advanced-options"
        className={cn(
          "rounded-md border text-sm font-medium transition-colors hover:bg-accent",
          compact ? "w-full px-3 py-2 text-left" : "px-3 py-2"
        )}
      >
        {showAdvanced ? "Hide options" : "Advanced options"}
      </button>

      {showAdvanced && (
        <div id="print-advanced-options" className={cn("rounded-md border bg-muted/20", compact ? "p-2" : "p-3")}>
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2 text-sm">
              <span>Numbers on tokens</span>
              <Switch
                checked={config.showNumbersOnTokens}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, showNumbersOnTokens: checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2 text-sm">
              <span>Names on court</span>
              <Switch
                checked={config.showNamesOnCourt}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, showNamesOnCourt: checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2 text-sm">
              <span>Roster legend</span>
              <Switch
                checked={config.showRosterLegend}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, showRosterLegend: checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2 text-sm">
              <span>Zone numbers</span>
              <Switch
                checked={config.showZoneNumbers}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, showZoneNumbers: checked }))
                }
              />
            </label>
          </div>
        </div>
      )}
    </>
  );

  const renderPreview = (compact: boolean) => (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {pageCount} {pageCount === 1 ? "page" : "pages"} · {totalCards} {totalCards === 1 ? "card" : "cards"}
        </div>
        {isMobile && pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobilePreviewPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={mobilePreviewPageIndex === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
              aria-label="Previous preview page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
              {mobilePreviewPageIndex + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setMobilePreviewPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
              disabled={mobilePreviewPageIndex >= pageCount - 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40"
              aria-label="Next preview page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={previewBoundsRef}
        className={cn(
          "flex-1 min-h-0 overflow-auto border bg-muted/20",
          compact ? "rounded-md p-1" : "rounded-lg p-3"
        )}
      >
        <div
          ref={isMobile ? undefined : printRef}
          className={styles.printRoot}
          style={{ "--preview-scale": previewScale } as CSSProperties}
        >
          <div
            className={styles.previewStack}
            style={isMobile ? { gap: 8, alignItems: "center" } : undefined}
          >
            {previewPages.map((page) => (
              <div key={page.id} className={styles.previewPage}>
                <div className={styles.previewPageInner}>{renderPage(page)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isMobile}
        className={cn(
          isMobile
            ? "!w-screen !max-w-none h-dvh max-h-dvh min-h-0 overflow-hidden !flex !flex-col !gap-0 !rounded-none !border-0 !p-0 top-0 left-0 translate-x-0 translate-y-0"
            : "!w-[92vw] !max-w-[92vw] h-[88vh] max-h-[88vh] min-h-0 overflow-hidden !flex !flex-col !gap-3"
        )}
      >
        {isMobile ? (
          <div className="flex h-full min-h-0 flex-col">
            <div
              className="border-b px-3 pb-2"
              style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
            >
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Printer className="h-4 w-4" />
                  Print Rotations
                </DialogTitle>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs font-medium"
                  >
                    Close
                  </button>
                </DialogClose>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setMobileStep("setup")}
                  className={cn(
                    "rounded px-2 py-1.5 text-sm font-medium transition-colors",
                    mobileStep === "setup" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Setup
                </button>
                <button
                  type="button"
                  onClick={() => setMobileStep("preview")}
                  className={cn(
                    "rounded px-2 py-1.5 text-sm font-medium transition-colors",
                    mobileStep === "preview" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {mobileStep === "setup" ? (
                <div className="h-full overflow-y-auto px-3 py-3 space-y-3">
                  {renderScopeSelector(true)}
                  {renderFitToOnePage()}
                  {renderAdvancedOptions(true)}
                </div>
              ) : (
                <div className="h-full min-h-0 px-2 py-2 flex flex-col">
                  {renderPreview(true)}
                </div>
              )}
            </div>

            <div
              className="border-t px-3 py-2 flex items-center gap-2"
              style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {mobileStep === "setup" ? (
                <button
                  type="button"
                  onClick={() => setMobileStep("preview")}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Review Preview
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileStep("setup")}
                    className="rounded-md border px-3 py-2 text-sm font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint()}
                    className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </>
              )}
            </div>

            <div className="absolute -left-[99999px] top-0 h-0 w-0 overflow-hidden" aria-hidden>
              <div
                ref={printRef}
                className={styles.printRoot}
                style={{ "--preview-scale": 1 } as CSSProperties}
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
        ) : (
          <>
            <DialogHeader className="gap-1">
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print Rotations
              </DialogTitle>
              <DialogDescription>Select scope, preview, then print.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="grid gap-3">
                {renderScopeSelector(false)}
                {renderFitToOnePage()}
                {renderAdvancedOptions(false)}
              </div>
              {renderPreview(false)}
            </div>

            <div className="border-t pt-3 mt-2 flex items-center justify-end gap-2 bg-card">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

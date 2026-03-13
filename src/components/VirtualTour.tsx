import { useEffect, useState, useCallback, useRef } from "react";
import { colors, gradients, fonts, fontSizes } from "../theme";
import type { TourPhase } from "../hooks/useTourState";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export interface TourStepDef {
  target: string;          // data-tour attribute value
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
}

export const DESKTOP_STEPS: TourStepDef[] = [
  {
    target: "sidebar",
    title: "Lesson Navigator",
    body: "Browse all lessons organized by difficulty. Your progress is saved automatically.",
    placement: "right",
  },
  {
    target: "lesson-panel",
    title: "Task Instructions",
    body: "Each lesson has step-by-step tasks. Read the instructions here, and use hints if you get stuck.",
    placement: "bottom",
  },
  {
    target: "editor",
    title: "PowerShell Editor",
    body: "Type your commands here and press Enter (or click Run) to execute them.",
    placement: "top",
  },
  {
    target: "output",
    title: "Output",
    body: "See the results of your commands here. Green means success!",
    placement: "top",
  },
  {
    target: "tree-tab",
    title: "Content Tree",
    body: "Click the \"Tree\" tab to explore the virtual Sitecore content tree and inspect item properties.",
    placement: "bottom",
  },
];

export const MOBILE_STEPS: TourStepDef[] = [
  {
    target: "mobile-tabs",
    title: "Navigation Tabs",
    body: "Switch between Lesson, Editor, and Tree views using these tabs.",
    placement: "top",
  },
  {
    target: "editor",
    title: "PowerShell Editor",
    body: "Type your commands here and press Enter to execute them.",
    placement: "top",
  },
  {
    target: "mobile-menu",
    title: "Lesson Menu",
    body: "Tap here to browse all lessons and track your progress.",
    placement: "bottom",
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VirtualTourProps {
  phase: TourPhase;
  currentStep: number;
  isMobile: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onNext: () => void;
  onPrev: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 290;
const ARROW_SIZE = 8;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function computeTooltipPosition(
  rect: Rect,
  placement: TourStepDef["placement"],
): { top: number; left: number; actualPlacement: TourStepDef["placement"] } {
  const gap = 12;
  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  switch (placement) {
    case "right":
      top = rect.top + rect.height / 2 - 60;
      left = rect.left + rect.width + gap;
      if (left + TOOLTIP_WIDTH > window.innerWidth - 16) {
        actualPlacement = "left";
        left = rect.left - TOOLTIP_WIDTH - gap;
      }
      break;
    case "left":
      top = rect.top + rect.height / 2 - 60;
      left = rect.left - TOOLTIP_WIDTH - gap;
      if (left < 16) {
        actualPlacement = "right";
        left = rect.left + rect.width + gap;
      }
      break;
    case "bottom":
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      if (top + 160 > window.innerHeight) {
        actualPlacement = "top";
        top = rect.top - 160 - gap;
      }
      break;
    case "top":
      top = rect.top - 160 - gap;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      if (top < 16) {
        actualPlacement = "bottom";
        top = rect.top + rect.height + gap;
      }
      break;
  }

  // Clamp horizontal
  left = Math.max(16, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 16));
  // Clamp vertical
  top = Math.max(16, top);

  return { top, left, actualPlacement };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VirtualTour({
  phase,
  currentStep,
  isMobile,
  onAccept,
  onDismiss,
  onNext,
  onPrev,
}: VirtualTourProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const step = steps[currentStep];

  // Measure target element position
  const measure = useCallback(() => {
    if (phase !== "touring" || !step) return;
    const rect = getTargetRect(step.target);
    setTargetRect(rect);
  }, [phase, step]);

  useEffect(() => {
    measure();

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(document.body);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Keyboard handling
  useEffect(() => {
    if (phase === "inactive") return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      } else if (phase === "touring") {
        if (e.key === "ArrowRight") onNext();
        else if (e.key === "ArrowLeft") onPrev();
      } else if (phase === "prompt") {
        if (e.key === "Enter") onAccept();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [phase, onDismiss, onNext, onPrev, onAccept]);

  // Focus tooltip when step changes
  useEffect(() => {
    if (phase === "touring" && tooltipRef.current) {
      tooltipRef.current.focus();
    }
  }, [phase, currentStep]);

  // ------ PROMPT DIALOG ------
  if (phase === "prompt") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.45)",
        }}
        onClick={onDismiss}
      >
        <div
          role="dialog"
          aria-label="Tour prompt"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.borderBase}`,
            borderRadius: 12,
            padding: isMobile ? "28px 24px" : "32px 36px",
            maxWidth: 360,
            width: "90%",
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 20 : 22,
              fontWeight: 600,
              color: colors.textPrimary,
              fontFamily: fonts.sans,
              marginBottom: 8,
            }}
          >
            Welcome!
          </div>
          <div
            style={{
              fontSize: isMobile ? 14 : 15,
              color: colors.textSecondary,
              lineHeight: 1.5,
              marginBottom: 24,
              fontFamily: fonts.sans,
            }}
          >
            Want a quick tour of the interface?
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={onDismiss}
              style={{
                background: "transparent",
                border: `1px solid ${colors.borderMedium}`,
                color: colors.textSecondary,
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: fonts.sans,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Skip
            </button>
            <button
              onClick={onAccept}
              autoFocus
              style={{
                background: gradients.accent,
                border: "none",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: fonts.sans,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Show me around
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------ TOUR STEPS ------
  if (phase !== "touring" || !step || !targetRect) return null;

  const totalSteps = steps.length;
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const { top: ttTop, left: ttLeft, actualPlacement } = computeTooltipPosition(targetRect, step.placement);

  // Arrow styles
  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };

  switch (actualPlacement) {
    case "right":
      Object.assign(arrowStyle, {
        left: -ARROW_SIZE,
        top: 24,
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
        borderColor: `transparent ${colors.bgCard} transparent transparent`,
      });
      break;
    case "left":
      Object.assign(arrowStyle, {
        right: -ARROW_SIZE,
        top: 24,
        borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent transparent ${colors.bgCard}`,
      });
      break;
    case "bottom":
      Object.assign(arrowStyle, {
        top: -ARROW_SIZE,
        left: TOOLTIP_WIDTH / 2 - ARROW_SIZE,
        borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent ${colors.bgCard} transparent`,
      });
      break;
    case "top":
      Object.assign(arrowStyle, {
        bottom: -ARROW_SIZE,
        left: TOOLTIP_WIDTH / 2 - ARROW_SIZE,
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
        borderColor: `${colors.bgCard} transparent transparent transparent`,
      });
      break;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none" }}>
      {/* Spotlight cutout — uses box-shadow to darken everything except the target */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 8,
          border: `2px solid ${colors.accentPrimary}`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          pointerEvents: "none",
          transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
        }}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${step.title}`}
        tabIndex={-1}
        style={{
          position: "absolute",
          top: ttTop,
          left: ttLeft,
          width: TOOLTIP_WIDTH,
          background: colors.bgCard,
          border: `1px solid ${colors.borderBase}`,
          borderRadius: 10,
          padding: "16px 18px 14px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          pointerEvents: "auto",
          outline: "none",
          transition: "top 0.25s ease, left 0.25s ease",
        }}
      >
        {/* Arrow */}
        <div style={arrowStyle} />

        {/* Title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: colors.textPrimary,
            fontFamily: fonts.sans,
            marginBottom: 6,
          }}
        >
          {step.title}
        </div>

        {/* Body */}
        <div
          style={{
            fontSize: fontSizes.body,
            color: colors.textSecondary,
            lineHeight: 1.5,
            fontFamily: fonts.sans,
            marginBottom: 16,
          }}
        >
          {step.body}
        </div>

        {/* Footer: step counter + navigation buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: fontSizes.xs,
              color: colors.textMuted,
              fontFamily: fonts.sans,
            }}
          >
            {currentStep + 1} of {totalSteps}
          </span>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                color: colors.textMuted,
                fontSize: fontSizes.sm,
                fontFamily: fonts.sans,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Skip tour
            </button>
            {!isFirst && (
              <button
                onClick={onPrev}
                style={{
                  background: "transparent",
                  border: `1px solid ${colors.borderMedium}`,
                  color: colors.textSecondary,
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: fontSizes.sm,
                  fontFamily: fonts.sans,
                  cursor: "pointer",
                  minHeight: 32,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              style={{
                background: gradients.accent,
                border: "none",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: fontSizes.sm,
                fontWeight: 600,
                fontFamily: fonts.sans,
                cursor: "pointer",
                minHeight: 32,
              }}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Click blocker — allow clicking the spotlight area but block the rest */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
          zIndex: -1,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

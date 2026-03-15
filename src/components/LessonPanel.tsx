import type { Lesson, Task } from "../types";
import { MarkdownLite } from "./MarkdownLite";
import { HighlightedCode } from "./HighlightedCode";
import { colors, gradients, fontSizes } from "../theme";

interface LessonPanelProps {
  lesson: Lesson;
  task: Task | undefined;
  currentTask: number;
  currentLesson: number;
  currentTaskComplete: boolean;
  attempts: number;
  revealedHintLevel: number;
  onRevealHint: (level: number) => void;
  onAdvanceTask: () => void;
  onGoToTask: (taskIdx: number) => void;
  isTaskComplete: (lessonIdx: number, taskIdx: number) => boolean;
  lessonsLength: number;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  height?: number;
  sideBySide?: boolean;
  nextLabel?: string;
}

export function LessonPanel({
  lesson,
  task,
  currentTask,
  currentLesson,
  currentTaskComplete,
  attempts,
  revealedHintLevel,
  onRevealHint,
  onAdvanceTask,
  onGoToTask,
  isTaskComplete,
  lessonsLength,
  isMobile,
  collapsed,
  onToggleCollapse,
  height,
  sideBySide,
  nextLabel,
}: LessonPanelProps) {
  // Determine which hint tiers are unlocked
  const hasNudge = !!task?.nudge;
  const nudgeUnlocked = attempts >= 2;
  const answerUnlocked = attempts >= 4;

  // Desktop collapsed state
  if (!isMobile && collapsed) {
    // Side-by-side: narrow vertical strip
    if (sideBySide) {
      return (
        <div
          style={{
            width: 36,
            borderRight: `1px solid ${colors.borderBase}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 0",
            gap: 8,
            background: colors.bgPanel,
          }}
        >
          <button
            onClick={onToggleCollapse}
            title="Show panel"
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderDim}`,
              color: colors.textSecondary,
              padding: "4px 6px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: fontSizes.sm,
              fontFamily: "inherit",
            }}
          >
            »
          </button>
          <span
            style={{
              fontSize: fontSizes.sm,
              color: colors.textMuted,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            Task {currentTask + 1}/{lesson.tasks.length}
          </span>
          {/* Task dots vertical */}
          {lesson.tasks.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
              {lesson.tasks.map((_, ti) => (
                <div
                  key={ti}
                  onClick={() => onGoToTask(ti)}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: isTaskComplete(currentLesson, ti)
                      ? colors.statusSuccess
                      : ti === currentTask
                        ? colors.accentPrimary
                        : colors.borderDim,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Stacked: thin horizontal bar
    return (
      <div
        style={{
          height: 36,
          borderBottom: `1px solid ${colors.borderBase}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: colors.bgPanel,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: fontSizes.sm, color: colors.textMuted }}>
          Task {currentTask + 1} of {lesson.tasks.length}
          {currentTaskComplete && <span style={{ color: colors.statusSuccess, marginLeft: 6 }}>✓</span>}
        </span>
        {/* Task dots inline */}
        {lesson.tasks.length > 1 && (
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {lesson.tasks.map((_, ti) => (
              <div
                key={ti}
                onClick={() => onGoToTask(ti)}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isTaskComplete(currentLesson, ti)
                    ? colors.statusSuccess
                    : ti === currentTask
                      ? colors.accentPrimary
                      : colors.borderDim,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={onToggleCollapse}
          style={{
            background: "transparent",
            border: `1px solid ${colors.borderDim}`,
            color: colors.textSecondary,
            padding: "2px 10px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: fontSizes.sm,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ▼ Show Panel
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: isMobile ? "100%" : sideBySide ? "40%" : undefined,
        height: isMobile ? undefined : sideBySide ? undefined : height,
        flex: isMobile ? 1 : undefined,
        borderRight: sideBySide ? `1px solid ${colors.borderBase}` : "none",
        borderBottom: isMobile || sideBySide ? "none" : `1px solid ${colors.borderBase}`,
        display: "flex",
        flexDirection: "column",
        overflow: sideBySide ? "auto" : "hidden",
        flexShrink: sideBySide ? undefined : 0,
        transition: sideBySide ? "width 0.25s ease" : "none",
      }}
    >
      <div style={{ padding: isMobile ? "16px 16px" : sideBySide ? "24px 28px" : "16px 24px", flex: 1, overflow: "auto", position: "relative" }}>
        {/* Collapse button (desktop only) */}
        {!isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              position: "absolute",
              top: 8,
              right: 12,
              background: "transparent",
              border: `1px solid ${colors.borderDim}`,
              color: colors.textSecondary,
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: fontSizes.sm,
              fontFamily: "inherit",
              zIndex: 1,
            }}
            title="Collapse panel"
          >
            {sideBySide ? "«" : "▲"}
          </button>
        )}
        {/* Lesson description */}
        <div style={{ marginBottom: 24 }}>
          <MarkdownLite text={lesson.description} />
        </div>

        {/* Current task */}
        {task && (
          <div
            style={{
              background: currentTaskComplete ? colors.bgCardSuccess : colors.bgCard,
              border: currentTaskComplete
                ? `1px solid ${colors.borderSuccess}`
                : `1px solid ${colors.borderMedium}`,
              borderRadius: 8,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: fontSizes.sm,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: currentTaskComplete ? colors.statusSuccess : colors.accentPrimary,
                marginBottom: 10,
              }}
            >
              {currentTaskComplete
                ? "✓ Completed"
                : `Task ${currentTask + 1}`}
            </div>
            <div style={{ fontSize: fontSizes.lg, lineHeight: 1.6 }}>
              <MarkdownLite text={task.instruction} />
            </div>

            {/* Progressive hint buttons */}
            {!currentTaskComplete && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Nudge / Hint button */}
                  {revealedHintLevel < 2 && (
                    (() => {
                      // If nudge exists and not yet revealed, show nudge button
                      if (hasNudge && revealedHintLevel < 1) {
                        const disabled = !nudgeUnlocked;
                        return (
                          <button
                            onClick={() => !disabled && onRevealHint(1)}
                            disabled={disabled}
                            title={disabled ? "Try the task first (2 attempts needed)" : "Show a conceptual hint"}
                            style={{
                              background: "transparent",
                              border: `1px solid ${disabled ? colors.borderDim : colors.borderMedium}`,
                              color: disabled ? colors.textMuted : colors.textSecondary,
                              padding: isMobile ? "10px 16px" : "5px 12px",
                              borderRadius: 4,
                              cursor: disabled ? "not-allowed" : "pointer",
                              fontSize: isMobile ? 14 : fontSizes.base,
                              fontFamily: "inherit",
                              minHeight: isMobile ? 44 : undefined,
                              opacity: disabled ? 0.6 : 1,
                            }}
                          >
                            Show Hint
                          </button>
                        );
                      }
                      // Show answer button (nudge already revealed or no nudge)
                      const disabled = !answerUnlocked;
                      return (
                        <button
                          onClick={() => !disabled && onRevealHint(2)}
                          disabled={disabled}
                          title={disabled ? `Try the task first (${4 - attempts} more attempt${4 - attempts === 1 ? "" : "s"} needed)` : "Show the full answer"}
                          style={{
                            background: "transparent",
                            border: `1px solid ${disabled ? colors.borderDim : colors.statusHint}`,
                            color: disabled ? colors.textMuted : colors.statusHint,
                            padding: isMobile ? "10px 16px" : "5px 12px",
                            borderRadius: 4,
                            cursor: disabled ? "not-allowed" : "pointer",
                            fontSize: isMobile ? 14 : fontSizes.base,
                            fontFamily: "inherit",
                            minHeight: isMobile ? 44 : undefined,
                            opacity: disabled ? 0.6 : 1,
                          }}
                        >
                          Show Answer
                        </button>
                      );
                    })()
                  )}

                  {/* Hide button when hint is revealed */}
                  {revealedHintLevel > 0 && (
                    <button
                      onClick={() => onRevealHint(0)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${colors.borderDim}`,
                        color: colors.textMuted,
                        padding: isMobile ? "10px 16px" : "5px 12px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: isMobile ? 14 : fontSizes.base,
                        fontFamily: "inherit",
                        minHeight: isMobile ? 44 : undefined,
                      }}
                    >
                      Hide
                    </button>
                  )}
                </div>

                {/* Attempt counter */}
                {attempts > 0 && (
                  <div style={{
                    marginTop: 8,
                    fontSize: fontSizes.sm,
                    color: colors.textMuted,
                  }}>
                    Attempts: {attempts}
                  </div>
                )}
              </div>
            )}

            {/* Nudge display (Tier 1) */}
            {revealedHintLevel >= 1 && !currentTaskComplete && hasNudge && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: colors.bgOverlay,
                  borderRadius: 6,
                  borderLeft: `3px solid ${colors.accentPrimary}`,
                  fontSize: fontSizes.body,
                }}
              >
                <MarkdownLite text={task.nudge!} />
              </div>
            )}

            {/* Full answer display (Tier 2) */}
            {revealedHintLevel >= 2 && !currentTaskComplete && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: colors.bgOverlay,
                  borderRadius: 6,
                  borderLeft: `3px solid ${colors.statusHint}`,
                  fontSize: fontSizes.body,
                }}
              >
                <HighlightedCode code={task.hint} />
              </div>
            )}

            {currentTaskComplete && (
              <button
                onClick={onAdvanceTask}
                style={{
                  marginTop: 14,
                  background: gradients.accent,
                  border: "none",
                  color: colors.textWhite,
                  padding: isMobile ? "12px 24px" : "8px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: isMobile ? 16 : fontSizes.body,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  minHeight: isMobile ? 44 : undefined,
                }}
              >
                {currentTask < lesson.tasks.length - 1
                  ? "Next Task →"
                  : nextLabel
                    ? nextLabel
                    : currentLesson < lessonsLength - 1
                      ? "Next Lesson →"
                      : "🎉 Tutorial Complete!"}
              </button>
            )}
          </div>
        )}

        {/* Task dots */}
        {lesson.tasks.length > 1 && (
          <div style={{ display: "flex", gap: isMobile ? 10 : 6, marginTop: 4 }}>
            {lesson.tasks.map((_, ti) => (
              <div
                key={ti}
                onClick={() => onGoToTask(ti)}
                style={{
                  width: isMobile ? 16 : 8,
                  height: isMobile ? 16 : 8,
                  borderRadius: "50%",
                  background: isTaskComplete(currentLesson, ti)
                    ? colors.statusSuccess
                    : ti === currentTask
                      ? colors.accentPrimary
                      : colors.borderDim,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

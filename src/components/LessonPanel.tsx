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
  showHint: boolean;
  showTreePanel: boolean;
  onToggleHint: () => void;
  onAdvanceTask: () => void;
  onGoToTask: (taskIdx: number) => void;
  isTaskComplete: (lessonIdx: number, taskIdx: number) => boolean;
  lessonsLength: number;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  height?: number;
  sideBySide?: boolean;
}

export function LessonPanel({
  lesson,
  task,
  currentTask,
  currentLesson,
  currentTaskComplete,
  showHint,
  showTreePanel,
  onToggleHint,
  onAdvanceTask,
  onGoToTask,
  isTaskComplete,
  lessonsLength,
  isMobile,
  collapsed,
  onToggleCollapse,
  height,
  sideBySide,
}: LessonPanelProps) {
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
            title="Show Tasks"
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
            ▶
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
          ▼ Show Tasks
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: isMobile ? "100%" : sideBySide ? (showTreePanel ? "35%" : "40%") : undefined,
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
            title="Collapse task panel"
          >
            {sideBySide ? "◀" : "▲"}
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

            {!currentTaskComplete && (
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button
                  onClick={onToggleHint}
                  style={{
                    background: "transparent",
                    border: `1px solid ${colors.borderDim}`,
                    color: colors.textSecondary,
                    padding: isMobile ? "10px 16px" : "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: isMobile ? 14 : fontSizes.base,
                    fontFamily: "inherit",
                    minHeight: isMobile ? 44 : undefined,
                  }}
                >
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>
            )}

            {showHint && !currentTaskComplete && (
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

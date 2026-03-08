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
}: LessonPanelProps) {
  return (
    <div
      style={{
        width: showTreePanel ? "35%" : "40%",
        borderRight: `1px solid ${colors.borderBase}`,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        transition: "width 0.25s ease",
      }}
    >
      <div style={{ padding: "24px 28px", flex: 1, overflow: "auto" }}>
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
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: fontSizes.base,
                    fontFamily: "inherit",
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
                  padding: "8px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: fontSizes.body,
                  fontWeight: 600,
                  fontFamily: "inherit",
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
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {lesson.tasks.map((_, ti) => (
              <div
                key={ti}
                onClick={() => onGoToTask(ti)}
                style={{
                  width: 8,
                  height: 8,
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

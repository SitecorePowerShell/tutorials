import type { Lesson, Task } from "../types";
import { MarkdownLite } from "./MarkdownLite";
import { HighlightedCode } from "./HighlightedCode";

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
        borderRight: "1px solid #1a1a35",
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
              background: currentTaskComplete ? "#0d1f0d" : "#12122a",
              border: currentTaskComplete
                ? "1px solid #2e5e2e"
                : "1px solid #2a2a4a",
              borderRadius: 8,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: currentTaskComplete ? "#4caf50" : "#5c6bc0",
                marginBottom: 10,
              }}
            >
              {currentTaskComplete
                ? "✓ Completed"
                : `Task ${currentTask + 1}`}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <MarkdownLite text={task.instruction} />
            </div>

            {!currentTaskComplete && (
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button
                  onClick={onToggleHint}
                  style={{
                    background: "transparent",
                    border: "1px solid #333355",
                    color: "#8888a8",
                    padding: "5px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
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
                  background: "#1a1a2e",
                  borderRadius: 6,
                  borderLeft: "3px solid #ffab40",
                  fontSize: 13,
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
                  background:
                    "linear-gradient(135deg, #5c6bc0, #7c4dff)",
                  border: "none",
                  color: "#fff",
                  padding: "8px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
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
                    ? "#4caf50"
                    : ti === currentTask
                      ? "#5c6bc0"
                      : "#333355",
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

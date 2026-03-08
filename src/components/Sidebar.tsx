import type { Lesson } from "../types";

interface SidebarProps {
  lessons: Lesson[];
  currentLesson: number;
  completedTasks: Record<string, boolean>;
  totalTasks: number;
  completedCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onGoToLesson: (idx: number) => void;
}

export function Sidebar({
  lessons,
  currentLesson,
  completedTasks,
  totalTasks,
  completedCount,
  collapsed,
  onToggle,
  onGoToLesson,
}: SidebarProps) {
  const isTaskComplete = (lessonIdx: number, taskIdx: number) =>
    completedTasks[`${lessonIdx}-${taskIdx}`];

  const isLessonComplete = (lessonIdx: number) =>
    lessons[lessonIdx].tasks.every((_, ti) => isTaskComplete(lessonIdx, ti));

  return (
    <div
      style={{
        width: collapsed ? 48 : 260,
        background: "#0f0f24",
        borderRight: "1px solid #1a1a35",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: collapsed ? "16px 8px" : "20px 20px 16px",
          borderBottom: "1px solid #1a1a35",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 60,
        }}
      >
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#8187dc",
                letterSpacing: "0.02em",
              }}
            >
              SPE Tutorial
            </div>
            <div style={{ fontSize: 11, color: "#555570", marginTop: 2 }}>
              {completedCount}/{totalTasks} tasks complete
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "#555570",
            cursor: "pointer",
            fontSize: 16,
            padding: 4,
            lineHeight: 1,
          }}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
          {lessons.map((l, li) => {
            const complete = isLessonComplete(li);
            const active = li === currentLesson;
            return (
              <button
                key={l.id}
                onClick={() => onGoToLesson(li)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  padding: "10px 20px",
                  background: active ? "#1a1a3a" : "transparent",
                  border: "none",
                  borderLeft: active
                    ? "3px solid #5c6bc0"
                    : "3px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: active ? "#d4d4e8" : "#8888a8",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: complete
                      ? "2px solid #4caf50"
                      : active
                        ? "2px solid #5c6bc0"
                        : "2px solid #333355",
                    background: complete ? "#4caf50" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#fff",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {complete ? "✓" : li + 1}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      lineHeight: 1.3,
                    }}
                  >
                    {l.title}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#555570", marginTop: 2 }}
                  >
                    {l.tasks.length} task{l.tasks.length > 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Progress bar at bottom */}
      {!collapsed && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1a1a35" }}>
          <div
            style={{
              height: 4,
              background: "#1a1a35",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(completedCount / totalTasks) * 100}%`,
                background: "linear-gradient(90deg, #5c6bc0, #7c4dff)",
                borderRadius: 2,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

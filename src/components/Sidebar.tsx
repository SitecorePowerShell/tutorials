import { useState } from "react";
import type { Lesson } from "../types";
import { colors, gradients, fontSizes } from "../theme";

interface SidebarProps {
  lessons: Lesson[];
  currentLesson: number;
  completedTasks: Record<string, boolean>;
  totalTasks: number;
  completedCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onGoToLesson: (idx: number) => void;
  onResetProgress: () => void;
  isMobile?: boolean;
  onClose?: () => void;
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
  onResetProgress,
  isMobile,
  onClose,
}: SidebarProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const isTaskComplete = (lessonIdx: number, taskIdx: number) =>
    completedTasks[`${lessonIdx}-${taskIdx}`];

  const isLessonComplete = (lessonIdx: number) =>
    lessons[lessonIdx].tasks.every((_, ti) => isTaskComplete(lessonIdx, ti));

  return (
    <div
      style={{
        width: isMobile ? "100%" : collapsed ? 48 : 260,
        height: isMobile ? "100%" : undefined,
        background: colors.bgPanel,
        borderRight: isMobile ? "none" : `1px solid ${colors.borderBase}`,
        display: "flex",
        flexDirection: "column",
        transition: isMobile ? "none" : "width 0.25s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: collapsed ? "16px 8px" : "20px 20px 16px",
          borderBottom: `1px solid ${colors.borderBase}`,
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
                fontSize: fontSizes.lg,
                fontWeight: 700,
                color: colors.accentTitle,
                letterSpacing: "0.02em",
              }}
            >
              SPE Tutorial
            </div>
            <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
              {completedCount}/{totalTasks} tasks complete
            </div>
          </div>
        )}
        <button
          onClick={isMobile ? onClose : onToggle}
          style={{
            background: "none",
            border: "none",
            color: colors.textMuted,
            cursor: "pointer",
            fontSize: isMobile ? 20 : fontSizes.xl,
            padding: isMobile ? 8 : 4,
            minWidth: isMobile ? 44 : undefined,
            minHeight: isMobile ? 44 : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {isMobile ? "✕" : collapsed ? "▶" : "◀"}
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
                  padding: isMobile ? "14px 20px" : "10px 20px",
                  minHeight: isMobile ? 48 : undefined,
                  background: active ? colors.bgActive : "transparent",
                  border: "none",
                  borderLeft: active
                    ? `3px solid ${colors.accentPrimary}`
                    : "3px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: active ? colors.textPrimary : colors.textSecondary,
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: complete
                      ? `2px solid ${colors.statusSuccess}`
                      : active
                        ? `2px solid ${colors.accentPrimary}`
                        : `2px solid ${colors.borderDim}`,
                    background: complete ? colors.statusSuccess : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: fontSizes.xs,
                    color: colors.textWhite,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {complete ? "✓" : li + 1}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: fontSizes.body,
                      fontWeight: active ? 600 : 400,
                      lineHeight: 1.3,
                    }}
                  >
                    {l.title}
                  </div>
                  <div
                    style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}
                  >
                    {l.tasks.length} task{l.tasks.length > 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Progress bar + reset at bottom */}
      {!collapsed && (
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${colors.borderBase}` }}>
          <div
            style={{
              height: 4,
              background: colors.borderBase,
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: completedCount > 0 ? 8 : 0,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(completedCount / totalTasks) * 100}%`,
                background: gradients.progress,
                borderRadius: 2,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          {completedCount > 0 && (
            <button
              onClick={() => {
                if (confirmReset) {
                  onResetProgress();
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                  setTimeout(() => setConfirmReset(false), 3000);
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: confirmReset ? colors.statusError : colors.textMuted,
                cursor: "pointer",
                fontSize: fontSizes.sm,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              {confirmReset ? "Click again to confirm reset" : "Reset progress"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

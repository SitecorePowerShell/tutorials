import { useState } from "react";
import type { Lesson, Quiz, QuizResult } from "../types";
import { colors, gradients, fontSizes, type ThemeMode } from "../theme";

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
  themeMode: ThemeMode;
  onThemeToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
  onStartTour?: () => void;
  quizzes?: Quiz[];
  quizResults?: Record<string, QuizResult>;
  onGoToQuiz?: (quizId: string) => void;
  activeQuiz?: string | null;
}

interface ModuleGroup {
  module: string;
  lessons: { lesson: Lesson; index: number }[];
}

const difficultyColorsDark: Record<string, string> = {
  intro: "#4caf50",
  beginner: "#66bb6a",
  intermediate: "#ffab40",
  advanced: "#ef5350",
};

const difficultyColorsLight: Record<string, string> = {
  intro: "#2e7d32",
  beginner: "#388e3c",
  intermediate: "#e65100",
  advanced: "#c62828",
};

const difficultyLabels: Record<string, string> = {
  intro: "Intro",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function groupByModule(lessons: Lesson[]): ModuleGroup[] {
  const groups: ModuleGroup[] = [];
  let current: ModuleGroup | null = null;

  lessons.forEach((lesson, index) => {
    if (!current || current.module !== lesson.module) {
      current = { module: lesson.module, lessons: [] };
      groups.push(current);
    }
    current.lessons.push({ lesson, index });
  });

  return groups;
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
  themeMode,
  onThemeToggle,
  isMobile,
  onClose,
  onStartTour,
  quizzes,
  quizResults,
  onGoToQuiz,
  activeQuiz,
}: SidebarProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "completed">("all");

  const isTaskComplete = (lessonIdx: number, taskIdx: number) =>
    completedTasks[`${lessonIdx}-${taskIdx}`];

  const isLessonComplete = (lessonIdx: number) =>
    lessons[lessonIdx].tasks.every((_, ti) => isTaskComplete(lessonIdx, ti));

  const toggleModule = (module: string) => {
    setCollapsedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  // Filter lessons based on search query and filter mode
  const filteredLessons = lessons.filter((lesson, idx) => {
    // Filter mode
    if (filterMode === "completed" && !isLessonComplete(idx)) return false;
    if (filterMode === "incomplete" && isLessonComplete(idx)) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (lesson.title.toLowerCase().includes(q)) return true;
    if (lesson.module.toLowerCase().includes(q)) return true;
    if (lesson.description?.toLowerCase().includes(q)) return true;
    if (lesson.difficulty?.toLowerCase().includes(q)) return true;
    if (lesson.tasks.some(t =>
      t.instruction.toLowerCase().includes(q) ||
      t.hint?.toLowerCase().includes(q)
    )) return true;
    return false;
  });

  // Build a set of visible lesson indices for filtering moduleGroups
  const visibleIndices = new Set(
    filteredLessons.map(l => lessons.indexOf(l))
  );

  const moduleGroups = groupByModule(lessons);

  const getModuleProgress = (group: ModuleGroup) => {
    const total = group.lessons.reduce((sum, { lesson }) => sum + lesson.tasks.length, 0);
    const done = group.lessons.reduce(
      (sum, { lesson, index }) =>
        sum + lesson.tasks.filter((_, ti) => isTaskComplete(index, ti)).length,
      0,
    );
    return { total, done };
  };

  return (
    <div
      style={{
        width: isMobile ? "100%" : collapsed ? 48 : 280,
        height: "100%",
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
              SPE Learning Path
            </div>
            <div style={{ fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 }}>
              {completedCount}/{totalTasks} tasks complete
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 4 }}>
          <button
            onClick={onThemeToggle}
            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: "none",
              color: colors.textMuted,
              cursor: "pointer",
              fontSize: collapsed ? fontSizes.lg : fontSizes.xl,
              padding: isMobile ? 8 : 4,
              minWidth: isMobile ? 44 : undefined,
              minHeight: isMobile ? 44 : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
          >
            {themeMode === "dark" ? "\u2600" : "\u263E"}
          </button>
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
            {isMobile ? "\u2715" : collapsed ? "\u25B6" : "\u25C0"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {/* Search and filter */}
          <div style={{ padding: "4px 12px 8px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 30px 7px 10px",
                  background: colors.bgDeep,
                  border: `1px solid ${colors.borderBase}`,
                  borderRadius: 5,
                  color: colors.textPrimary,
                  fontSize: fontSizes.sm,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = colors.accentPrimary)}
                onBlur={(e) => (e.currentTarget.style.borderColor = colors.borderBase)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: colors.textMuted,
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 2,
                    lineHeight: 1,
                  }}
                  aria-label="Clear search"
                >
                  &#x2715;
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {(["all", "incomplete", "completed"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  style={{
                    flex: 1,
                    padding: "3px 0",
                    background: filterMode === mode ? `${colors.accentPrimary}22` : "transparent",
                    border: `1px solid ${filterMode === mode ? colors.accentPrimary : colors.borderDim}`,
                    borderRadius: 4,
                    color: filterMode === mode ? colors.accentPrimary : colors.textMuted,
                    fontSize: 10,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Start Here banner for new users */}
          {completedCount === 0 && !searchQuery && filterMode === "all" && (
            <div style={{ margin: "4px 12px 12px" }}>
              <button
                onClick={() => onGoToLesson(0)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 14px",
                  background: `linear-gradient(135deg, ${colors.bgCardSuccess}, ${colors.bgDeep})`,
                  border: `1px solid ${colors.statusSuccess}44`,
                  borderRadius: 6,
                  cursor: "pointer",
                  color: colors.statusSuccessLight,
                  fontSize: fontSizes.body,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 16 }}>&#9654;</span>
                Start Here
              </button>
              {onStartTour && (
                <button
                  onClick={onStartTour}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.accentLink,
                    fontSize: fontSizes.sm,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "6px 14px 2px",
                    textAlign: "left",
                  }}
                >
                  Take the tour
                </button>
              )}
            </div>
          )}

          {/* No results message */}
          {(searchQuery || filterMode !== "all") && visibleIndices.size === 0 && (
            <div style={{ padding: "16px 20px", color: colors.textMuted, fontSize: fontSizes.sm, textAlign: "center" }}>
              No lessons match your {searchQuery ? "search" : "filter"}.
            </div>
          )}

          {moduleGroups.map((group) => {
            // Filter group lessons to only visible ones
            const groupVisible = group.lessons.filter(({ index }) => visibleIndices.has(index));
            if (groupVisible.length === 0 && (searchQuery || filterMode !== "all")) return null;

            const isCollapsed = (collapsedModules[group.module] ?? false) && !searchQuery && filterMode === "all";
            const { total, done } = getModuleProgress(group);
            const moduleComplete = done === total;
            const hasActiveLesson = group.lessons.some(({ index }) => index === currentLesson);

            return (
              <div key={group.module} style={{ marginBottom: 4 }}>
                {/* Module header */}
                <button
                  onClick={() => toggleModule(group.module)}
                  aria-expanded={!isCollapsed}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: isMobile ? "12px 16px" : "8px 16px",
                    background: hasActiveLesson ? `${colors.accentPrimary}10` : "transparent",
                    border: "none",
                    borderLeft: hasActiveLesson
                      ? `3px solid ${colors.accentPrimary}60`
                      : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: fontSizes.xs,
                      color: colors.textMuted,
                      transition: "transform 0.2s",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    &#9660;
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: fontSizes.sm,
                        fontWeight: 700,
                        color: moduleComplete ? colors.statusSuccess : colors.textSubtle,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        lineHeight: 1.3,
                      }}
                    >
                      {group.module}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 3,
                      }}
                    >
                      {/* Mini progress bar */}
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: colors.borderBase,
                          borderRadius: 1,
                          overflow: "hidden",
                          maxWidth: 60,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${total > 0 ? (done / total) * 100 : 0}%`,
                            background: moduleComplete ? colors.statusSuccess : colors.accentPrimary,
                            borderRadius: 1,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: fontSizes.xs,
                          color: colors.textMuted,
                        }}
                      >
                        {done}/{total}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Lessons within module */}
                {!isCollapsed &&
                  (searchQuery || filterMode !== "all" ? groupVisible : group.lessons).map(({ lesson: l, index: li }) => {
                    const complete = isLessonComplete(li);
                    const active = li === currentLesson && !activeQuiz;
                    const difficulty = l.difficulty;
                    return (
                      <button
                        key={l.id}
                        onClick={() => onGoToLesson(li)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          width: "100%",
                          padding: isMobile ? "12px 20px 12px 36px" : "8px 16px 8px 36px",
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
                          fontFamily: "inherit",
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
                            color: complete ? colors.textWhite : colors.textMuted,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {complete ? "✓" : li + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: fontSizes.xs,
                                color: colors.textMuted,
                              }}
                            >
                              {l.tasks.length} task{l.tasks.length > 1 ? "s" : ""}
                            </span>
                            {difficulty && difficultyLabels[difficulty] && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: (themeMode === "dark" ? difficultyColorsDark : difficultyColorsLight)[difficulty] ?? colors.textMuted,
                                  border: `1px solid ${(themeMode === "dark" ? difficultyColorsDark : difficultyColorsLight)[difficulty] ?? colors.borderDim}44`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  lineHeight: 1.4,
                                }}
                              >
                                {difficultyLabels[difficulty]}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                {/* Quiz entry for this module */}
                {!isCollapsed && quizzes && onGoToQuiz && quizzes
                  .filter((q) => q.module === group.module)
                  .map((quiz) => {
                    const result = quizResults?.[quiz.id];
                    const quizComplete = result?.completed ?? false;
                    const isActive = activeQuiz === quiz.id;

                    return (
                      <button
                        key={`quiz-${quiz.id}`}
                        onClick={() => onGoToQuiz(quiz.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          width: "100%",
                          padding: isMobile ? "12px 20px 12px 36px" : "8px 16px 8px 36px",
                          minHeight: isMobile ? 48 : undefined,
                          background: isActive ? colors.bgActive : "transparent",
                          border: "none",
                          borderLeft: isActive
                            ? `3px solid ${colors.statusHint}`
                            : "3px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          color: isActive ? colors.textPrimary : colors.textSecondary,
                          transition: "all 0.15s",
                          fontFamily: "inherit",
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: quizComplete
                              ? `2px solid ${colors.statusSuccess}`
                              : isActive
                                ? `2px solid ${colors.statusHint}`
                                : `2px solid ${colors.borderDim}`,
                            background: quizComplete ? colors.statusSuccess : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: quizComplete ? colors.textWhite : colors.textMuted,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {quizComplete ? "✓" : "Q"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: fontSizes.body,
                              fontWeight: isActive ? 600 : 400,
                              lineHeight: 1.3,
                            }}
                          >
                            Quiz
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: fontSizes.xs,
                                color: colors.textMuted,
                              }}
                            >
                              {quiz.questions.length} questions
                            </span>
                            {quizComplete && result && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: colors.statusSuccess,
                                  border: `1px solid ${colors.statusSuccess}44`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                  lineHeight: 1.4,
                                }}
                              >
                                {result.score}/{result.total}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
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
      <div
        style={{
          padding: "8px 16px",
          fontSize: 10,
          color: colors.textMuted,
          opacity: 0.5,
          textAlign: "center",
        }}
      >
        v{__APP_VERSION__}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import type { ConsoleEntry } from "./types";
import { LESSONS } from "./lessons/loader";
import { VIRTUAL_TREE } from "./engine/virtualTree";
import { executeScript, executeCommand } from "./engine/executor";
import { validateTask } from "./validation/validator";
import { loadProgress, saveProgress, clearProgress } from "./hooks/useSessionProgress";
import { loadUIPreferences, saveUIPreferences, type ActivePanel } from "./hooks/useUIPreferences";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { Sidebar } from "./components/Sidebar";
import { LessonPanel } from "./components/LessonPanel";
import { ReplEditor } from "./components/ReplEditor";
import { IseEditor } from "./components/IseEditor";
import { TreePanel } from "./components/TreePanel";
import { MobileTabBar, type MobilePanel } from "./components/MobileTabBar";
import { colors, fonts, fontSizes, fontSizesMobile } from "./theme";

const initialProgress = loadProgress();
const initialPrefs = loadUIPreferences();

export default function SPETutorial() {
  const [currentLesson, setCurrentLesson] = useState(initialProgress.currentLesson);
  const [currentTask, setCurrentTask] = useState(initialProgress.currentTask);
  const [code, setCode] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<ConsoleEntry[]>([]);
  const [completedTasks, setCompletedTasks] = useState<
    Record<string, boolean>
  >(initialProgress.completedTasks);
  const [taskAttempts, setTaskAttempts] = useState<Record<string, number>>(initialProgress.taskAttempts);
  const [revealedHintLevel, setRevealedHintLevel] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialProgress.sidebarCollapsed);
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialPrefs.activePanel);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("lesson");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lessonPanelHeight, setLessonPanelHeight] = useState(200);
  const [lessonPanelCollapsed, setLessonPanelCollapsed] = useState(initialPrefs.lessonPanelCollapsed);
  const [layoutStacked, setLayoutStacked] = useState(initialPrefs.layoutStacked);
  const lessonPanelRef = useRef<HTMLDivElement>(null);
  const isDraggingLessonPanel = useRef(false);
  const editorHeightRef = useRef(initialPrefs.editorHeight);
  const hasInitializedHeight = useRef(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
  const fs = isMobile ? fontSizesMobile : fontSizes;

  const lesson = LESSONS[currentLesson];
  const task = lesson?.tasks?.[currentTask];
  const isISE = lesson?.mode === "ise";
  const totalTasks = LESSONS.reduce((sum, l) => sum + l.tasks.length, 0);
  const completedCount = Object.keys(completedTasks).length;

  // Persist progress to localStorage
  useEffect(() => {
    saveProgress({
      currentLesson,
      currentTask,
      completedTasks,
      taskAttempts,
      sidebarCollapsed,
    });
  }, [currentLesson, currentTask, completedTasks, taskAttempts, sidebarCollapsed]);

  // Initialize lesson panel height from saved percentage once container is measured
  useEffect(() => {
    if (hasInitializedHeight.current) return;
    const container = lessonPanelRef.current?.parentElement;
    if (!container) return;
    const containerH = container.getBoundingClientRect().height;
    if (containerH > 0) {
      const maxHeight = containerH * 0.5;
      const targetHeight = containerH * (initialPrefs.lessonPanelHeightPercent / 100);
      setLessonPanelHeight(Math.max(80, Math.min(targetHeight, maxHeight)));
      hasInitializedHeight.current = true;
    }
  });

  // Persist UI preferences to localStorage
  useEffect(() => {
    const container = lessonPanelRef.current?.parentElement;
    const containerH = container?.getBoundingClientRect().height;
    const heightPercent = containerH && containerH > 0
      ? (lessonPanelHeight / containerH) * 100
      : initialPrefs.lessonPanelHeightPercent;

    saveUIPreferences({
      layoutStacked,
      lessonPanelHeightPercent: Math.round(heightPercent),
      editorHeight: editorHeightRef.current,
      activePanel,
      lessonPanelCollapsed,
    });
  }, [layoutStacked, lessonPanelHeight, activePanel, lessonPanelCollapsed]);

  const handleResetProgress = useCallback(() => {
    clearProgress();
    setCurrentLesson(0);
    setCurrentTask(0);
    setCompletedTasks({});
    setTaskAttempts({});
    setSidebarCollapsed(false);
  }, []);

  // Reset editor and output when switching lessons or tasks
  useEffect(() => {
    setConsoleOutput([]);
    setRevealedHintLevel(0);
    if (isISE && task?.starterCode) {
      setCode(task.starterCode);
    } else if (isISE) {
      setCode("# Write your script here\n");
    } else {
      setCode("");
    }
  }, [currentLesson, currentTask]);

  const handleRun = useCallback((codeOverride?: string) => {
    const effective = typeof codeOverride === "string" ? codeOverride : code;
    if (!effective.trim()) return;
    const taskKey = `${currentLesson}-${currentTask}`;

    // Handle clear commands in console mode
    const trimmed = effective.trim().toLowerCase();
    if (trimmed === "clear-host" || trimmed === "clear" || trimmed === "cls") {
      setConsoleOutput([]);
      const historyEntry = effective.trim().split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
      setCommandHistory((prev) => [...prev, historyEntry]);
      setHistoryIndex(-1);
      setCode("");
      return;
    }

    const newOutput: ConsoleEntry[] = isISE
      ? [...consoleOutput]
      : [...consoleOutput, { type: "command", text: effective.trim() }];

    if (isISE) {
      newOutput.push({ type: "script", text: effective.trim() });
    }

    // Execute
    let result;
    if (isISE) {
      result = executeScript(effective);
    } else {
      const normalized = effective
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .join(" ");
      result = executeCommand(normalized);
    }

    if (result.error) {
      newOutput.push({ type: "error", text: result.error });
    } else if (result.output) {
      newOutput.push({ type: "output", text: result.output });
    }

    // Validate against current task
    if (task) {
      const validation = validateTask(effective.trim(), task);
      if (validation.passed) {
        newOutput.push({
          type: "success",
          text: `✓ ${task.successMessage || "Correct!"}`,
        });
        setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
      } else {
        setTaskAttempts((prev) => ({
          ...prev,
          [taskKey]: (prev[taskKey] || 0) + 1,
        }));
        newOutput.push({
          type: "hint",
          text: validation.feedback || "",
        });
        if (validation.partial) {
          newOutput.push({
            type: "partial",
            text: validation.partial.join(" → "),
          });
        }
      }
    }

    setConsoleOutput(newOutput);
    if (!isISE) {
      const historyEntry = effective.trim().split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
      setCommandHistory((prev) => [...prev, historyEntry]);
      setHistoryIndex(-1);
      setCode("");
    }
  }, [code, consoleOutput, currentLesson, currentTask, task, isISE]);

  const advanceTask = () => {
    if (currentTask < lesson.tasks.length - 1) {
      setCurrentTask(currentTask + 1);
    } else if (currentLesson < LESSONS.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setCurrentTask(0);
    }
  };

  const goToLesson = (idx: number) => {
    setCurrentLesson(idx);
    setCurrentTask(0);
    if (isMobile) {
      setMobileSidebarOpen(false);
      setMobilePanel("lesson");
    }
  };

  const goToTask = (taskIdx: number) => {
    setCurrentTask(taskIdx);
  };

  const isTaskComplete = (lessonIdx: number, taskIdx: number) =>
    !!completedTasks[`${lessonIdx}-${taskIdx}`];

  const currentTaskComplete = isTaskComplete(currentLesson, currentTask);
  const currentTaskKey = `${currentLesson}-${currentTask}`;
  const currentAttempts = taskAttempts[currentTaskKey] || 0;

  // Auto-collapse sidebar on tablet
  useEffect(() => {
    if (isTablet && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isTablet]);

  // Lesson panel resize drag handlers
  const handleLessonDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingLessonPanel.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingLessonPanel.current || !lessonPanelRef.current) return;
      const panelTop = lessonPanelRef.current.getBoundingClientRect().top;
      const containerHeight = lessonPanelRef.current.parentElement!.getBoundingClientRect().height;
      const newHeight = e.clientY - panelTop;
      const maxHeight = containerHeight * 0.5;
      const clamped = Math.max(80, Math.min(newHeight, maxHeight));
      setLessonPanelHeight(clamped);
    };
    const handleMouseUp = () => {
      if (isDraggingLessonPanel.current) {
        isDraggingLessonPanel.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div
        style={{
          height: "100dvh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          fontFamily: fonts.sans,
          background: colors.bgBase,
          color: colors.textPrimary,
          overflow: "hidden",
          minWidth: 390,
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        {/* Mobile top bar */}
        <div
          style={{
            height: 52,
            background: colors.bgPanel,
            borderBottom: `1px solid ${colors.borderBase}`,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: colors.textSecondary,
              fontSize: 22,
              cursor: "pointer",
              padding: 8,
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ☰
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: fs.body,
                color: colors.textPrimary,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lesson.title}
            </div>
            <div style={{ fontSize: fs.xs, color: colors.textMuted }}>
              Task {currentTask + 1}/{lesson.tasks.length}
            </div>
          </div>
          <div
            style={{
              fontSize: fs.xs,
              color: isISE ? colors.accentSecondary : colors.accentPrimary,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
              border: `1px solid ${isISE ? colors.borderAccentIse : colors.borderBase}`,
            }}
          >
            {isISE ? "ISE" : "Console"}
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <>
            <div
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                zIndex: 100,
              }}
            />
            <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "80%", maxWidth: 320, zIndex: 101 }}>
              <Sidebar
                lessons={LESSONS}
                currentLesson={currentLesson}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                completedCount={completedCount}
                collapsed={false}
                onToggle={() => setMobileSidebarOpen(false)}
                onGoToLesson={goToLesson}
                onResetProgress={handleResetProgress}
                isMobile={true}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* Active panel content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {mobilePanel === "lesson" && (
            <LessonPanel
              lesson={lesson}
              task={task}
              currentTask={currentTask}
              currentLesson={currentLesson}
              currentTaskComplete={currentTaskComplete}
              attempts={currentAttempts}
              revealedHintLevel={revealedHintLevel}
              onRevealHint={(level) => setRevealedHintLevel(level)}
              onAdvanceTask={advanceTask}
              onGoToTask={goToTask}
              isTaskComplete={isTaskComplete}
              lessonsLength={LESSONS.length}
              isMobile={true}
            />
          )}
          {mobilePanel === "editor" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {isISE ? (
                <IseEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  commandHistory={commandHistory}
                  tree={VIRTUAL_TREE}
                  isMobile={true}
                />
              ) : (
                <ReplEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  commandHistory={commandHistory}
                  historyIndex={historyIndex}
                  onHistoryIndexChange={setHistoryIndex}
                  tree={VIRTUAL_TREE}
                  isMobile={true}
                />
              )}
            </div>
          )}
          {mobilePanel === "tree" && (
            <TreePanel tree={VIRTUAL_TREE} isMobile={true} />
          )}
        </div>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeTab={mobilePanel}
          onTabChange={setMobilePanel}
          showTreeTab={true}
        />
      </div>
    );
  }

  // --- DESKTOP / TABLET LAYOUT ---
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        fontFamily: fonts.sans,
        background: colors.bgBase,
        color: colors.textPrimary,
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* SIDEBAR */}
      <Sidebar
        lessons={LESSONS}
        currentLesson={currentLesson}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        completedCount={completedCount}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onGoToLesson={goToLesson}
        onResetProgress={handleResetProgress}
      />

      {/* MAIN CONTENT AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 48,
            background: colors.bgPanel,
            borderBottom: `1px solid ${colors.borderBase}`,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: fontSizes.body, color: colors.textSecondary }}>
            <span style={{ color: colors.accentPrimary, fontWeight: 600 }}>
              {lesson.module}
            </span>
            <span style={{ margin: "0 8px", color: colors.borderDim }}>/</span>
            <span style={{ color: colors.textPrimary }}>{lesson.title}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setLayoutStacked(!layoutStacked)}
            title={layoutStacked ? "Switch to side-by-side layout" : "Switch to stacked layout"}
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderMedium}`,
              color: colors.textSecondary,
              padding: "5px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: fontSizes.base,
              fontFamily: "inherit",
            }}
          >
            {layoutStacked ? "⬌ Side-by-side" : "⬍ Stacked"}
          </button>
          <div
            style={{
              fontSize: fontSizes.sm,
              color: isISE ? colors.accentSecondary : colors.accentPrimary,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
              border: `1px solid ${isISE ? colors.borderAccentIse : colors.borderBase}`,
            }}
          >
            {isISE ? "ISE" : "Console"}
          </div>
          <div
            style={{
              fontSize: fontSizes.sm,
              color: colors.textMuted,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
            }}
          >
            Task {currentTask + 1} of {lesson.tasks.length}
          </div>
        </div>

        {/* Split pane — stacked or side-by-side */}
        {layoutStacked ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* TOP — Tabbed panel (Lesson / Content Tree) */}
            <div ref={lessonPanelRef}>
              {/* Tab bar */}
              {!lessonPanelCollapsed && (
                <div
                  style={{
                    height: 36,
                    display: "flex",
                    background: colors.bgPanel,
                    borderBottom: `1px solid ${colors.borderBase}`,
                    flexShrink: 0,
                  }}
                >
                  {(["lesson", "tree"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActivePanel(tab)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        borderBottom: activePanel === tab
                          ? `2px solid ${colors.accentPrimary}`
                          : "2px solid transparent",
                        color: activePanel === tab ? colors.textPrimary : colors.textSecondary,
                        fontWeight: activePanel === tab ? 600 : 400,
                        fontSize: fontSizes.sm,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        padding: "0 12px",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab === "lesson" ? "📖 Lesson" : "🌲 Content Tree"}
                    </button>
                  ))}
                </div>
              )}

              {/* Panel content */}
              {activePanel === "lesson" ? (
                <LessonPanel
                  lesson={lesson}
                  task={task}
                  currentTask={currentTask}
                  currentLesson={currentLesson}
                  currentTaskComplete={currentTaskComplete}
                  attempts={currentAttempts}
                  revealedHintLevel={revealedHintLevel}
                  onRevealHint={(level) => setRevealedHintLevel(level)}
                  onAdvanceTask={advanceTask}
                  onGoToTask={goToTask}
                  isTaskComplete={isTaskComplete}
                  lessonsLength={LESSONS.length}
                  collapsed={lessonPanelCollapsed}
                  onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
                  height={lessonPanelCollapsed ? undefined : lessonPanelHeight}
                />
              ) : (
                <div style={{ height: lessonPanelCollapsed ? undefined : lessonPanelHeight, overflow: "auto" }}>
                  <TreePanel tree={VIRTUAL_TREE} embedded />
                </div>
              )}
            </div>

            {/* Resize handle (hidden when collapsed) */}
            {!lessonPanelCollapsed && (
              <div
                onMouseDown={handleLessonDragStart}
                style={{
                  height: 6,
                  background: colors.borderBase,
                  cursor: "row-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgResizeHover)}
                onMouseLeave={(e) => {
                  if (!isDraggingLessonPanel.current)
                    e.currentTarget.style.background = colors.borderBase;
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 2,
                    background: colors.borderDim,
                    borderRadius: 1,
                  }}
                />
              </div>
            )}

            {/* BOTTOM — Editor + Console */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
              {isISE ? (
                <IseEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  commandHistory={commandHistory}
                  tree={VIRTUAL_TREE}
                  initialEditorHeight={initialPrefs.editorHeight}
                  onEditorHeightChange={(h) => {
                    editorHeightRef.current = h;
                    saveUIPreferences({
                      layoutStacked,
                      lessonPanelHeightPercent: Math.round(
                        ((lessonPanelHeight / (lessonPanelRef.current?.parentElement?.getBoundingClientRect().height || 1)) * 100)
                      ),
                      editorHeight: h,
                      activePanel,
                      lessonPanelCollapsed,
                    });
                  }}
                />
              ) : (
                <ReplEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  commandHistory={commandHistory}
                  historyIndex={historyIndex}
                  onHistoryIndexChange={setHistoryIndex}
                  tree={VIRTUAL_TREE}
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* LEFT — Tabbed panel (Lesson / Content Tree) */}
            {!lessonPanelCollapsed ? (
              <div
                style={{
                  width: "40%",
                  display: "flex",
                  flexDirection: "column",
                  borderRight: `1px solid ${colors.borderBase}`,
                  overflow: "hidden",
                  transition: "width 0.25s ease",
                }}
              >
                {/* Tab bar */}
                <div
                  style={{
                    height: 36,
                    display: "flex",
                    background: colors.bgPanel,
                    borderBottom: `1px solid ${colors.borderBase}`,
                    flexShrink: 0,
                  }}
                >
                  {(["lesson", "tree"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActivePanel(tab)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        borderBottom: activePanel === tab
                          ? `2px solid ${colors.accentPrimary}`
                          : "2px solid transparent",
                        color: activePanel === tab ? colors.textPrimary : colors.textSecondary,
                        fontWeight: activePanel === tab ? 600 : 400,
                        fontSize: fontSizes.sm,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        padding: "0 12px",
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                    >
                      {tab === "lesson" ? "📖 Lesson" : "🌲 Content Tree"}
                    </button>
                  ))}
                </div>

                {/* Panel content */}
                <div style={{ flex: 1, overflow: "auto" }}>
                  {activePanel === "lesson" ? (
                    <LessonPanel
                      lesson={lesson}
                      task={task}
                      currentTask={currentTask}
                      currentLesson={currentLesson}
                      currentTaskComplete={currentTaskComplete}
                      attempts={currentAttempts}
                      revealedHintLevel={revealedHintLevel}
                      onRevealHint={(level) => setRevealedHintLevel(level)}
                      onAdvanceTask={advanceTask}
                      onGoToTask={goToTask}
                      isTaskComplete={isTaskComplete}
                      lessonsLength={LESSONS.length}
                      collapsed={lessonPanelCollapsed}
                      onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
                    />
                  ) : (
                    <TreePanel tree={VIRTUAL_TREE} embedded />
                  )}
                </div>
              </div>
            ) : (
              <LessonPanel
                lesson={lesson}
                task={task}
                currentTask={currentTask}
                currentLesson={currentLesson}
                currentTaskComplete={currentTaskComplete}
                attempts={currentAttempts}
                revealedHintLevel={revealedHintLevel}
                onRevealHint={(level) => setRevealedHintLevel(level)}
                onAdvanceTask={advanceTask}
                onGoToTask={goToTask}
                isTaskComplete={isTaskComplete}
                lessonsLength={LESSONS.length}
                sideBySide={true}
                collapsed={true}
                onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
              />
            )}

            {/* RIGHT — Editor + Console */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              {isISE ? (
                <IseEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  tree={VIRTUAL_TREE}
                  initialEditorHeight={initialPrefs.editorHeight}
                  onEditorHeightChange={(h) => {
                    editorHeightRef.current = h;
                    saveUIPreferences({
                      layoutStacked,
                      lessonPanelHeightPercent: Math.round(
                        ((lessonPanelHeight / (lessonPanelRef.current?.parentElement?.getBoundingClientRect().height || 1)) * 100)
                      ),
                      editorHeight: h,
                      activePanel,
                      lessonPanelCollapsed,
                    });
                  }}
                />
              ) : (
                <ReplEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  commandHistory={commandHistory}
                  historyIndex={historyIndex}
                  onHistoryIndexChange={setHistoryIndex}
                  tree={VIRTUAL_TREE}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

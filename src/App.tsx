import { useState, useEffect, useCallback, useRef } from "react";
import type { ConsoleEntry } from "./types";
import type { PipelineStage } from "./builder/assembleCommand";
import { LESSONS } from "./lessons/loader";
import { VIRTUAL_TREE } from "./engine/virtualTree";
import { executeScript, executeCommand } from "./engine/executor";
import { ScriptContext } from "./engine/scriptContext";
import { validateTask } from "./validation/validator";
import { loadProgress, saveProgress, clearProgress } from "./hooks/useSessionProgress";
import { loadUIPreferences, saveUIPreferences, type ActivePanel } from "./hooks/useUIPreferences";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { Sidebar } from "./components/Sidebar";
import { LessonPanel } from "./components/LessonPanel";
import { ReplEditor } from "./components/ReplEditor";
import { IseEditor } from "./components/IseEditor";
import { BuilderEditor } from "./components/BuilderEditor";
import { EditorWithBuilderToggle } from "./components/EditorWithBuilderToggle";
import { TreePanel } from "./components/TreePanel";
import { MobileTabBar, type MobilePanel } from "./components/MobileTabBar";
import { colors, fonts, fontSizes, fontSizesMobile, applyTheme, getInitialThemeMode, type ThemeMode } from "./theme";
import { GlobalA11yStyles } from "./components/GlobalA11yStyles";

const initialProgress = loadProgress();
const initialPrefs = loadUIPreferences();
const initialTheme = getInitialThemeMode();
applyTheme(initialTheme);

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
  const [cwd, setCwd] = useState("/sitecore/content/Home");
  const [builderToggleActive, setBuilderToggleActive] = useState(false);
  const [builderStages, setBuilderStages] = useState<PipelineStage[]>([]);
  const [builderSelectedStageId, setBuilderSelectedStageId] = useState<string | null>(null);
  const [a11yAnnouncement, setA11yAnnouncement] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const sessionCtxRef = useRef(new ScriptContext());
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
  const isBuilder = lesson?.mode === "builder";
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

  const handleThemeToggle = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("spe-theme-mode", next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    clearProgress();
    setCurrentLesson(0);
    setCurrentTask(0);
    setCompletedTasks({});
    setTaskAttempts({});
    setSidebarCollapsed(false);
  }, []);

  const handleBuilderInsert = useCallback((command: string) => {
    if (isISE) {
      setCode((prev) => prev ? prev + "\n" + command + "\n" : command + "\n");
    } else {
      setCode(command);
    }
    setBuilderToggleActive(false);
  }, [isISE]);

  const handleReset = useCallback(() => {
    setConsoleOutput([]);
    sessionCtxRef.current = new ScriptContext();
    setCwd("/sitecore/content/Home");
    const t = LESSONS[currentLesson]?.tasks?.[currentTask];
    setCode(t?.starterCode || "# Write your script here\n");
  }, [currentLesson, currentTask]);

  // Reset editor, output, and cwd when switching lessons or tasks
  useEffect(() => {
    setConsoleOutput([]);
    setRevealedHintLevel(0);
    setBuilderToggleActive(false);
    setBuilderStages([]);
    setBuilderSelectedStageId(null);
    // Reset session context (cwd, variables) on lesson/task change
    sessionCtxRef.current = new ScriptContext();
    setCwd("/sitecore/content/Home");
    if (isBuilder) {
      setCode(""); // Builder drives code via onCodeChange
    } else if (isISE && task?.starterCode) {
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

    const currentCwd = sessionCtxRef.current.cwd;
    const cwdDisplay = `master:\\${currentCwd.replace(/^\/sitecore\//, "").replace(/\//g, "\\")}`;
    const newOutput: ConsoleEntry[] = (isISE || isBuilder)
      ? [...consoleOutput]
      : [...consoleOutput, { type: "command", text: effective.trim(), cwd: cwdDisplay }];

    if (isISE) {
      newOutput.push({ type: "script", text: effective.trim() });
    }

    // Execute using persistent session context (preserves cwd across commands)
    const ctx = sessionCtxRef.current;
    // Reset per-execution state but keep cwd
    ctx.outputs = [];
    ctx.errors = [];
    ctx.dialogRequests = [];
    ctx.variables = {};

    let result;
    if (isISE) {
      result = executeScript(effective, ctx);
    } else {
      const normalized = effective
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .join(" ");
      result = executeCommand(normalized, ctx);
    }

    // Sync cwd from context to React state (for prompt display)
    if (ctx.cwd !== cwd) {
      setCwd(ctx.cwd);
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
        setA11yAnnouncement(`Task completed: ${task.successMessage || "Correct!"}`);
        setTimeout(() => setA11yAnnouncement(""), 3000);
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
    if (!isISE && !isBuilder) {
      const historyEntry = effective.trim().split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
      setCommandHistory((prev) => [...prev, historyEntry]);
      setHistoryIndex(-1);
      setCode("");
    }
  }, [code, consoleOutput, currentLesson, currentTask, task, isISE, isBuilder]);

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

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mobileSidebarOpen]);

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
          minWidth: 320,
        }}
      >
        <GlobalA11yStyles />
        <a href="#main-content" className="skip-link">Skip to editor</a>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        {/* Mobile top bar */}
        <header
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
            aria-label="Open navigation"
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
              color: isBuilder ? colors.syntaxBrace : isISE ? colors.accentSecondary : colors.accentPrimary,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
              border: `1px solid ${isBuilder ? colors.syntaxBrace + "44" : isISE ? colors.borderAccentIse : colors.borderBase}`,
            }}
          >
            {isBuilder ? "Builder" : isISE ? "ISE" : "Console"}
          </div>
        </header>

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
                themeMode={themeMode}
                onThemeToggle={handleThemeToggle}
                isMobile={true}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* Active panel content */}
        <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
              {isBuilder ? (
                <BuilderEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  isMobile={true}
                  builderConfig={task?.builderConfig}
                />
              ) : (
                <EditorWithBuilderToggle
                  mode={isISE ? "ise" : "repl"}
                  builderActive={builderToggleActive}
                  onToggleBuilder={setBuilderToggleActive}
                  onInsertCode={handleBuilderInsert}
                  builderStages={builderStages}
                  onBuilderStagesChange={setBuilderStages}
                  builderSelectedStageId={builderSelectedStageId}
                  onBuilderSelectedStageIdChange={setBuilderSelectedStageId}
                  isMobile={true}
                  editorElement={isISE ? (
                    <IseEditor
                      code={code}
                      onCodeChange={setCode}
                      onRun={handleRun}
                      onClear={() => setConsoleOutput([])}
                      onReset={handleReset}
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
                      cwd={cwd}
                    />
                  )}
                />
              )}
            </div>
          )}
          {mobilePanel === "tree" && (
            <TreePanel tree={VIRTUAL_TREE} isMobile={true} />
          )}
        </main>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeTab={mobilePanel}
          onTabChange={setMobilePanel}
          showTreeTab={true}
        />

        {/* Screen reader announcements */}
        <div
          aria-live="assertive"
          role="status"
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
        >
          {a11yAnnouncement}
        </div>
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
      <GlobalA11yStyles />
      <a href="#main-content" className="skip-link">Skip to editor</a>
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
        themeMode={themeMode}
        onThemeToggle={handleThemeToggle}
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
        <header
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
            aria-label={layoutStacked ? "Switch to side-by-side layout" : "Switch to stacked layout"}
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
              color: isBuilder ? colors.syntaxBrace : isISE ? colors.accentSecondary : colors.accentPrimary,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
              border: `1px solid ${isBuilder ? colors.syntaxBrace + "44" : isISE ? colors.borderAccentIse : colors.borderBase}`,
            }}
          >
            {isBuilder ? "Builder" : isISE ? "ISE" : "Console"}
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
        </header>

        {/* Split pane — stacked or side-by-side */}
        {layoutStacked ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* TOP — Tabbed panel (Lesson / Content Tree) */}
            <div ref={lessonPanelRef}>
              {/* Tab bar */}
              {!lessonPanelCollapsed && (
                <div
                  role="tablist"
                  aria-label="Content panels"
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
                      role="tab"
                      aria-selected={activePanel === tab}
                      aria-controls={`tabpanel-${tab}`}
                      id={`tab-${tab}`}
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
                      <span aria-hidden="true">{tab === "lesson" ? "📖 " : "🌲 "}</span>
                      {tab === "lesson" ? "Lesson" : "Content Tree"}
                    </button>
                  ))}
                </div>
              )}

              {/* Panel content */}
              {activePanel === "lesson" ? (
                <div role="tabpanel" id="tabpanel-lesson" aria-labelledby="tab-lesson">
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
                </div>
              ) : (
                <div role="tabpanel" id="tabpanel-tree" aria-labelledby="tab-tree" style={{ height: lessonPanelCollapsed ? undefined : lessonPanelHeight, overflow: "auto" }}>
                  <TreePanel tree={VIRTUAL_TREE} embedded />
                </div>
              )}
            </div>

            {/* Resize handle (hidden when collapsed) */}
            {!lessonPanelCollapsed && (
              <div
                role="separator"
                aria-label="Resize lesson panel"
                tabIndex={0}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 50 : 10;
                  if (e.key === "ArrowUp") { e.preventDefault(); setLessonPanelHeight((h) => Math.max(80, h - step)); }
                  if (e.key === "ArrowDown") { e.preventDefault(); setLessonPanelHeight((h) => { const container = lessonPanelRef.current?.parentElement; const max = container ? container.getBoundingClientRect().height * 0.5 : 500; return Math.min(max, h + step); }); }
                }}
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
            <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
              {isBuilder ? (
                <BuilderEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  builderConfig={task?.builderConfig}
                />
              ) : (
                <EditorWithBuilderToggle
                  mode={isISE ? "ise" : "repl"}
                  builderActive={builderToggleActive}
                  onToggleBuilder={setBuilderToggleActive}
                  onInsertCode={handleBuilderInsert}
                  builderStages={builderStages}
                  onBuilderStagesChange={setBuilderStages}
                  builderSelectedStageId={builderSelectedStageId}
                  onBuilderSelectedStageIdChange={setBuilderSelectedStageId}
                  editorElement={isISE ? (
                    <IseEditor
                      code={code}
                      onCodeChange={setCode}
                      onRun={handleRun}
                      onClear={() => setConsoleOutput([])}
                      onReset={handleReset}
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
                      cwd={cwd}
                    />
                  )}
                />
              )}
            </main>
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
                  role="tablist"
                  aria-label="Content panels"
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
                      role="tab"
                      aria-selected={activePanel === tab}
                      aria-controls={`tabpanel-sbs-${tab}`}
                      id={`tab-sbs-${tab}`}
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
                      <span aria-hidden="true">{tab === "lesson" ? "📖 " : "🌲 "}</span>
                      {tab === "lesson" ? "Lesson" : "Content Tree"}
                    </button>
                  ))}
                </div>

                {/* Panel content */}
                <div style={{ flex: 1, overflow: "auto" }}>
                  {activePanel === "lesson" ? (
                    <div role="tabpanel" id="tabpanel-sbs-lesson" aria-labelledby="tab-sbs-lesson" style={{ height: "100%" }}>
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
                    </div>
                  ) : (
                    <div role="tabpanel" id="tabpanel-sbs-tree" aria-labelledby="tab-sbs-tree" style={{ height: "100%" }}>
                      <TreePanel tree={VIRTUAL_TREE} embedded />
                    </div>
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
            <main
              id="main-content"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              {isBuilder ? (
                <BuilderEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  builderConfig={task?.builderConfig}
                />
              ) : (
                <EditorWithBuilderToggle
                  mode={isISE ? "ise" : "repl"}
                  builderActive={builderToggleActive}
                  onToggleBuilder={setBuilderToggleActive}
                  onInsertCode={handleBuilderInsert}
                  builderStages={builderStages}
                  onBuilderStagesChange={setBuilderStages}
                  builderSelectedStageId={builderSelectedStageId}
                  onBuilderSelectedStageIdChange={setBuilderSelectedStageId}
                  editorElement={isISE ? (
                    <IseEditor
                      code={code}
                      onCodeChange={setCode}
                      onRun={handleRun}
                      onClear={() => setConsoleOutput([])}
                      onReset={handleReset}
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
                      cwd={cwd}
                    />
                  )}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {/* Screen reader announcements */}
      <div
        aria-live="assertive"
        role="status"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
      >
        {a11yAnnouncement}
      </div>
    </div>
  );
}

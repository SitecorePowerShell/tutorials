import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ConsoleEntry, QuizResult } from "./types";
import type { PipelineStage } from "./builder/assembleCommand";
import { LESSONS } from "./lessons/loader";
import { QUIZZES, getQuizForModule } from "./quizzes/loader";
import { validateTask } from "./validation/validator";
import { LocalProvider } from "./providers/LocalProvider";
import { SpeRemotingProvider } from "./providers/SpeRemotingProvider";
import type { ExecutionProvider, ConnectionConfig, ConnectionTestResult } from "./providers/types";
import { loadProgress, saveProgress, clearProgress } from "./hooks/useSessionProgress";
import { loadUIPreferences, saveUIPreferences, type ActivePanel } from "./hooks/useUIPreferences";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { Sidebar } from "./components/Sidebar";
import { LessonPanel } from "./components/LessonPanel";
import { QuizPanel } from "./components/QuizPanel";
import { ReplEditor } from "./components/ReplEditor";
import { IseEditor } from "./components/IseEditor";
import { BuilderEditor } from "./components/BuilderEditor";
import { EditorWithBuilderToggle } from "./components/EditorWithBuilderToggle";
import { TreePanel } from "./components/TreePanel";
import { MobileTabBar, type MobilePanel } from "./components/MobileTabBar";
import { colors, fonts, fontSizes, fontSizesMobile, applyTheme, getInitialThemeMode, type ThemeMode } from "./theme";
import { GlobalA11yStyles } from "./components/GlobalA11yStyles";
import { LandingPage } from "./components/LandingPage";
import { VirtualTour, DESKTOP_STEPS, MOBILE_STEPS } from "./components/VirtualTour";
import { useTourState } from "./hooks/useTourState";
import { HelpPanel } from "./components/HelpPanel";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ConnectionManager } from "./components/ConnectionManager";
import { CheatSheetDrawer } from "./components/CheatSheetDrawer";

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
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>(initialProgress.quizResults);
  const [helpPanelCmdlet, setHelpPanelCmdlet] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionTestResult | null>(null);
  const tour = useTourState();
  const providerRef = useRef<ExecutionProvider>(new LocalProvider());
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

  // Provide tree for TreePanel — wraps provider's tree in expected shape
  const treeForPanel = useMemo(
    () => ({ sitecore: providerRef.current.getTree() }),
    [connectionConfig]
  );
  const totalTasks = LESSONS.reduce((sum, l) => sum + l.tasks.length, 0);
  const completedCount = Object.keys(completedTasks).length;
  const showLanding = currentLesson === -1;
  const activeQuizData = activeQuiz ? QUIZZES.find((q) => q.id === activeQuiz) : undefined;

  // Determine if the current lesson is the last in its module and a quiz is available
  const quizNextLabel = (() => {
    if (!lesson) return undefined;
    const nextIdx = currentLesson + 1;
    const isLastInModule = nextIdx >= LESSONS.length || LESSONS[nextIdx].module !== lesson.module;
    if (!isLastInModule) return undefined;
    const quiz = getQuizForModule(lesson.module);
    if (!quiz || quizResults[quiz.id]?.completed) return undefined;
    return "Take Module Quiz →";
  })();

  // Persist progress to localStorage
  useEffect(() => {
    saveProgress({
      currentLesson,
      currentTask,
      completedTasks,
      taskAttempts,
      sidebarCollapsed,
      quizResults,
    });
  }, [currentLesson, currentTask, completedTasks, taskAttempts, sidebarCollapsed, quizResults]);

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

  const handleGetStarted = useCallback(() => {
    setCurrentLesson(0);
    setCurrentTask(0);
    // Prompt "Would you like a tour?" for first-time visitors
    setTimeout(() => tour.promptTour(), 400);
  }, []);

  const handleResetProgress = useCallback(() => {
    clearProgress();
    setCurrentLesson(-1);
    setCurrentTask(0);
    setCompletedTasks({});
    setTaskAttempts({});
    setSidebarCollapsed(false);
    setQuizResults({});
    setActiveQuiz(null);
  }, []);

  const handleBuilderInsert = useCallback((command: string) => {
    if (isISE) {
      setCode((prev) => prev ? prev + "\n" + command + "\n" : command + "\n");
    } else {
      setCode(command);
    }
    setBuilderToggleActive(false);
  }, [isISE]);

  // Switch provider when connection config changes
  useEffect(() => {
    if (connectionConfig) {
      providerRef.current = new SpeRemotingProvider(connectionConfig);
    } else {
      providerRef.current = new LocalProvider();
      setConnectionInfo(null);
    }
    setCwd(providerRef.current.getCwd());
  }, [connectionConfig]);

  // Async connect handler — tests connection before switching provider
  const handleConnect = useCallback(async (config: ConnectionConfig): Promise<ConnectionTestResult> => {
    const provider = new SpeRemotingProvider(config);
    const result = await provider.testConnection();
    if (result.connected) {
      setConnectionConfig(config);
      setConnectionInfo(result);
    }
    return result;
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionConfig(null);
  }, []);

  const handleReset = useCallback(() => {
    setConsoleOutput([]);
    providerRef.current.reset();
    setCwd(providerRef.current.getCwd());
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
    // Reset provider state (cwd, variables) on lesson/task change
    providerRef.current.reset();
    setCwd(providerRef.current.getCwd());
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
    if (isExecuting) return;
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

    const provider = providerRef.current;
    const currentCwd = provider.getCwd();
    const cwdDisplay = `master:\\${currentCwd.replace(/^\/sitecore\//, "").replace(/\//g, "\\")}`;

    // Build command echo entries synchronously
    const echoEntries: ConsoleEntry[] = [];
    if (!isISE && !isBuilder) {
      echoEntries.push({ type: "command", text: effective.trim(), cwd: cwdDisplay });
    }
    if (isISE) {
      echoEntries.push({ type: "script", text: effective.trim() });
    }

    // Normalize for REPL mode
    const scriptToRun = isISE
      ? effective
      : effective
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#"))
          .join(" ");

    // Execute via provider (async — supports both local and remote)
    setIsExecuting(true);
    const executePromise = isISE
      ? provider.executeScript(scriptToRun)
      : provider.executeCommand(scriptToRun);

    executePromise
      .then((providerResult) => {
        let newOutput: ConsoleEntry[] = [
          ...consoleOutput,
          ...echoEntries,
          ...providerResult.entries,
        ];

        // Sync cwd from provider
        if (providerResult.cwd && providerResult.cwd !== cwd) {
          setCwd(providerResult.cwd);
        }

        // Validate against current task (always uses local engine)
        if (task) {
          const validation = validateTask(effective.trim(), task);
          if (validation.passed) {
            newOutput.push({
              type: "success",
              text: `✓ ${task.successMessage || "Correct!"}`,
            });
            setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
            setA11yAnnouncement(
              `Task completed: ${task.successMessage || "Correct!"}`
            );
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

        // Prune old entries to prevent unbounded growth
        const MAX_ENTRIES = 500;
        if (newOutput.length > MAX_ENTRIES) {
          newOutput = newOutput.slice(newOutput.length - MAX_ENTRIES);
        }
        setConsoleOutput(newOutput);
        if (!isISE && !isBuilder) {
          const historyEntry = effective
            .trim()
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .join(" ");
          setCommandHistory((prev) => [...prev, historyEntry]);
          setHistoryIndex(-1);
          setCode("");
        }
      })
      .catch((err) => {
        setConsoleOutput((prev) => [
          ...prev,
          ...echoEntries,
          {
            type: "error",
            text: `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      })
      .finally(() => {
        setIsExecuting(false);
      });
  }, [code, consoleOutput, currentLesson, currentTask, task, isISE, isBuilder, isExecuting, cwd]);

  const advanceTask = () => {
    if (currentTask < lesson.tasks.length - 1) {
      setCurrentTask(currentTask + 1);
    } else {
      // Last task in lesson — check if this is the last lesson in the module
      // and a quiz is available
      const currentModule = lesson.module;
      const nextLessonIdx = currentLesson + 1;
      const isLastInModule =
        nextLessonIdx >= LESSONS.length ||
        LESSONS[nextLessonIdx].module !== currentModule;

      if (isLastInModule) {
        const quiz = getQuizForModule(currentModule);
        if (quiz && !quizResults[quiz.id]?.completed) {
          setActiveQuiz(quiz.id);
          return;
        }
      }

      if (currentLesson < LESSONS.length - 1) {
        setCurrentLesson(currentLesson + 1);
        setCurrentTask(0);
      }
    }
  };

  const goToLesson = (idx: number) => {
    setCurrentLesson(idx);
    setCurrentTask(0);
    setActiveQuiz(null);
    if (isMobile) {
      setMobileSidebarOpen(false);
      setMobilePanel("lesson");
    }
  };

  const goToQuiz = (quizId: string) => {
    setActiveQuiz(quizId);
    if (isMobile) {
      setMobileSidebarOpen(false);
      setMobilePanel("lesson");
    }
  };

  const handleQuizComplete = useCallback((result: QuizResult) => {
    if (!activeQuiz) return;
    setQuizResults((prev) => ({ ...prev, [activeQuiz]: result }));
  }, [activeQuiz]);

  const handleQuizSkip = useCallback(() => {
    // Navigate to the first lesson of the next module
    if (activeQuiz) {
      const quiz = QUIZZES.find((q) => q.id === activeQuiz);
      if (quiz) {
        const nextModuleLesson = LESSONS.findIndex(
          (l, i) => i > 0 && l.module !== quiz.module && LESSONS[i - 1]?.module === quiz.module
        );
        if (nextModuleLesson >= 0) {
          setCurrentLesson(nextModuleLesson);
          setCurrentTask(0);
        }
      }
    }
    setActiveQuiz(null);
  }, [activeQuiz]);

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

  // Toggle keyboard shortcuts with ? key (only when not focused on an input)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // --- LANDING PAGE ---
  if (showLanding) {
    return (
      <div
        style={{
          height: isMobile ? "100dvh" : "100vh",
          width: "100vw",
          fontFamily: fonts.sans,
          background: colors.bgBase,
          color: colors.textPrimary,
          overflow: "hidden",
        }}
      >
        <GlobalA11yStyles />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <LandingPage
          onGetStarted={handleGetStarted}
          isMobile={isMobile}
          themeMode={themeMode}
          onThemeToggle={handleThemeToggle}
        />
      </div>
    );
  }

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
            data-tour="mobile-menu"
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
              {activeQuizData ? activeQuizData.title : lesson.title}
            </div>
            <div style={{ fontSize: fs.xs, color: colors.textMuted }}>
              {activeQuizData ? activeQuizData.module : `Task ${currentTask + 1}/${lesson.tasks.length}`}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <ConnectionManager
              isConnected={!!connectionConfig}
              connectionInfo={connectionInfo}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isExecuting={isExecuting}
            />
          </div>
          <button
            onClick={() => setCheatSheetOpen(true)}
            aria-label="Open cheat sheet"
            style={{
              background: "none",
              border: "none",
              color: colors.textSecondary,
              fontSize: 18,
              cursor: "pointer",
              padding: 8,
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            📋
          </button>
          <div
            style={{
              fontSize: fs.xs,
              color: activeQuizData ? colors.statusHint : isBuilder ? colors.syntaxBrace : isISE ? colors.accentSecondary : colors.accentPrimary,
              padding: "4px 10px",
              background: colors.bgOverlay,
              borderRadius: 4,
              border: `1px solid ${activeQuizData ? colors.statusHint + "44" : isBuilder ? colors.syntaxBrace + "44" : isISE ? colors.borderAccentIse : colors.borderBase}`,
            }}
          >
            {activeQuizData ? "Quiz" : isBuilder ? "Builder" : isISE ? "ISE" : "Console"}
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
                quizzes={QUIZZES}
                quizResults={quizResults}
                onGoToQuiz={goToQuiz}
                activeQuiz={activeQuiz}
              />
            </div>
          </>
        )}

        {/* Active panel content — use CSS display toggling instead of conditional
            rendering so components stay mounted and preserve state (e.g. builder stages) */}
        <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, display: mobilePanel === "lesson" ? "flex" : "none", flexDirection: "column", overflow: "hidden" }}>
            {activeQuizData ? (
              <QuizPanel
                quiz={activeQuizData}
                existingResult={quizResults[activeQuizData.id]}
                onComplete={handleQuizComplete}
                onSkip={handleQuizSkip}
                isMobile={true}
              />
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
                nextLabel={quizNextLabel}
                isMobile={true}
              />
            )}
          </div>
          <div data-tour="editor" style={{ flex: 1, display: mobilePanel === "editor" ? "flex" : "none", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            {isBuilder ? (
              <BuilderEditor
                code={code}
                onCodeChange={setCode}
                onRun={handleRun}
                onClear={() => setConsoleOutput([])}
                consoleOutput={consoleOutput}
                isMobile={true}
                builderConfig={task?.builderConfig}
                onShowHelp={setHelpPanelCmdlet}
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
                onShowHelp={setHelpPanelCmdlet}
                editorElement={isISE ? (
                  <IseEditor
                    code={code}
                    onCodeChange={setCode}
                    onRun={handleRun}
                    onClear={() => setConsoleOutput([])}
                    onReset={handleReset}
                    consoleOutput={consoleOutput}
                    commandHistory={commandHistory}
                    tree={treeForPanel}
                    isMobile={true}
                    onShowHelp={setHelpPanelCmdlet}
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
                    tree={treeForPanel}
                    isMobile={true}
                    cwd={cwd}
                    onShowHelp={setHelpPanelCmdlet}
                  />
                )}
              />
            )}
          </div>
          <div style={{ flex: 1, display: mobilePanel === "tree" ? "flex" : "none", flexDirection: "column", overflow: "hidden" }}>
            <TreePanel tree={treeForPanel} isMobile={true} />
          </div>
        </main>

        {/* Bottom tab bar */}
        <div data-tour="mobile-tabs">
          <MobileTabBar
            activeTab={mobilePanel}
            onTabChange={setMobilePanel}
            showTreeTab={true}
          />
        </div>

        {/* Help panel overlay */}
        {helpPanelCmdlet && (
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }}>
            <div
              onClick={() => setHelpPanelCmdlet(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70vh", display: "flex", flexDirection: "column", background: colors.bgPanel, borderTop: `1px solid ${colors.borderBase}`, borderRadius: "12px 12px 0 0" }}>
              <HelpPanel
                cmdletName={helpPanelCmdlet}
                onClose={() => setHelpPanelCmdlet(null)}
                onNavigate={setHelpPanelCmdlet}
                isMobile={true}
              />
            </div>
          </div>
        )}

        {/* Cheat sheet drawer (mobile) */}
        <CheatSheetDrawer
          open={cheatSheetOpen}
          onClose={() => setCheatSheetOpen(false)}
          isMobile={true}
          lessonId={lesson?.id}
        />

        {/* Virtual tour */}
        <VirtualTour
          phase={tour.phase}
          currentStep={tour.currentStep}
          isMobile={true}
          onAccept={tour.acceptTour}
          onDismiss={tour.dismissTour}
          onNext={() => tour.nextStep(MOBILE_STEPS.length)}
          onPrev={tour.prevStep}
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
      <div data-tour="sidebar">
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
          onStartTour={tour.startTour}
          quizzes={QUIZZES}
          quizResults={quizResults}
          onGoToQuiz={goToQuiz}
          activeQuiz={activeQuiz}
        />
      </div>

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
              {activeQuizData ? activeQuizData.module : lesson.module}
            </span>
            <span style={{ margin: "0 8px", color: colors.borderDim }}>/</span>
            <span style={{ color: colors.textPrimary }}>
              {activeQuizData ? activeQuizData.title : lesson.title}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <ConnectionManager
              isConnected={!!connectionConfig}
              connectionInfo={connectionInfo}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isExecuting={isExecuting}
            />
          </div>
          {!activeQuizData && (
            <>
              <button
                onClick={() => setCheatSheetOpen((v) => !v)}
                aria-label="Toggle cheat sheet"
                aria-pressed={cheatSheetOpen}
                title="Cheat sheet (quick reference)"
                style={{
                  background: cheatSheetOpen ? colors.bgActive : "transparent",
                  border: `1px solid ${colors.borderMedium}`,
                  color: colors.textSecondary,
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: fontSizes.base,
                  fontFamily: "inherit",
                }}
              >
                📋 Cheat sheet
              </button>
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
            </>
          )}
          {activeQuizData && (
            <div
              style={{
                fontSize: fontSizes.sm,
                color: colors.statusHint,
                padding: "4px 10px",
                background: colors.bgOverlay,
                borderRadius: 4,
                border: `1px solid ${colors.statusHint}44`,
              }}
            >
              Quiz
            </div>
          )}
        </header>

        {/* Quiz view or split pane */}
        {activeQuizData ? (
          <main id="main-content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <QuizPanel
              quiz={activeQuizData}
              existingResult={quizResults[activeQuizData.id]}
              onComplete={handleQuizComplete}
              onSkip={handleQuizSkip}
            />
          </main>
        ) : layoutStacked ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* TOP — Tabbed panel (Lesson / Content Tree) */}
            <div ref={lessonPanelRef} data-tour="lesson-panel">
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
                      data-tour={tab === "tree" ? "tree-tab" : undefined}
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
                    nextLabel={quizNextLabel}
                    collapsed={lessonPanelCollapsed}
                    onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
                    height={lessonPanelCollapsed ? undefined : lessonPanelHeight}
                  />
                </div>
              ) : (
                <div role="tabpanel" id="tabpanel-tree" aria-labelledby="tab-tree" style={{ height: lessonPanelCollapsed ? undefined : lessonPanelHeight, overflow: "auto" }}>
                  <TreePanel tree={treeForPanel} embedded />
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
            <main id="main-content" data-tour="editor" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
              {isBuilder ? (
                <BuilderEditor
                  code={code}
                  onCodeChange={setCode}
                  onRun={handleRun}
                  onClear={() => setConsoleOutput([])}
                  consoleOutput={consoleOutput}
                  builderConfig={task?.builderConfig}
                  onShowHelp={setHelpPanelCmdlet}
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
                  onShowHelp={setHelpPanelCmdlet}
                  editorElement={isISE ? (
                    <IseEditor
                      code={code}
                      onCodeChange={setCode}
                      onRun={handleRun}
                      onClear={() => setConsoleOutput([])}
                      onReset={handleReset}
                      consoleOutput={consoleOutput}
                      commandHistory={commandHistory}
                      tree={treeForPanel}
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
                      onShowHelp={setHelpPanelCmdlet}
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
                      tree={treeForPanel}
                      cwd={cwd}
                      onShowHelp={setHelpPanelCmdlet}
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
                data-tour="lesson-panel"
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
                      data-tour={tab === "tree" ? "tree-tab" : undefined}
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
                    <div role="tabpanel" id="tabpanel-sbs-lesson" aria-labelledby="tab-sbs-lesson">
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
                        nextLabel={quizNextLabel}
                        collapsed={lessonPanelCollapsed}
                        onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
                      />
                    </div>
                  ) : (
                    <div role="tabpanel" id="tabpanel-sbs-tree" aria-labelledby="tab-sbs-tree" style={{ height: "100%" }}>
                      <TreePanel tree={treeForPanel} embedded />
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
                nextLabel={quizNextLabel}
                sideBySide={true}
                collapsed={true}
                onToggleCollapse={() => setLessonPanelCollapsed(!lessonPanelCollapsed)}
              />
            )}

            {/* RIGHT — Editor + Console */}
            <main
              id="main-content"
              data-tour="editor"
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
                  onShowHelp={setHelpPanelCmdlet}
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
                  onShowHelp={setHelpPanelCmdlet}
                  editorElement={isISE ? (
                    <IseEditor
                      code={code}
                      onCodeChange={setCode}
                      onRun={handleRun}
                      onClear={() => setConsoleOutput([])}
                      onReset={handleReset}
                      consoleOutput={consoleOutput}
                      tree={treeForPanel}
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
                      onShowHelp={setHelpPanelCmdlet}
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
                      tree={treeForPanel}
                      cwd={cwd}
                      onShowHelp={setHelpPanelCmdlet}
                    />
                  )}
                />
              )}
            </main>
          </div>
        )}
      </div>

      {/* Help panel overlay (desktop) */}
      {helpPanelCmdlet && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 350, zIndex: 90 }}>
          <HelpPanel
            cmdletName={helpPanelCmdlet}
            onClose={() => setHelpPanelCmdlet(null)}
            onNavigate={setHelpPanelCmdlet}
          />
        </div>
      )}

      {/* Virtual tour */}
      <VirtualTour
        phase={tour.phase}
        currentStep={tour.currentStep}
        isMobile={false}
        onAccept={tour.acceptTour}
        onDismiss={tour.dismissTour}
        onNext={() => tour.nextStep(DESKTOP_STEPS.length)}
        onPrev={tour.prevStep}
      />

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Cheat sheet drawer */}
      <CheatSheetDrawer
        open={cheatSheetOpen}
        onClose={() => setCheatSheetOpen(false)}
        lessonId={lesson?.id}
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

import { useState, useEffect, useCallback } from "react";
import type { ConsoleEntry } from "./types";
import { LESSONS } from "./lessons/loader";
import { VIRTUAL_TREE } from "./engine/virtualTree";
import { executeScript, executeCommand } from "./engine/executor";
import { validateTask } from "./validation/validator";
import { loadProgress, saveProgress, clearProgress } from "./hooks/useSessionProgress";
import { Sidebar } from "./components/Sidebar";
import { LessonPanel } from "./components/LessonPanel";
import { ReplEditor } from "./components/ReplEditor";
import { IseEditor } from "./components/IseEditor";
import { TreePanel } from "./components/TreePanel";
import { colors, fonts, fontSizes } from "./theme";

const initialProgress = loadProgress();

export default function SPETutorial() {
  const [currentLesson, setCurrentLesson] = useState(initialProgress.currentLesson);
  const [currentTask, setCurrentTask] = useState(initialProgress.currentTask);
  const [code, setCode] = useState("");
  const [consoleOutput, setConsoleOutput] = useState<ConsoleEntry[]>([]);
  const [completedTasks, setCompletedTasks] = useState<
    Record<string, boolean>
  >(initialProgress.completedTasks);
  const [showHint, setShowHint] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialProgress.sidebarCollapsed);
  const [showTreePanel, setShowTreePanel] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
      sidebarCollapsed,
    });
  }, [currentLesson, currentTask, completedTasks, sidebarCollapsed]);

  const handleResetProgress = useCallback(() => {
    clearProgress();
    setCurrentLesson(0);
    setCurrentTask(0);
    setCompletedTasks({});
    setSidebarCollapsed(false);
  }, []);

  // Reset editor and output when switching lessons or tasks
  useEffect(() => {
    setConsoleOutput([]);
    setShowHint(false);
    if (isISE && task?.starterCode) {
      setCode(task.starterCode);
    } else if (isISE) {
      setCode("# Write your script here\n");
    } else {
      setCode("");
    }
  }, [currentLesson, currentTask]);

  const handleRun = useCallback(() => {
    if (!code.trim()) return;
    const taskKey = `${currentLesson}-${currentTask}`;

    const newOutput: ConsoleEntry[] = isISE
      ? [...consoleOutput]
      : [...consoleOutput, { type: "command", text: code.trim() }];

    if (isISE) {
      newOutput.push({ type: "script", text: code.trim() });
    }

    // Execute
    let result;
    if (isISE) {
      result = executeScript(code);
    } else {
      const normalized = code
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
      const validation = validateTask(code.trim(), task);
      if (validation.passed) {
        newOutput.push({
          type: "success",
          text: `✓ ${task.successMessage || "Correct!"}`,
        });
        setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
      } else {
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
      setCommandHistory((prev) => [...prev, code.trim()]);
      setHistoryIndex(-1);
      setCode("");
    }
    setShowHint(false);
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
  };

  const goToTask = (taskIdx: number) => {
    setCurrentTask(taskIdx);
  };

  const isTaskComplete = (lessonIdx: number, taskIdx: number) =>
    !!completedTasks[`${lessonIdx}-${taskIdx}`];

  const currentTaskComplete = isTaskComplete(currentLesson, currentTask);

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
            onClick={() => setShowTreePanel(!showTreePanel)}
            style={{
              background: showTreePanel ? colors.bgActive : "transparent",
              border: `1px solid ${colors.borderMedium}`,
              color: showTreePanel ? colors.accentLink : colors.textSecondary,
              padding: "5px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: fontSizes.base,
              fontFamily: "inherit",
            }}
          >
            🌲 Content Tree
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

        {/* Split pane */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT — Lesson panel */}
          <LessonPanel
            lesson={lesson}
            task={task}
            currentTask={currentTask}
            currentLesson={currentLesson}
            currentTaskComplete={currentTaskComplete}
            showHint={showHint}
            showTreePanel={showTreePanel}
            onToggleHint={() => setShowHint(!showHint)}
            onAdvanceTask={advanceTask}
            onGoToTask={goToTask}
            isTaskComplete={isTaskComplete}
            lessonsLength={LESSONS.length}
          />

          {/* MIDDLE — Editor + Console (mode-aware) */}
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
              />
            )}
          </div>

          {/* RIGHT — Content Tree Panel (toggle) */}
          {showTreePanel && <TreePanel tree={VIRTUAL_TREE} />}
        </div>
      </div>
    </div>
  );
}

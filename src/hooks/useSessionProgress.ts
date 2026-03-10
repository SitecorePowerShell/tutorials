const STORAGE_KEY = "spe-tutorial-progress";
const CURRENT_VERSION = 2;

export interface SessionProgress {
  version: number;
  currentLesson: number;
  currentTask: number;
  completedTasks: Record<string, boolean>;
  taskAttempts: Record<string, number>;
  sidebarCollapsed: boolean;
}

const DEFAULTS: SessionProgress = {
  version: CURRENT_VERSION,
  currentLesson: 0,
  currentTask: 0,
  completedTasks: {},
  taskAttempts: {},
  sidebarCollapsed: false,
};

export function loadProgress(): SessionProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULTS };
    }
    // Migrate from version 1: preserve existing data, add taskAttempts
    if (parsed.version === 1) {
      return {
        version: CURRENT_VERSION,
        currentLesson:
          typeof parsed.currentLesson === "number" ? parsed.currentLesson : 0,
        currentTask:
          typeof parsed.currentTask === "number" ? parsed.currentTask : 0,
        completedTasks:
          typeof parsed.completedTasks === "object" && parsed.completedTasks
            ? parsed.completedTasks
            : {},
        taskAttempts: {},
        sidebarCollapsed: !!parsed.sidebarCollapsed,
      };
    }
    if (parsed.version !== CURRENT_VERSION) {
      return { ...DEFAULTS };
    }
    return {
      version: CURRENT_VERSION,
      currentLesson:
        typeof parsed.currentLesson === "number" ? parsed.currentLesson : 0,
      currentTask:
        typeof parsed.currentTask === "number" ? parsed.currentTask : 0,
      completedTasks:
        typeof parsed.completedTasks === "object" && parsed.completedTasks
          ? parsed.completedTasks
          : {},
      taskAttempts:
        typeof parsed.taskAttempts === "object" && parsed.taskAttempts
          ? parsed.taskAttempts
          : {},
      sidebarCollapsed: !!parsed.sidebarCollapsed,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveProgress(state: Omit<SessionProgress, "version">): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, version: CURRENT_VERSION })
      );
    } catch {
      // Silently ignore storage errors (quota, private browsing, etc.)
    }
  }, 500);
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

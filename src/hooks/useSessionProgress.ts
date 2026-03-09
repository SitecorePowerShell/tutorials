const STORAGE_KEY = "spe-tutorial-progress";
const CURRENT_VERSION = 1;

export interface SessionProgress {
  version: number;
  currentLesson: number;
  currentTask: number;
  completedTasks: Record<string, boolean>;
  sidebarCollapsed: boolean;
}

const DEFAULTS: SessionProgress = {
  version: CURRENT_VERSION,
  currentLesson: 0,
  currentTask: 0,
  completedTasks: {},
  sidebarCollapsed: false,
};

export function loadProgress(): SessionProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.version !== CURRENT_VERSION
    ) {
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

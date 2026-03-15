const UI_PREFS_KEY = "spe-tutorial-ui-prefs";
const CURRENT_VERSION = 3;

export type ActivePanel = "lesson" | "tree";

export interface UIPreferences {
  version: number;
  layoutStacked: boolean;
  lessonPanelHeightPercent: number;
  editorHeight: number;
  activePanel: ActivePanel;
  lessonPanelCollapsed: boolean;
}

const DEFAULTS: UIPreferences = {
  version: CURRENT_VERSION,
  layoutStacked: false,
  lessonPanelHeightPercent: 50,
  editorHeight: 250,
  activePanel: "lesson",
  lessonPanelCollapsed: false,
};

export function loadUIPreferences(): UIPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULTS };
    }
    if (parsed.version !== CURRENT_VERSION) {
      return { ...DEFAULTS };
    }
    return {
      version: CURRENT_VERSION,
      layoutStacked:
        typeof parsed.layoutStacked === "boolean"
          ? parsed.layoutStacked
          : DEFAULTS.layoutStacked,
      lessonPanelHeightPercent:
        typeof parsed.lessonPanelHeightPercent === "number"
          ? parsed.lessonPanelHeightPercent
          : DEFAULTS.lessonPanelHeightPercent,
      editorHeight:
        typeof parsed.editorHeight === "number"
          ? parsed.editorHeight
          : DEFAULTS.editorHeight,
      activePanel:
        parsed.activePanel === "lesson" || parsed.activePanel === "tree"
          ? parsed.activePanel
          : DEFAULTS.activePanel,
      lessonPanelCollapsed:
        typeof parsed.lessonPanelCollapsed === "boolean"
          ? parsed.lessonPanelCollapsed
          : DEFAULTS.lessonPanelCollapsed,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveUIPreferences(
  state: Omit<UIPreferences, "version">
): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        UI_PREFS_KEY,
        JSON.stringify({ ...state, version: CURRENT_VERSION })
      );
    } catch {
      // Silently ignore storage errors (quota, private browsing, etc.)
    }
  }, 500);
}

export type ThemeMode = "dark" | "light";

const darkColors = {
  bgBase: "#0d0d1a",
  bgPanel: "#0f0f24",
  bgSurface: "#0d0d1f",
  bgDeep: "#0a0a18",
  bgCard: "#12122a",
  bgCardSuccess: "#0d1f0d",
  bgHint: "#1a1508",
  bgOverlay: "#1a1a2e",
  bgActive: "#1a1a3a",
  bgHover: "#1e1e3a",
  bgResizeHover: "#2a2a5a",

  borderBase: "#1a1a35",
  borderLight: "#1a1a30",
  borderMedium: "#2a2a4a",
  borderDim: "#333355",
  borderSuccess: "#2e5e2e",
  borderAccentIse: "#3a2a6a",

  textPrimary: "#d4d4e8",
  textSecondary: "#a8a8c8",
  textMuted: "#9a9ab8",
  textDimmed: "#9090b0",
  textClear: "#a0a0c0",
  textSubtle: "#b0b0ca",
  textOutput: "#c0c0d8",
  textCode: "#c5c8d4",
  textWhite: "#fff",

  accentPrimary: "#7b8ad4",
  accentSecondary: "#7c4dff",
  accentTitle: "#8187dc",
  accentFolder: "#7986cb",
  accentLink: "#90caf9",

  statusSuccess: "#4caf50",
  statusSuccessLight: "#66bb6a",
  statusError: "#ef5350",
  statusWarning: "#ffa726",
  statusVerbose: "#8a8aaa",
  statusDebug: "#8a8aaa",
  statusInfo: "#64b5f6",
  statusHint: "#ffab40",
  statusHintDark: "#ff9100",

  syntaxString: "#a5d6a7",
  syntaxKeyword: "#90caf9",
  syntaxParam: "#ce93d8",
  syntaxPipe: "#ffcc80",
  syntaxVariable: "#ef9a9a",
  syntaxBrace: "#fff59d",
  syntaxComment: "#8abf75",
  syntaxOperator: "#80deea",
  syntaxType: "#4dd0e1",
  syntaxNumber: "#ffb74d",

  ghostText: "#8080a0",
  bracketMatch: "#2a2a5a",
  bracketUnmatched: "#5a2020",
};

const lightColors: typeof darkColors = {
  bgBase: "#f4f4fa",
  bgPanel: "#eaeaf4",
  bgSurface: "#f0f0f8",
  bgDeep: "#e6e6f0",
  bgCard: "#ffffff",
  bgCardSuccess: "#e8f5e9",
  bgHint: "#fff8e1",
  bgOverlay: "#e2e2ee",
  bgActive: "#d6d6ea",
  bgHover: "#dcdcea",
  bgResizeHover: "#c0c0d8",

  borderBase: "#c8c8dc",
  borderLight: "#d0d0e0",
  borderMedium: "#b0b0c8",
  borderDim: "#9898b0",
  borderSuccess: "#81c784",
  borderAccentIse: "#c8b8e8",

  textPrimary: "#1a1a30",
  textSecondary: "#3a3a58",
  textMuted: "#5a5a78",
  textDimmed: "#6a6a88",
  textClear: "#4a4a68",
  textSubtle: "#444464",
  textOutput: "#2a2a48",
  textCode: "#2d3040",
  textWhite: "#fff",

  accentPrimary: "#4a5aa8",
  accentSecondary: "#6a3acc",
  accentTitle: "#5060b0",
  accentFolder: "#5a68b0",
  accentLink: "#1a65c0",

  statusSuccess: "#388e3c",
  statusSuccessLight: "#4caf50",
  statusError: "#d32f2f",
  statusWarning: "#ef6c00",
  statusVerbose: "#6a6a88",
  statusDebug: "#6a6a88",
  statusInfo: "#1565c0",
  statusHint: "#f57c00",
  statusHintDark: "#e65100",

  syntaxString: "#2e7d32",
  syntaxKeyword: "#1565c0",
  syntaxParam: "#7b1fa2",
  syntaxPipe: "#bf5b00",
  syntaxVariable: "#c62828",
  syntaxBrace: "#6d6a00",
  syntaxComment: "#558b2f",
  syntaxOperator: "#00838f",
  syntaxType: "#00695c",
  syntaxNumber: "#e65100",

  ghostText: "#9898b0",
  bracketMatch: "#c8c8e8",
  bracketUnmatched: "#ffcdd2",
};

const darkGradients = {
  accent: "linear-gradient(135deg, #7b8ad4, #7c4dff)",
  progress: "linear-gradient(90deg, #7b8ad4, #7c4dff)",
};

const lightGradients: typeof darkGradients = {
  accent: "linear-gradient(135deg, #4a5aa8, #6a3acc)",
  progress: "linear-gradient(90deg, #4a5aa8, #6a3acc)",
};

// Mutable theme objects — mutated in place via applyTheme() so all
// module-level references (including constants built from colors at
// import time inside components) stay up-to-date on re-render.
export const colors: typeof darkColors = { ...darkColors };
export const gradients: typeof darkGradients = { ...darkGradients };

let _currentThemeMode: ThemeMode = "dark";

export function applyTheme(mode: ThemeMode) {
  _currentThemeMode = mode;
  Object.assign(colors, mode === "dark" ? darkColors : lightColors);
  Object.assign(gradients, mode === "dark" ? darkGradients : lightGradients);
}

export function isLightMode(): boolean {
  return _currentThemeMode === "light";
}

export function getInitialThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem("spe-theme-mode");
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* SSR / iframe sandbox */ }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export const fonts = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Code', monospace",
  monoFull: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
  monoShort: "'JetBrains Mono', monospace",
};

export const fontSizes = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 14,
  body: 14,
  lg: 15,
  xl: 16,
};

export const fontSizesMobile = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 14.5,
  body: 15,
  lg: 16,
  xl: 18,
};

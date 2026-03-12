import { colors } from "../theme";

export function GlobalA11yStyles() {
  const css = `
*:focus-visible {
  outline: 2px solid ${colors.accentPrimary};
  outline-offset: 2px;
}
*:focus:not(:focus-visible) {
  outline: none;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: 10000;
  padding: 8px 16px;
  background: ${colors.accentPrimary};
  color: #fff;
  font-size: 14px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
}
.skip-link:focus {
  position: fixed;
  left: 0;
  top: 0;
  width: auto;
  height: auto;
  overflow: visible;
}
.ise-editor-textarea::placeholder {
  color: ${colors.textMuted};
  opacity: 1;
}
`;
  return <style>{css}</style>;
}

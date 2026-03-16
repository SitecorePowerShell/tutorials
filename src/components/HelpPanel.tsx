import { useEffect, useRef } from "react";
import { getCmdletHelp, type CmdletHelp } from "../engine/cmdletHelp";
import { colors, fonts, fontSizes } from "../theme";

interface HelpPanelProps {
  cmdletName: string | null;
  onClose: () => void;
  onNavigate?: (cmdletName: string) => void;
  isMobile?: boolean;
}

export function HelpPanel({ cmdletName, onClose, onNavigate, isMobile }: HelpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const help = cmdletName ? getCmdletHelp(cmdletName) : null;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on click outside (desktop only — mobile uses backdrop)
  useEffect(() => {
    if (isMobile) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the triggering click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose, isMobile]);

  if (!help) return null;

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: fontSizes.xs,
    fontWeight: 600,
    color: colors.accentPrimary,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: 16,
    marginBottom: 6,
  };

  const codeBlockStyle: React.CSSProperties = {
    background: colors.bgDeep,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: 4,
    padding: "8px 10px",
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.textCode,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: "4px 0",
  };

  const handleRelatedClick = (name: string) => {
    if (onNavigate) onNavigate(name);
  };

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label={`Help for ${help.name}`}
      style={{
        ...(isMobile ? {} : {
          position: "absolute" as const,
          top: 0,
          right: 0,
          bottom: 0,
          width: 350,
          boxShadow: "-4px 0 12px rgba(0,0,0,0.2)",
        }),
        background: colors.bgPanel,
        borderLeft: isMobile ? "none" : `1px solid ${colors.borderBase}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${colors.borderBase}`,
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: fonts.mono, fontWeight: 600, color: colors.textPrimary, fontSize: fontSizes.base }}>
          {help.name}
        </div>
        <button
          onClick={onClose}
          aria-label="Close help panel"
          style={{
            background: "none",
            border: "none",
            color: colors.textMuted,
            fontSize: 18,
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 14px",
          fontFamily: fonts.sans,
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 1.5,
        }}
      >
        {/* Synopsis */}
        <div style={{ color: colors.textPrimary, fontWeight: 500, marginBottom: 8 }}>
          {help.synopsis}
        </div>

        {/* Syntax */}
        <div style={sectionHeaderStyle}>Syntax</div>
        {help.syntax.map((s, i) => (
          <div key={i} style={codeBlockStyle}>{s}</div>
        ))}

        {/* Aliases */}
        {help.aliases.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Aliases</div>
            <div style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.textMuted }}>
              {help.aliases.join(", ")}
            </div>
          </>
        )}

        {/* Parameters */}
        {help.parameters.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Parameters</div>
            {help.parameters.map((p) => (
              <div
                key={p.name}
                style={{
                  marginBottom: 8,
                  padding: "6px 8px",
                  background: colors.bgSurface,
                  borderRadius: 4,
                  border: `1px solid ${colors.borderLight}`,
                }}
              >
                <div style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, fontWeight: 600, color: colors.syntaxParam }}>
                  -{p.name} &lt;{p.type}&gt;
                  {p.required && <span style={{ color: colors.statusError, marginLeft: 4 }}>*</span>}
                </div>
                <div style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                  {p.description}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Examples */}
        {help.examples.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Examples</div>
            {help.examples.map((ex, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: 600, marginBottom: 2 }}>
                  {ex.title}
                </div>
                <div style={codeBlockStyle}>{ex.code}</div>
                <div style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                  {ex.description}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Related Cmdlets */}
        {help.relatedCmdlets.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Related Cmdlets</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {help.relatedCmdlets.map((name) => (
                <button
                  key={name}
                  onClick={() => handleRelatedClick(name)}
                  style={{
                    background: `${colors.accentPrimary}15`,
                    border: `1px solid ${colors.accentPrimary}33`,
                    borderRadius: 4,
                    color: colors.accentLink,
                    fontSize: fontSizes.xs,
                    fontFamily: fonts.mono,
                    cursor: "pointer",
                    padding: "3px 8px",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer hint (desktop only — mobile dismisses via backdrop tap) */}
      {!isMobile && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${colors.borderBase}`,
            fontSize: fontSizes.xs,
            color: colors.textDimmed,
            flexShrink: 0,
          }}
        >
          Press Escape to close
        </div>
      )}
    </div>
  );
}

/** Extract the cmdlet name from code at or near the cursor position. */
export function detectCmdletAtCursor(code: string, cursorPos: number): string | null {
  // Look at the text around the cursor to find a cmdlet-like token
  const before = code.slice(0, cursorPos);
  const after = code.slice(cursorPos);

  // Find the start of the current token (go back to whitespace or pipe)
  const tokenStartMatch = before.match(/(?:^|[\s|;(])([A-Za-z][\w-]*)$/);
  const tokenEndMatch = after.match(/^([\w-]*)/);

  if (!tokenStartMatch && !tokenEndMatch) return null;

  const tokenStart = tokenStartMatch ? tokenStartMatch[1] : "";
  const tokenEnd = tokenEndMatch ? tokenEndMatch[1] : "";
  const token = tokenStart + tokenEnd;

  if (!token) return null;

  // Check if it's a recognized cmdlet or alias
  const help = getCmdletHelp(token);
  if (help) return help.name;

  return null;
}

/** Extract the first cmdlet name from input text (for syntax bar). */
export function detectCurrentCmdlet(text: string): string | null {
  if (!text.trim()) return null;

  // Get the last pipeline segment
  const lastPipe = text.lastIndexOf("|");
  const segment = lastPipe >= 0 ? text.slice(lastPipe + 1).trimStart() : text.trimStart();

  const firstToken = segment.split(/\s/)[0];
  if (!firstToken) return null;

  const help = getCmdletHelp(firstToken);
  return help?.name ?? null;
}

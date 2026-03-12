import type { ConsoleEntry } from "../types";
import { HighlightedCode } from "./HighlightedCode";
import { colors, fontSizes } from "../theme";

interface OutputPaneProps {
  entries: ConsoleEntry[];
  isISE: boolean;
  endRef?: React.RefObject<HTMLDivElement | null>;
}

export function OutputPane({ entries, isISE, endRef }: OutputPaneProps) {
  return (
    <>
      {entries.length === 0 && (
        <div style={{ color: colors.textDimmed, fontStyle: "italic", fontSize: fontSizes.base }}>
          {isISE
            ? "Output will appear here after you run your script..."
            : "PS master:\\content\\Home> Type your command below and press Enter..."
          }
        </div>
      )}
      {entries.map((entry, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          {entry.type === "command" && (
            <div>
              <span style={{ color: colors.accentPrimary }}>
                PS {entry.cwd || "master:\\content\\Home"}&gt;{" "}
              </span>
              <HighlightedCode code={entry.text} />
            </div>
          )}
          {entry.type === "script" && (
            <div
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.sm,
                marginBottom: 8,
                borderBottom: `1px solid ${colors.borderLight}`,
                paddingBottom: 6,
              }}
            >
              Script executed
            </div>
          )}
          {entry.type === "output" && (
            <pre
              style={{
                color: colors.textOutput,
                margin: "4px 0",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
            >
              {entry.text}
            </pre>
          )}
          {entry.type === "error" && (
            <div style={{ color: colors.statusError, margin: "4px 0" }}>
              {entry.text}
            </div>
          )}
          {entry.type === "success" && (
            <div
              style={{
                color: colors.statusSuccessLight,
                margin: "8px 0",
                padding: "8px 12px",
                background: colors.bgCardSuccess,
                borderRadius: 4,
                borderLeft: `3px solid ${colors.statusSuccess}`,
              }}
            >
              {entry.text}
            </div>
          )}
          {entry.type === "hint" && (
            <div
              style={{
                color: colors.statusHint,
                margin: "4px 0",
                padding: "6px 12px",
                background: colors.bgHint,
                borderRadius: 4,
                borderLeft: `3px solid ${colors.statusHintDark}`,
                fontSize: fontSizes.base,
              }}
            >
              💡 {entry.text}
            </div>
          )}
          {entry.type === "partial" && (
            <div style={{ color: colors.accentPrimary, fontSize: fontSizes.sm, marginLeft: 16 }}>
              {entry.text}
            </div>
          )}
        </div>
      ))}
      {endRef && <div ref={endRef} />}
    </>
  );
}

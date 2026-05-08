import { useState } from "react";
import type { ConsoleEntry } from "../types";
import { HighlightedCode } from "./HighlightedCode";
import { MarkdownLite } from "./MarkdownLite";
import { DialogEntry } from "./DialogEntry";
import { colors, fontSizes } from "../theme";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        background: colors.bgPanel,
        border: `1px solid ${colors.borderDim}`,
        borderRadius: 3,
        color: copied ? colors.statusSuccess : colors.textMuted,
        cursor: "pointer",
        fontSize: 11,
        padding: "2px 6px",
        opacity: 0,
        transition: "opacity 0.15s",
        fontFamily: "inherit",
        lineHeight: 1.4,
      }}
      className="copy-btn"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface OutputPaneProps {
  entries: ConsoleEntry[];
  isISE: boolean;
  isBuilder?: boolean;
  endRef?: React.RefObject<HTMLDivElement | null>;
}

export function OutputPane({ entries, isISE, isBuilder, endRef }: OutputPaneProps) {
  return (
    <div role="log" aria-live="polite" aria-label="Command output">
      {entries.length === 0 && (
        isBuilder ? (
          <div style={{ color: colors.textDimmed, fontStyle: "italic", fontSize: fontSizes.base }}>
            Build a pipeline above and click Run to see the output...
          </div>
        ) : isISE ? (
          <div style={{ color: colors.textDimmed, fontStyle: "italic", fontSize: fontSizes.base }}>
            Output will appear here after you run your script...
          </div>
        ) : (
          <div style={{ color: colors.textDimmed, fontSize: fontSizes.base }}>
            <div>Sitecore PowerShell Extensions</div>
            <div>Copyright © 2010-{new Date().getFullYear()} Adam Najmanowicz, Michael West. All rights Reserved.</div>
          </div>
        )
      )}
      <style>{`.output-entry:hover .copy-btn { opacity: 1 !important; }`}</style>
      {entries.map((entry, i) => (
        <div key={i} style={{ marginBottom: 6, position: "relative" }} className="output-entry">
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
            <div style={{ position: "relative" }}>
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
              <CopyButton text={entry.text} />
            </div>
          )}
          {entry.type === "error" && (
            <div role="alert" style={{ color: colors.statusError, margin: "4px 0" }}>
              {entry.text}
            </div>
          )}
          {entry.type === "warning" && (
            <div style={{ color: colors.statusWarning, margin: "4px 0" }}>
              WARNING: {entry.text}
            </div>
          )}
          {entry.type === "verbose" && (
            <div style={{ color: colors.statusVerbose, margin: "4px 0" }}>
              VERBOSE: {entry.text}
            </div>
          )}
          {entry.type === "debug" && (
            <div style={{ color: colors.statusDebug, margin: "4px 0" }}>
              DEBUG: {entry.text}
            </div>
          )}
          {entry.type === "information" && (
            <div style={{ color: colors.statusInfo, margin: "4px 0" }}>
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
              <MarkdownLite text={entry.text} />
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
              <span aria-hidden="true">💡</span> {entry.text}
            </div>
          )}
          {entry.type === "partial" && (
            <div style={{ color: colors.accentPrimary, fontSize: fontSizes.sm, marginLeft: 16 }}>
              {entry.text}
            </div>
          )}
          {(entry.type === "dialog-alert" || entry.type === "dialog-read-variable" || entry.type === "dialog-listview" || entry.type === "dialog-builder") && (
            <DialogEntry entry={entry} />
          )}
        </div>
      ))}
      {endRef && <div ref={endRef} />}
    </div>
  );
}

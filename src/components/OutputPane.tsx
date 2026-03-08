import type { ConsoleEntry } from "../types";
import { HighlightedCode } from "./HighlightedCode";

interface OutputPaneProps {
  entries: ConsoleEntry[];
  isISE: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
}

export function OutputPane({ entries, isISE, endRef }: OutputPaneProps) {
  return (
    <>
      {entries.length === 0 && (
        <div style={{ color: "#444460", fontStyle: "italic", fontSize: 12 }}>
          {isISE
            ? "Output will appear here after you run your script..."
            : "PS master:\\content\\Home> Type your command below and press Enter..."}
        </div>
      )}
      {entries.map((entry, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          {entry.type === "command" && (
            <div>
              <span style={{ color: "#5c6bc0" }}>
                PS master:\content\Home&gt;{" "}
              </span>
              <HighlightedCode code={entry.text} />
            </div>
          )}
          {entry.type === "script" && (
            <div
              style={{
                color: "#555570",
                fontSize: 11,
                marginBottom: 8,
                borderBottom: "1px solid #1a1a30",
                paddingBottom: 6,
              }}
            >
              Script executed
            </div>
          )}
          {entry.type === "output" && (
            <pre
              style={{
                color: "#b0b0c8",
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
            <div style={{ color: "#ef5350", margin: "4px 0" }}>
              {entry.text}
            </div>
          )}
          {entry.type === "success" && (
            <div
              style={{
                color: "#66bb6a",
                margin: "8px 0",
                padding: "8px 12px",
                background: "#0d1f0d",
                borderRadius: 4,
                borderLeft: "3px solid #4caf50",
              }}
            >
              {entry.text}
            </div>
          )}
          {entry.type === "hint" && (
            <div
              style={{
                color: "#ffab40",
                margin: "4px 0",
                padding: "6px 12px",
                background: "#1a1508",
                borderRadius: 4,
                borderLeft: "3px solid #ff9100",
                fontSize: 12,
              }}
            >
              💡 {entry.text}
            </div>
          )}
          {entry.type === "partial" && (
            <div style={{ color: "#5c6bc0", fontSize: 11, marginLeft: 16 }}>
              {entry.text}
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </>
  );
}

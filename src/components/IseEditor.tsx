import { useState, useRef, useEffect, useCallback } from "react";
import type { ConsoleEntry } from "../types";
import { OutputPane } from "./OutputPane";

interface IseEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
}

export function IseEditor({
  code,
  onCodeChange,
  onRun,
  onClear,
  consoleOutput,
}: IseEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [editorHeight, setEditorHeight] = useState(250);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !editorPaneRef.current) return;
      const containerRect =
        editorPaneRef.current.parentElement!.getBoundingClientRect();
      const newHeight =
        e.clientY - editorPaneRef.current.getBoundingClientRect().top;
      const clamped = Math.max(
        100,
        Math.min(newHeight, containerRect.height - 100)
      );
      setEditorHeight(clamped);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Script editor pane */}
      <div
        ref={editorPaneRef}
        style={{
          borderBottom: "none",
          background: "#0d0d1f",
          display: "flex",
          flexDirection: "column",
          height: editorHeight,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #1a1a35",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#8888a8",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Script Editor
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onRun}
              style={{
                background: "linear-gradient(135deg, #5c6bc0, #7c4dff)",
                border: "none",
                color: "#fff",
                padding: "5px 16px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ▶ Run
            </button>
            <button
              onClick={onClear}
              style={{
                background: "transparent",
                border: "1px solid #2a2a4a",
                color: "#666680",
                padding: "5px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              Clear Output
            </button>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", height: "100%" }}>
            {/* Line numbers */}
            <div
              style={{
                padding: "10px 0",
                textAlign: "right",
                color: "#444460",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: "20px",
                userSelect: "none",
                minWidth: 36,
                paddingRight: 8,
                borderRight: "1px solid #1a1a35",
                background: "#0a0a18",
              }}
            >
              {code.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={inputRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  onRun();
                }
              }}
              spellCheck={false}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#d4d4e8",
                fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                fontSize: 13,
                lineHeight: "20px",
                padding: "10px 12px",
                resize: "none",
                caretColor: "#5c6bc0",
                tabSize: 4,
              }}
            />
          </div>
        </div>
        <div
          style={{
            padding: "4px 16px 6px",
            borderTop: "1px solid #1a1a35",
            fontSize: 11,
            color: "#555570",
          }}
        >
          Ctrl+Enter to run
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          height: 6,
          background: "#1a1a35",
          cursor: "row-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a5a")}
        onMouseLeave={(e) => {
          if (!isDragging.current)
            e.currentTarget.style.background = "#1a1a35";
        }}
      >
        <div
          style={{
            width: 32,
            height: 2,
            background: "#333355",
            borderRadius: 1,
          }}
        />
      </div>

      {/* Output pane */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          background: "#0a0a18",
          fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <OutputPane
          entries={consoleOutput}
          isISE={true}
          endRef={consoleEndRef}
        />
      </div>
    </>
  );
}

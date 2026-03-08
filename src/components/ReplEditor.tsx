import { useRef, useEffect } from "react";
import type { ConsoleEntry } from "../types";
import { OutputPane } from "./OutputPane";

interface ReplEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
  commandHistory: string[];
  historyIndex: number;
  onHistoryIndexChange: (index: number) => void;
}

export function ReplEditor({
  code,
  onCodeChange,
  onRun,
  onClear,
  consoleOutput,
  commandHistory,
  historyIndex,
  onHistoryIndexChange,
}: ReplEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onRun();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex =
        historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
      onHistoryIndexChange(newIndex);
      onCodeChange(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        onHistoryIndexChange(-1);
        onCodeChange("");
      } else {
        onHistoryIndexChange(newIndex);
        onCodeChange(commandHistory[newIndex]);
      }
    }
  };

  return (
    <>
      {/* Console output area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          background: "#0a0a18",
          fontFamily:
            "'JetBrains Mono', 'Cascadia Code', monospace",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <OutputPane
          entries={consoleOutput}
          isISE={false}
          endRef={consoleEndRef}
        />
      </div>

      {/* Command input */}
      <div
        style={{
          borderTop: "1px solid #1a1a35",
          background: "#0d0d1f",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#5c6bc0",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          PS master:\content\Home&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your SPE command here..."
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#d4d4e8",
            fontFamily:
              "'JetBrains Mono', 'Cascadia Code', monospace",
            fontSize: 13,
            caretColor: "#5c6bc0",
          }}
        />
        <button
          onClick={onRun}
          style={{
            background: code.trim()
              ? "linear-gradient(135deg, #5c6bc0, #7c4dff)"
              : "#1a1a35",
            border: "none",
            color: code.trim() ? "#fff" : "#555570",
            padding: "6px 16px",
            borderRadius: 4,
            cursor: code.trim() ? "pointer" : "default",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          Run ⏎
        </button>
        <button
          onClick={onClear}
          style={{
            background: "transparent",
            border: "1px solid #2a2a4a",
            color: "#666680",
            padding: "6px 12px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          Clear
        </button>
      </div>
    </>
  );
}

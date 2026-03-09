import { useRef, useEffect } from "react";
import type { ConsoleEntry } from "../types";
import { OutputPane } from "./OutputPane";
import { colors, gradients, fonts, fontSizes } from "../theme";

interface ReplEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
  commandHistory: string[];
  historyIndex: number;
  onHistoryIndexChange: (index: number) => void;
  isMobile?: boolean;
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
  isMobile,
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
          background: colors.bgDeep,
          fontFamily: fonts.mono,
          fontSize: fontSizes.body,
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
          borderTop: `1px solid ${colors.borderBase}`,
          background: colors.bgSurface,
          padding: isMobile ? "10px 12px" : "12px 20px",
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 8 : 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span
            style={{
              color: colors.accentPrimary,
              fontFamily: fonts.monoShort,
              fontSize: isMobile ? 13 : fontSizes.body,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {isMobile ? "PS>" : "PS master:\\content\\Home>"}
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
              color: colors.textPrimary,
              fontFamily: fonts.mono,
              fontSize: isMobile ? 15 : fontSizes.body,
              caretColor: colors.accentPrimary,
              minHeight: isMobile ? 44 : undefined,
              padding: isMobile ? "8px 0" : undefined,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onRun}
            style={{
              background: code.trim()
                ? gradients.accent
                : colors.borderBase,
              border: "none",
              color: code.trim() ? colors.textWhite : colors.textMuted,
              padding: isMobile ? "10px 20px" : "6px 16px",
              borderRadius: 4,
              cursor: code.trim() ? "pointer" : "default",
              fontSize: isMobile ? 14 : fontSizes.base,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
              minHeight: isMobile ? 44 : undefined,
              flex: isMobile ? 1 : undefined,
            }}
          >
            Run ⏎
          </button>
          <button
            onClick={onClear}
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderMedium}`,
              color: colors.textClear,
              padding: isMobile ? "10px 16px" : "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: isMobile ? 14 : fontSizes.base,
              fontFamily: "inherit",
              minHeight: isMobile ? 44 : undefined,
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}

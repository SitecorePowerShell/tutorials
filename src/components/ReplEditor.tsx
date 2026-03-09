import { useState, useRef, useEffect } from "react";
import type { ConsoleEntry, SitecoreNode } from "../types";
import { OutputPane } from "./OutputPane";
import { colors, gradients, fonts, fontSizes } from "../theme";
import { getCompletions, type CompletionResult } from "../engine/completions";

interface CompletionState {
  result: CompletionResult;
  index: number;
  originalText: string;
  originalCursor: number;
}

interface ReplEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
  commandHistory: string[];
  historyIndex: number;
  onHistoryIndexChange: (index: number) => void;
  tree?: { sitecore: SitecoreNode };
  userVariables?: string[];
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
  tree,
  userVariables,
  onHistoryIndexChange,
  isMobile,
}: ReplEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    // Tab — trigger/cycle completion
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = input.selectionStart ?? code.length;

      if (completion) {
        // Cycle to next match
        const nextIndex = (completion.index + 1) % completion.result.matches.length;
        const match = completion.result.matches[nextIndex];
        const newCode =
          completion.originalText.slice(0, completion.result.replaceStart) +
          match +
          completion.originalText.slice(completion.result.replaceEnd);
        onCodeChange(newCode);
        const newCursor = completion.result.replaceStart + match.length;
        setCompletion({ ...completion, index: nextIndex });
        requestAnimationFrame(() => {
          input.selectionStart = input.selectionEnd = newCursor;
        });
      } else {
        // Start new completion
        const result = getCompletions(code, cursorPos, tree, userVariables);
        if (result && result.matches.length > 0) {
          const match = result.matches[0];
          const newCode =
            code.slice(0, result.replaceStart) +
            match +
            code.slice(result.replaceEnd);
          onCodeChange(newCode);
          const newCursor = result.replaceStart + match.length;
          setCompletion({
            result,
            index: 0,
            originalText: code,
            originalCursor: cursorPos,
          });
          requestAnimationFrame(() => {
            input.selectionStart = input.selectionEnd = newCursor;
          });
        }
      }
      return;
    }

    // Shift+Tab — cycle backwards
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (completion) {
        const prevIndex =
          (completion.index - 1 + completion.result.matches.length) %
          completion.result.matches.length;
        const match = completion.result.matches[prevIndex];
        const newCode =
          completion.originalText.slice(0, completion.result.replaceStart) +
          match +
          completion.originalText.slice(completion.result.replaceEnd);
        onCodeChange(newCode);
        const newCursor = completion.result.replaceStart + match.length;
        setCompletion({ ...completion, index: prevIndex });
        requestAnimationFrame(() => {
          input.selectionStart = input.selectionEnd = newCursor;
        });
      }
      return;
    }

    // Escape — cancel completion, revert to original
    if (e.key === "Escape" && completion) {
      e.preventDefault();
      onCodeChange(completion.originalText);
      const cursor = completion.originalCursor;
      setCompletion(null);
      requestAnimationFrame(() => {
        input.selectionStart = input.selectionEnd = cursor;
      });
      return;
    }

    // ArrowUp/ArrowDown — dismiss completion and handle history
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (completion) setCompletion(null);
      if (commandHistory.length === 0) return;
      const newIndex =
        historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
      onHistoryIndexChange(newIndex);
      onCodeChange(commandHistory[newIndex]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (completion) setCompletion(null);
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        onHistoryIndexChange(-1);
        onCodeChange("");
      } else {
        onHistoryIndexChange(newIndex);
        onCodeChange(commandHistory[newIndex]);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (completion) setCompletion(null);
      onRun();
      return;
    }

    // Any other key dismisses active completion (accepts it)
    if (completion) {
      setCompletion(null);
    }
  };

  const [clearHover, setClearHover] = useState(false);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "16px 20px",
        background: colors.bgDeep,
        fontFamily: fonts.mono,
        fontSize: fontSizes.body,
        lineHeight: 1.6,
        cursor: "text",
        position: "relative",
      }}
      onClick={focusInput}
    >
      {/* Clear button — floating top-right */}
      {consoleOutput.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onMouseEnter={() => setClearHover(true)}
          onMouseLeave={() => setClearHover(false)}
          style={{
            position: "sticky",
            top: 0,
            float: "right",
            background: clearHover ? colors.borderMedium : "transparent",
            border: `1px solid ${clearHover ? colors.borderMedium : "transparent"}`,
            color: clearHover ? colors.textPrimary : colors.textMuted,
            padding: "2px 8px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: fontSizes.sm,
            fontFamily: "inherit",
            transition: "all 0.15s",
            zIndex: 1,
          }}
        >
          Clear
        </button>
      )}

      <OutputPane entries={consoleOutput} isISE={false} />

      {/* Inline prompt line */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          onChange={(e) => {
            if (completion) setCompletion(null);
            onCodeChange(e.target.value);
          }}
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
        {completion && (
          <span
            style={{
              color: colors.accentPrimary,
              fontFamily: fonts.monoShort,
              fontSize: fontSizes.sm,
              whiteSpace: "nowrap",
            }}
          >
            {completion.index + 1}/{completion.result.matches.length}
          </span>
        )}
        {isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            style={{
              background: code.trim() ? gradients.accent : colors.borderBase,
              border: "none",
              color: code.trim() ? colors.textWhite : colors.textMuted,
              padding: "6px 12px",
              borderRadius: 4,
              cursor: code.trim() ? "pointer" : "default",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Run ⏎
          </button>
        )}
      </div>

      {/* Scroll anchor */}
      <div ref={consoleEndRef} />
    </div>
  );
}

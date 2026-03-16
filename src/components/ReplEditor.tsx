import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { ConsoleEntry, SitecoreNode } from "../types";
import { OutputPane } from "./OutputPane";
import { colors, gradients, fonts, fontSizes } from "../theme";
import { getCompletions, type CompletionResult } from "../engine/completions";
import { createBracketAutoCloseHandler } from "../hooks/useBracketAutoClose";
import { useGhostText } from "../hooks/useGhostText";
import { needsContinuation } from "../engine/needsContinuation";
import { useReverseSearch } from "../hooks/useReverseSearch";
import { MobileAccessoryRow } from "./MobileAccessoryRow";
import { getCmdletHelp } from "../engine/cmdletHelp";
import { detectCurrentCmdlet } from "./HelpPanel";

interface CompletionState {
  result: CompletionResult;
  index: number;
  originalText: string;
  originalCursor: number;
}

interface ReplEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: (codeOverride?: string) => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
  commandHistory: string[];
  historyIndex: number;
  onHistoryIndexChange: (index: number) => void;
  tree?: { sitecore: SitecoreNode };
  userVariables?: string[];
  isMobile?: boolean;
  cwd?: string;
  onShowHelp?: (cmdletName: string) => void;
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
  cwd = "/sitecore/content/Home",
  onShowHelp,
}: ReplEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLSpanElement>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [continuationLines, setContinuationLines] = useState<string[]>([]);
  const [promptWidth, setPromptWidth] = useState(0);

  // Compute prompt text
  const promptText = continuationLines.length > 0
    ? ">> "
    : isMobile
      ? "PS> "
      : `PS master:\\${cwd.replace(/^\/sitecore\//, "").replace(/\//g, "\\")}> `;

  // Measure prompt width for text-indent, including when container becomes visible
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const promptCallbackRef = useCallback((node: HTMLSpanElement | null) => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    (promptRef as React.MutableRefObject<HTMLSpanElement | null>).current = node;
    if (node) {
      const w = node.offsetWidth;
      if (w > 0) setPromptWidth(w);
      // Watch for resize (e.g. container going from display:none to visible)
      resizeObserverRef.current = new ResizeObserver(() => {
        const newW = node.offsetWidth;
        if (newW > 0) setPromptWidth(newW);
      });
      resizeObserverRef.current.observe(node);
    }
  }, [promptText, isMobile]);

  // Ghost text
  const ghostText = useGhostText(
    code,
    cursorPos,
    commandHistory,
    tree,
    userVariables
  );
  const showGhost = ghostText && !completion && cursorPos === code.length && promptWidth > 0;

  // Reverse search
  const reverseSearch = useReverseSearch(commandHistory);

  useEffect(() => {
    if (consoleOutput.length > 0 && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      if (code) {
        input.selectionStart = input.selectionEnd = code.length;
        setCursorPos(code.length);
      }
    }
  }, []);

  // Focus search input when search activates
  useEffect(() => {
    if (reverseSearch.state.active) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [reverseSearch.state.active]);

  // Auto-close bracket handler
  const autoCloseHandler = useMemo(
    () =>
      createBracketAutoCloseHandler(
        code,
        () => inputRef.current?.selectionStart ?? code.length,
        (newCode, newCursor) => {
          onCodeChange(newCode);
          requestAnimationFrame(() => {
            const input = inputRef.current;
            if (input) input.selectionStart = input.selectionEnd = newCursor;
          });
        }
      ),
    [code, onCodeChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const input = e.currentTarget;

    // Backspace — pop last continuation line back into input when empty
    if (e.key === "Backspace" && continuationLines.length > 0 && code === "") {
      e.preventDefault();
      const lastLine = continuationLines[continuationLines.length - 1];
      setContinuationLines((prev) => prev.slice(0, -1));
      onCodeChange(lastLine);
      return;
    }

    // Ctrl+R — reverse history search
    if (e.key === "r" && e.ctrlKey && !isMobile) {
      e.preventDefault();
      if (reverseSearch.state.active) {
        reverseSearch.nextMatch();
      } else {
        reverseSearch.activate();
      }
      return;
    }

    // F1 — show help for current cmdlet
    if (e.key === "F1") {
      e.preventDefault();
      const cmdlet = detectCurrentCmdlet(code, inputRef.current?.selectionStart ?? code.length);
      if (cmdlet && onShowHelp) onShowHelp(cmdlet);
      return;
    }

    // ArrowRight — accept ghost text
    if (
      e.key === "ArrowRight" &&
      showGhost &&
      cursorPos === code.length
    ) {
      e.preventDefault();
      onCodeChange(code + ghostText);
      return;
    }

    // Auto-close brackets/quotes
    if (autoCloseHandler(e)) return;

    // Tab — trigger/cycle completion
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const pos = input.selectionStart ?? code.length;

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
        const result = getCompletions(code, pos, tree, userVariables);
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
            originalCursor: pos,
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

    // Escape — cancel continuation mode
    if (e.key === "Escape" && continuationLines.length > 0) {
      e.preventDefault();
      setContinuationLines([]);
      onCodeChange("");
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
    // Disabled during continuation mode
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (continuationLines.length > 0) return;
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
      if (continuationLines.length > 0) return;
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
      const currentLine = code.trim();
      const fullText = [...continuationLines, currentLine].join("\n");
      if (needsContinuation(fullText)) {
        setContinuationLines((prev) => [...prev, currentLine]);
        onCodeChange("");
      } else {
        setContinuationLines([]);
        onRun(fullText);
      }
      return;
    }

    // Any other key dismisses active completion (accepts it)
    if (completion) {
      setCompletion(null);
    }
  };

  // Handle keydown in reverse search mode
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      reverseSearch.deactivate();
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const match = reverseSearch.accept();
      if (match) onCodeChange(match);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (e.key === "r" && e.ctrlKey) {
      e.preventDefault();
      reverseSearch.nextMatch();
      return;
    }
  };

  const [clearHover, setClearHover] = useState(false);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Track cursor position for ghost text
  const handleSelect = () => {
    setCursorPos(inputRef.current?.selectionStart ?? 0);
  };

  // Trigger tab completion programmatically (for mobile accessory row)
  const triggerTabCompletion = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const pos = input.selectionStart ?? code.length;

    if (completion) {
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
      const result = getCompletions(code, pos, tree, userVariables);
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
          originalCursor: pos,
        });
        requestAnimationFrame(() => {
          input.selectionStart = input.selectionEnd = newCursor;
        });
      }
    }
  }, [code, completion, tree, userVariables, onCodeChange]);

  // Insert a character at cursor position (for mobile accessory row)
  const handleAccessoryInsert = useCallback((char: string, pair?: string) => {
    const input = inputRef.current;
    if (!input) return;
    const pos = input.selectionStart ?? code.length;
    const newCode = pair
      ? code.slice(0, pos) + char + pair + code.slice(pos)
      : code.slice(0, pos) + char + code.slice(pos);
    onCodeChange(newCode);
    const newCursor = pos + char.length;
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = newCursor;
      input.focus();
    });
  }, [code, onCodeChange]);

  // Handle accessory row actions
  const handleAccessoryAction = useCallback((action: string) => {
    if (action === "tab") {
      triggerTabCompletion();
      inputRef.current?.focus();
    } else if (action === "help") {
      inputRef.current?.blur();
      const cmdlet = detectCurrentCmdlet(code, inputRef.current?.selectionStart ?? code.length);
      if (cmdlet && onShowHelp) onShowHelp(cmdlet);
    }
  }, [triggerTabCompletion, code, onShowHelp]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
    {isMobile && (
      <MobileAccessoryRow
        onInsert={handleAccessoryInsert}
        onAction={handleAccessoryAction}
      />
    )}
    {isMobile && (
      <div
        style={{
          padding: "6px 12px",
          borderBottom: `1px solid ${colors.borderBase}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: colors.bgSurface,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: fontSizes.sm,
            color: colors.textSecondary,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Console
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onRun()}
            aria-label="Run"
            title="Run"
            style={{
              background: gradients.accent,
              border: "none",
              color: colors.textWhite,
              width: 40,
              height: 32,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            ▶
          </button>
          <button
            onClick={onClear}
            aria-label="Clear output"
            title="Clear output"
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderMedium}`,
              color: colors.textClear,
              width: 40,
              height: 32,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    )}
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
      {/* Clear button — floating top-right (desktop only, mobile uses button bar) */}
      {consoleOutput.length > 0 && !isMobile && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onMouseEnter={() => setClearHover(true)}
          onMouseLeave={() => setClearHover(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 20,
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

      {/* Syntax hint bar */}
      {(() => {
        const cmdlet = detectCurrentCmdlet(code);
        const help = cmdlet ? getCmdletHelp(cmdlet) : null;
        if (!help || !help.syntax[0]) return null;
        return (
          <div
            style={{
              fontSize: 11,
              fontFamily: fonts.mono,
              color: colors.textDimmed,
              background: colors.bgPanel,
              padding: "2px 8px",
              borderRadius: 3,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {help.syntax[0]}
            </span>
            {onShowHelp && !isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowHelp(cmdlet!);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textDimmed,
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "0 2px",
                  fontFamily: fonts.mono,
                  whiteSpace: "nowrap",
                }}
              >
                F1 help
              </button>
            )}
          </div>
        );
      })()}

      {/* Continuation lines */}
      {continuationLines.map((line, i) => (
        <div key={i} style={{ color: colors.textPrimary, fontFamily: fonts.mono }}>
          <span style={{ color: colors.textMuted }}>{">> "}</span>{line}
        </div>
      ))}

      {/* Inline prompt line */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {reverseSearch.state.active ? (
          /* Reverse search mode */
          <>
            <span
              style={{
                color: colors.textMuted,
                fontFamily: fonts.monoShort,
                fontSize: isMobile ? 13 : fontSizes.body,
                whiteSpace: "nowrap",
              }}
            >
              (reverse-i-search)`
            </span>
            <input
              ref={searchInputRef}
              aria-label="Reverse history search"
              type="text"
              value={reverseSearch.state.query}
              onChange={(e) => reverseSearch.updateQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              spellCheck={false}
              autoComplete="off"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: colors.accentPrimary,
                fontFamily: fonts.mono,
                fontSize: isMobile ? 15 : fontSizes.body,
                caretColor: colors.accentPrimary,
                width: Math.max(20, (reverseSearch.state.query.length + 1) * 8),
                padding: 0,
              }}
            />
            <span
              style={{
                color: colors.textMuted,
                fontFamily: fonts.monoShort,
                fontSize: isMobile ? 13 : fontSizes.body,
                whiteSpace: "nowrap",
              }}
            >
              ':
            </span>
            <span
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.mono,
                fontSize: isMobile ? 15 : fontSizes.body,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {reverseSearch.state.currentMatch ?? ""}
            </span>
          </>
        ) : (
          /* Normal prompt mode */
          <>
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
              {/* Prompt — absolutely positioned over the text-indent space */}
              <span
                ref={promptCallbackRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  color: colors.accentPrimary,
                  fontFamily: fonts.monoShort,
                  fontSize: isMobile ? 13 : fontSizes.body,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  lineHeight: 1.6,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                {promptText}
              </span>
              <div style={{ position: "relative" }}>
                {/* Placeholder overlay — only show after prompt width is measured */}
                {!code && !showGhost && promptWidth > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      pointerEvents: "none",
                      whiteSpace: "pre",
                      fontFamily: fonts.mono,
                      fontSize: isMobile ? 15 : fontSizes.body,
                      lineHeight: 1.6,
                      textIndent: promptWidth,
                      color: colors.textMuted,
                      width: "100%",
                      boxSizing: "border-box",
                      zIndex: 1,
                    }}
                  >
                    Type a command...
                  </span>
                )}
                {/* Ghost text underlay */}
                {showGhost && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      pointerEvents: "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      fontFamily: fonts.mono,
                      fontSize: isMobile ? 15 : fontSizes.body,
                      lineHeight: 1.6,
                      textIndent: promptWidth,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ visibility: "hidden" }}>{code}</span>
                    <span style={{ color: colors.ghostText }}>{ghostText}</span>
                  </span>
                )}
                <textarea
                  ref={inputRef}
                  aria-label="PowerShell command input"
                  value={code}
                  onChange={(e) => {
                    if (completion) setCompletion(null);
                    onCodeChange(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  onSelect={handleSelect}
                  onKeyUp={handleSelect}
                  spellCheck={false}
                  autoComplete="off"
                  rows={1}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: colors.textPrimary,
                    fontFamily: fonts.mono,
                    fontSize: isMobile ? 15 : fontSizes.body,
                    caretColor: colors.accentPrimary,
                    minHeight: isMobile ? 44 : undefined,
                    padding: 0,
                    margin: 0,
                    resize: "none",
                    overflow: "hidden",
                    lineHeight: 1.6,
                    fieldSizing: "content",
                    textIndent: promptWidth,
                    display: "block",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <span
              style={{
                color: colors.accentPrimary,
                fontFamily: fonts.monoShort,
                fontSize: fontSizes.sm,
                whiteSpace: "nowrap",
                visibility: completion ? "visible" : "hidden",
                alignSelf: "flex-start",
                lineHeight: 1.6,
              }}
            >
              {completion
                ? `${completion.index + 1}/${completion.result.matches.length}`
                : "\u00A0"}
            </span>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                if (showGhost) {
                  onCodeChange(code + ghostText);
                  inputRef.current?.focus();
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: showGhost ? "pointer" : "default",
                color: colors.textDimmed,
                fontFamily: fonts.monoShort,
                fontSize: fontSizes.xs,
                whiteSpace: "nowrap",
                padding: "4px 8px",
                touchAction: "manipulation",
                visibility: showGhost ? "visible" : "hidden",
              }}
            >
              Tab →
            </button>
          </>
        )}
      </div>

      {/* Scroll anchor */}
      <div ref={consoleEndRef} />
    </div>
    </div>
  );
}

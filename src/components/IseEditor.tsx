import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ConsoleEntry, SitecoreNode } from "../types";
import { OutputPane } from "./OutputPane";
import { tokenize, renderTokens, renderTokensWithHighlights } from "./HighlightedCode";
import { colors, gradients, fonts, fontSizes } from "../theme";
import { getCompletions, type CompletionResult } from "../engine/completions";
import { createBracketAutoCloseHandler } from "../hooks/useBracketAutoClose";
import { useBracketMatching } from "../hooks/useBracketMatching";
import { useGhostText } from "../hooks/useGhostText";
import { MobileAccessoryRow } from "./MobileAccessoryRow";
import { getCmdletHelp } from "../engine/cmdletHelp";
import { detectCmdletAtCursor, detectCurrentCmdlet } from "./HelpPanel";

interface CompletionState {
  result: CompletionResult;
  index: number;
  originalText: string;
  originalCursor: number;
}

interface IseEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  onReset?: () => void;
  consoleOutput: ConsoleEntry[];
  commandHistory?: string[];
  tree?: { sitecore: SitecoreNode };
  userVariables?: string[];
  isMobile?: boolean;
  initialEditorHeight?: number;
  onEditorHeightChange?: (height: number) => void;
  onShowHelp?: (cmdletName: string) => void;
}

export function IseEditor({
  code,
  onCodeChange,
  onRun,
  onClear,
  onReset,
  consoleOutput,
  commandHistory = [],
  tree,
  userVariables,
  isMobile,
  initialEditorHeight,
  onEditorHeightChange,
  onShowHelp,
}: IseEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [editorHeight, setEditorHeight] = useState(initialEditorHeight ?? 250);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [cursorPos, setCursorPos] = useState(0);

  // Bracket matching highlights (ISE-only feature)
  const bracketHighlights = useBracketMatching(code, cursorPos);

  // Ghost text
  const ghostText = useGhostText(
    code,
    cursorPos,
    commandHistory,
    tree,
    userVariables
  );
  const showGhost = ghostText && !completion && cursorPos === code.length;

  useEffect(() => {
    if (consoleOutput.length > 0 && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [consoleOutput]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = true;
    (e.currentTarget as HTMLDivElement).style.background = colors.bgResizeHover;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || !editorPaneRef.current) return;
    const touch = e.touches[0];
    const containerRect = editorPaneRef.current.parentElement!.getBoundingClientRect();
    const newHeight = touch.clientY - editorPaneRef.current.getBoundingClientRect().top;
    const clamped = Math.max(100, Math.min(newHeight, containerRect.height - 100));
    setEditorHeight(clamped);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = false;
    (e.currentTarget as HTMLDivElement).style.background = colors.borderBase;
    setEditorHeight((h) => { onEditorHeightChange?.(h); return h; });
  }, [onEditorHeightChange]);

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
        setEditorHeight((h) => { onEditorHeightChange?.(h); return h; });
      }
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onEditorHeightChange]);

  // Sync scroll between textarea, overlay, and line numbers
  const handleScroll = useCallback(() => {
    const ta = inputRef.current;
    const ov = overlayRef.current;
    const ln = lineNumRef.current;
    if (!ta) return;
    if (ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
    if (ln) {
      ln.scrollTop = ta.scrollTop;
    }
  }, []);

  // Dismiss completion on any non-completion key
  const dismissCompletion = useCallback(() => {
    setCompletion(null);
  }, []);

  // Track cursor position for bracket matching and ghost text
  const handleSelect = useCallback(() => {
    setCursorPos(inputRef.current?.selectionStart ?? 0);
  }, []);

  // Auto-close bracket handler
  const autoCloseHandler = useMemo(
    () =>
      createBracketAutoCloseHandler(
        code,
        () => inputRef.current?.selectionStart ?? 0,
        (newCode, newCursor) => {
          onCodeChange(newCode);
          requestAnimationFrame(() => {
            const ta = inputRef.current;
            if (ta) {
              ta.selectionStart = ta.selectionEnd = newCursor;
              setCursorPos(newCursor);
            }
          });
        }
      ),
    [code, onCodeChange]
  );

  // Trigger Ctrl+Space completion programmatically (for mobile accessory row)
  const triggerCompletion = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? 0;

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
        ta.selectionStart = ta.selectionEnd = newCursor;
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
          ta.selectionStart = ta.selectionEnd = newCursor;
        });
      }
    }
  }, [code, completion, tree, userVariables, onCodeChange]);

  // Insert a character at cursor position (for mobile accessory row)
  const handleAccessoryInsert = useCallback((char: string, pair?: string) => {
    const ta = inputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? 0;
    const newCode = pair
      ? code.slice(0, pos) + char + pair + code.slice(pos)
      : code.slice(0, pos) + char + code.slice(pos);
    onCodeChange(newCode);
    const newCursor = pos + char.length;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newCursor;
      ta.focus();
    });
  }, [code, onCodeChange]);

  // Handle accessory row actions
  const handleAccessoryAction = useCallback((action: string) => {
    if (action === "tab") {
      triggerCompletion();
      inputRef.current?.focus();
    } else if (action === "help") {
      inputRef.current?.blur();
      const cmdlet = detectCurrentCmdlet(code, inputRef.current?.selectionStart ?? code.length);
      if (cmdlet && onShowHelp) onShowHelp(cmdlet);
    }
  }, [triggerCompletion, code, onShowHelp]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;

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

      // Auto-close brackets/quotes (before Tab/completion handling)
      if (autoCloseHandler(e)) return;

      // Ctrl+Space — trigger/cycle completion
      if (e.key === " " && e.ctrlKey) {
        e.preventDefault();
        const pos = ta.selectionStart;

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
            ta.selectionStart = ta.selectionEnd = newCursor;
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
              ta.selectionStart = ta.selectionEnd = newCursor;
            });
          }
        }
        return;
      }

      // Escape — cancel completion
      if (e.key === "Escape" && completion) {
        e.preventDefault();
        onCodeChange(completion.originalText);
        const cursor = completion.originalCursor;
        setCompletion(null);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = cursor;
        });
        return;
      }

      // F1 — show help for cmdlet at cursor
      if (e.key === "F1") {
        e.preventDefault();
        const cmdlet = detectCmdletAtCursor(code, ta.selectionStart);
        if (cmdlet && onShowHelp) onShowHelp(cmdlet);
        return;
      }

      // Any other key dismisses active completion (accepts it)
      if (completion) {
        dismissCompletion();
      }

      // Ctrl+Enter — run
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        onRun();
        return;
      }

      // Ctrl+L — clear output
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        onClear();
        return;
      }

      // Ctrl+/ — toggle line comment
      if (e.key === "/" && e.ctrlKey) {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = ta;
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const lineEnd =
          value.indexOf("\n", selectionEnd) === -1
            ? value.length
            : value.indexOf("\n", selectionEnd);
        const selectedText = value.slice(lineStart, lineEnd);
        const lines = selectedText.split("\n");
        const allCommented = lines.every((l) => /^\s*#/.test(l) || l.trim() === "");
        const toggled = lines
          .map((l) => {
            if (allCommented) {
              return l.replace(/^(\s*)# ?/, "$1");
            }
            return l.replace(/^(\s*)/, "$1# ");
          })
          .join("\n");
        const newCode = value.slice(0, lineStart) + toggled + value.slice(lineEnd);
        onCodeChange(newCode);
        // Restore cursor
        requestAnimationFrame(() => {
          const diff = toggled.length - selectedText.length;
          ta.selectionStart = selectionStart + (selectionStart === lineStart ? 0 : diff > 0 ? 2 : -2);
          ta.selectionEnd = selectionEnd + diff;
        });
        return;
      }

      // Tab — insert 2 spaces
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = ta;
        if (selectionStart === selectionEnd) {
          // No selection — insert spaces at cursor
          const newCode =
            value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
          onCodeChange(newCode);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = selectionStart + 2;
          });
        } else {
          // Selection — indent each line
          const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
          const lineEnd =
            value.indexOf("\n", selectionEnd) === -1
              ? value.length
              : value.indexOf("\n", selectionEnd);
          const block = value.slice(lineStart, lineEnd);
          const indented = block
            .split("\n")
            .map((l) => "  " + l)
            .join("\n");
          const newCode = value.slice(0, lineStart) + indented + value.slice(lineEnd);
          onCodeChange(newCode);
          requestAnimationFrame(() => {
            ta.selectionStart = lineStart;
            ta.selectionEnd = lineStart + indented.length;
          });
        }
        return;
      }

      // Shift+Tab — dedent selected lines
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = ta;
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const lineEnd =
          value.indexOf("\n", selectionEnd) === -1
            ? value.length
            : value.indexOf("\n", selectionEnd);
        const block = value.slice(lineStart, lineEnd);
        const dedented = block
          .split("\n")
          .map((l) => l.replace(/^ {1,2}/, ""))
          .join("\n");
        const newCode = value.slice(0, lineStart) + dedented + value.slice(lineEnd);
        onCodeChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = lineStart;
          ta.selectionEnd = lineStart + dedented.length;
        });
        return;
      }
    },
    [onRun, onClear, onCodeChange, completion, dismissCompletion, code, tree, userVariables, autoCloseHandler, showGhost, ghostText, cursorPos, onShowHelp]
  );

  // Render syntax-highlighted overlay content
  const overlayContent = code.endsWith("\n") ? code + " " : code;
  const overlayTokens = tokenize(overlayContent);

  // Choose rendering: with bracket highlights or plain
  const renderedOverlay =
    bracketHighlights.length > 0
      ? renderTokensWithHighlights(overlayTokens, bracketHighlights)
      : renderTokens(overlayTokens);

  return (
    <>
      {/* Mobile accessory row — top so keyboard doesn't cover it */}
      {isMobile && (
        <MobileAccessoryRow
          onInsert={handleAccessoryInsert}
          onAction={handleAccessoryAction}
        />
      )}

      {/* Script editor pane */}
      <div
        ref={editorPaneRef}
        style={{
          borderBottom: "none",
          background: colors.bgSurface,
          display: "flex",
          flexDirection: "column",
          height: editorHeight,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "8px 16px",
            borderBottom: `1px solid ${colors.borderBase}`,
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            flexShrink: 0,
            flexWrap: isMobile ? "wrap" : undefined,
            gap: isMobile ? 8 : 0,
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
            Script Editor
          </div>
          <div style={{ display: "flex", gap: isMobile ? 6 : 8, width: isMobile ? undefined : undefined }}>
            <button
              onClick={onRun}
              aria-label="Run"
              title="Run (Ctrl+Enter)"
              style={{
                background: gradients.accent,
                border: "none",
                color: colors.textWhite,
                padding: isMobile ? 0 : "5px 16px",
                width: isMobile ? 40 : undefined,
                height: isMobile ? 32 : undefined,
                borderRadius: isMobile ? 6 : 4,
                cursor: "pointer",
                fontSize: isMobile ? 16 : fontSizes.base,
                fontWeight: 600,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                touchAction: "manipulation",
              }}
            >
              {isMobile ? "▶" : "▶ Run"}
            </button>
            <button
              onClick={onClear}
              aria-label="Clear output"
              title="Clear output (Ctrl+L)"
              style={{
                background: "transparent",
                border: `1px solid ${colors.borderMedium}`,
                color: colors.textClear,
                padding: isMobile ? 0 : "5px 12px",
                width: isMobile ? 40 : undefined,
                height: isMobile ? 32 : undefined,
                borderRadius: isMobile ? 6 : 4,
                cursor: "pointer",
                fontSize: isMobile ? 14 : fontSizes.base,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                touchAction: "manipulation",
              }}
            >
              {isMobile ? "⌫" : "Clear"}
            </button>
            {onReset && (
              <button
                onClick={onReset}
                aria-label="Reset editor"
                title="Reset editor"
                style={{
                  background: "transparent",
                  border: `1px solid ${colors.borderMedium}`,
                  color: colors.textClear,
                  padding: isMobile ? 0 : "5px 12px",
                  width: isMobile ? 40 : undefined,
                  height: isMobile ? 32 : undefined,
                  borderRadius: isMobile ? 6 : 4,
                  cursor: "pointer",
                  fontSize: isMobile ? 14 : fontSizes.base,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  touchAction: "manipulation",
                }}
              >
                {isMobile ? "↺" : "Reset"}
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", height: "100%" }}>
            {/* Line numbers */}
            <div
              ref={lineNumRef}
              style={{
                padding: "10px 0",
                textAlign: "right",
                color: colors.textDimmed,
                fontSize: fontSizes.body,
                fontFamily: fonts.monoShort,
                lineHeight: "20px",
                userSelect: "none",
                minWidth: 44,
                paddingRight: 8,
                borderRight: `1px solid ${colors.borderBase}`,
                background: colors.bgDeep,
                overflow: "hidden",
              }}
            >
              {code.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Editor area with overlay */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {/* Syntax highlight overlay (background) */}
              <pre
                ref={overlayRef}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  margin: 0,
                  padding: "10px 12px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.body,
                  lineHeight: "20px",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflow: "hidden",
                  pointerEvents: "none",
                  color: "transparent",
                  border: "none",
                  background: "transparent",
                }}
              >
                {renderedOverlay}
                {showGhost && (
                  <span style={{ color: colors.ghostText }}>{ghostText}</span>
                )}
              </pre>
              {/* Transparent textarea (foreground — captures input) */}
              <textarea
                ref={inputRef}
                className="ise-editor-textarea"
                aria-label="Script editor"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                onSelect={handleSelect}
                onKeyUp={handleSelect}
                onClick={handleSelect}
                spellCheck={false}
                placeholder="Write your script here, then press Ctrl+Enter to run..."
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "transparent",
                  caretColor: colors.accentPrimary,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.body,
                  lineHeight: "20px",
                  padding: "10px 12px",
                  resize: "none",
                  tabSize: 4,
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflow: "auto",
                  margin: 0,
                }}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "4px 16px 6px",
            borderTop: `1px solid ${colors.borderBase}`,
            fontSize: fontSizes.sm,
            color: colors.textMuted,
            display: "flex",
            gap: 16,
          }}
        >
          {!isMobile && (
            <>
              {(() => {
                const cmdlet = detectCurrentCmdlet(code, cursorPos);
                const help = cmdlet ? getCmdletHelp(cmdlet) : null;
                if (help?.syntax[0]) {
                  return (
                    <span
                      style={{ color: colors.textDimmed, cursor: onShowHelp ? "pointer" : undefined }}
                      onClick={onShowHelp ? () => onShowHelp(cmdlet!) : undefined}
                      title="Press F1 for help"
                    >
                      {help.syntax[0]}
                    </span>
                  );
                }
                return (
                  <>
                    <span>Ctrl+Enter run</span>
                    <span>Ctrl+Space complete</span>
                    <span>Tab indent</span>
                    <span>Ctrl+/ comment</span>
                    <span>Ctrl+L clear</span>
                  </>
                );
              })()}
            </>
          )}
          {completion && (
            <span style={{ color: colors.accentPrimary, marginLeft: "auto" }}>
              {completion.index + 1}/{completion.result.matches.length}:{" "}
              {completion.result.matches[completion.index]}
            </span>
          )}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
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
              fontFamily: "inherit",
              fontSize: fontSizes.sm,
              marginLeft: completion ? undefined : "auto",
              padding: "2px 6px",
              touchAction: "manipulation",
              visibility: showGhost ? "visible" : "hidden",
            }}
          >
            Tab →
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-label="Resize editor"
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 50 : 10;
          if (e.key === "ArrowUp") { e.preventDefault(); setEditorHeight((h) => Math.max(100, h - step)); }
          if (e.key === "ArrowDown") { e.preventDefault(); setEditorHeight((h) => { const container = editorPaneRef.current?.parentElement; const max = container ? container.getBoundingClientRect().height - 100 : 600; return Math.min(max, h + step); }); }
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          height: isMobile ? 12 : 6,
          background: colors.borderBase,
          cursor: "row-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
          touchAction: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgResizeHover)}
        onMouseLeave={(e) => {
          if (!isDragging.current)
            e.currentTarget.style.background = colors.borderBase;
        }}
      >
        <div
          style={{
            width: 32,
            height: 2,
            background: colors.borderDim,
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
          background: colors.bgDeep,
          fontFamily: fonts.mono,
          fontSize: fontSizes.body,
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

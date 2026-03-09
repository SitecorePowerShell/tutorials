import { useState, useRef, useEffect, useCallback } from "react";
import type { ConsoleEntry, SitecoreNode } from "../types";
import { OutputPane } from "./OutputPane";
import { tokenize, renderTokens } from "./HighlightedCode";
import { colors, gradients, fonts, fontSizes } from "../theme";
import { getCompletions, type CompletionResult } from "../engine/completions";

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
  consoleOutput: ConsoleEntry[];
  tree?: { sitecore: SitecoreNode };
  userVariables?: string[];
}

export function IseEditor({
  code,
  onCodeChange,
  onRun,
  onClear,
  consoleOutput,
  tree,
  userVariables,
}: IseEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [editorHeight, setEditorHeight] = useState(250);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;

      // Ctrl+Space — trigger/cycle completion
      if (e.key === " " && e.ctrlKey) {
        e.preventDefault();
        const cursorPos = ta.selectionStart;

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
    [onRun, onClear, onCodeChange, completion, dismissCompletion, code, tree, userVariables]
  );

  // Render syntax-highlighted overlay content
  const tokens = tokenize(code);
  // Ensure trailing newline so overlay height matches textarea
  const overlayContent = code.endsWith("\n") ? code + " " : code;
  const overlayTokens = tokenize(overlayContent);

  return (
    <>
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
            alignItems: "center",
            justifyContent: "space-between",
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
            Script Editor
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onRun}
              style={{
                background: gradients.accent,
                border: "none",
                color: colors.textWhite,
                padding: "5px 16px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: fontSizes.base,
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
                border: `1px solid ${colors.borderMedium}`,
                color: colors.textClear,
                padding: "5px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: fontSizes.base,
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
              ref={lineNumRef}
              style={{
                padding: "10px 0",
                textAlign: "right",
                color: colors.textDimmed,
                fontSize: fontSizes.body,
                fontFamily: fonts.monoShort,
                lineHeight: "20px",
                userSelect: "none",
                minWidth: 36,
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
                {renderTokens(overlayTokens)}
              </pre>
              {/* Transparent textarea (foreground — captures input) */}
              <textarea
                ref={inputRef}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
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
          <span>Ctrl+Enter run</span>
          <span>Ctrl+Space complete</span>
          <span>Tab indent</span>
          <span>Ctrl+/ comment</span>
          <span>Ctrl+L clear</span>
          {completion && (
            <span style={{ color: colors.accentPrimary, marginLeft: "auto" }}>
              {completion.index + 1}/{completion.result.matches.length}:{" "}
              {completion.result.matches[completion.index]}
            </span>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleDragStart}
        style={{
          height: 6,
          background: colors.borderBase,
          cursor: "row-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
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

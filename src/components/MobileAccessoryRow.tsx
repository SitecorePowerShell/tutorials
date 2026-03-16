import { useState, useRef, useEffect, useCallback } from "react";
import { colors, fonts } from "../theme";

interface KeyDef {
  label: string;
  char?: string;
  pair?: string;
  action?: string;
}

const OPERATORS = [
  "-eq", "-ne", "-like", "-notlike", "-match", "-gt", "-lt", "-ge", "-le",
  "-replace", "-split", "-join", "-contains", "-in", "-and", "-or", "-not",
];

const KEYS: KeyDef[] = [
  { label: "Help", action: "help" },
  { label: "Tab", action: "tab" },
  { label: "$_.", char: "$_." },
  { label: "|", char: "|" },
  { label: "$", char: "$" },
  { label: "_", char: "_" },
  { label: ".", char: "." },
  { label: "{}", char: "{", pair: "}" },
  { label: '"', char: '"' },
  { label: "\\", char: "\\" },
  { label: "?", char: "?" },
  { label: "()", char: "(", pair: ")" },
  { label: "@", char: "@" },
  { label: ";", char: ";" },
];

interface MobileAccessoryRowProps {
  onInsert: (char: string, pair?: string) => void;
  onAction: (action: string) => void;
}

export function MobileAccessoryRow({ onInsert, onAction }: MobileAccessoryRowProps) {
  const [showOperators, setShowOperators] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside tap
  useEffect(() => {
    if (!showOperators) return;
    const handle = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowOperators(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showOperators]);

  const toggleOperators = useCallback(() => {
    setShowOperators((prev) => {
      if (!prev && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPopoverPos({
          top: rect.bottom + 6,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
        });
      }
      return !prev;
    });
  }, []);

  const buttonStyle = (isAction: boolean): React.CSSProperties => ({
    minWidth: isAction ? 48 : 40,
    height: 36,
    borderRadius: 6,
    border: `1px solid ${isAction ? colors.accentPrimary : colors.borderMedium}`,
    background: isAction ? colors.bgActive : colors.bgSurface,
    color: isAction ? colors.accentPrimary : colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.mono,
    fontWeight: isAction ? 600 : 400,
    cursor: "pointer",
    flexShrink: 0,
    padding: "0 6px",
    touchAction: "manipulation",
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 5,
          padding: "6px 8px",
          background: colors.bgPanel,
          borderTop: `1px solid ${colors.borderBase}`,
          flexShrink: 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {KEYS.map((key, i) => {
          const isAction = !!key.action;

          // Insert operator dropdown after the "." button (index 6)
          const showOpBefore = i === 7; // before "{}"

          return (
            <span key={key.label} style={{ display: "contents" }}>
              {showOpBefore && (
                <button
                  ref={buttonRef}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleOperators}
                  style={{
                    ...buttonStyle(false),
                    minWidth: 48,
                    border: `1px solid ${showOperators ? colors.accentPrimary : colors.borderMedium}`,
                    color: showOperators ? colors.accentPrimary : colors.textPrimary,
                  }}
                >
                  -op
                </button>
              )}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (isAction) {
                    onAction(key.action!);
                  } else {
                    onInsert(key.char!, key.pair);
                  }
                }}
                style={buttonStyle(isAction)}
              >
                {key.label}
              </button>
            </span>
          );
        })}
      </div>

      {/* Operator popover — rendered as fixed overlay outside the scrollable row */}
      {showOperators && popoverPos && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: popoverPos.top,
            left: popoverPos.left,
            background: colors.bgSurface,
            border: `1px solid ${colors.borderBase}`,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            padding: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            width: 260,
            zIndex: 60,
          }}
        >
          {OPERATORS.map((op) => (
            <button
              key={op}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onInsert(op + " ");
                setShowOperators(false);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: `1px solid ${colors.borderMedium}`,
                background: colors.bgDeep,
                color: colors.syntaxOperator,
                fontSize: 13,
                fontFamily: fonts.mono,
                fontWeight: 500,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              {op}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

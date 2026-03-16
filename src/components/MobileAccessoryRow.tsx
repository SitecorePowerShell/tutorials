import { colors, fonts } from "../theme";

interface KeyDef {
  label: string;
  char?: string;
  pair?: string;
  action?: string;
}

const KEYS: KeyDef[] = [
  { label: "Tab", action: "tab" },
  { label: "?", action: "help" },
  { label: "|", char: "|" },
  { label: "$", char: "$" },
  { label: "-", char: "-" },
  { label: "\\", char: "\\" },
  { label: "{}", char: "{", pair: "}" },
  { label: "()", char: "(", pair: ")" },
  { label: '"', char: '"' },
  { label: "@", char: "@" },
  { label: "_", char: "_" },
  { label: ";", char: ";" },
];

interface MobileAccessoryRowProps {
  onInsert: (char: string, pair?: string) => void;
  onAction: (action: string) => void;
}

export function MobileAccessoryRow({ onInsert, onAction }: MobileAccessoryRowProps) {
  return (
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
      {KEYS.map((key) => {
        const isAction = !!key.action;
        return (
          <button
            key={key.label}
            onMouseDown={(e) => {
              // Prevent stealing focus from the editor input
              e.preventDefault();
            }}
            onClick={() => {
              if (isAction) {
                onAction(key.action!);
              } else {
                onInsert(key.char!, key.pair);
              }
            }}
            style={{
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
            }}
          >
            {key.label}
          </button>
        );
      })}
    </div>
  );
}

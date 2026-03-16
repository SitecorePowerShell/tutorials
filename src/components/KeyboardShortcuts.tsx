import { useEffect } from "react";
import { colors, fontSizes } from "../theme";

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: "REPL Console", items: [
    { keys: ["Enter"], desc: "Execute command" },
    { keys: ["Up", "Down"], desc: "Navigate command history" },
    { keys: ["Tab"], desc: "Accept autocomplete suggestion" },
    { keys: ["Ctrl", "R"], desc: "Reverse search history" },
    { keys: ["Ctrl", "L"], desc: "Clear console output" },
    { keys: ["Ctrl", "C"], desc: "Cancel / clear input" },
  ]},
  { category: "ISE Editor", items: [
    { keys: ["Ctrl", "Enter"], desc: "Run script" },
    { keys: ["Tab"], desc: "Insert indentation" },
    { keys: ["Ctrl", "Z"], desc: "Undo" },
    { keys: ["Ctrl", "Shift", "Z"], desc: "Redo" },
  ]},
  { category: "Navigation", items: [
    { keys: ["?"], desc: "Toggle this shortcut reference" },
    { keys: ["Escape"], desc: "Close panel / sidebar" },
  ]},
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: "inline-block",
        padding: "2px 7px",
        background: colors.bgDeep,
        border: `1px solid ${colors.borderBase}`,
        borderRadius: 4,
        fontSize: fontSizes.xs,
        fontFamily: "inherit",
        color: colors.textPrimary,
        lineHeight: 1.6,
        minWidth: 20,
        textAlign: "center",
      }}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: colors.bgPanel,
          border: `1px solid ${colors.borderBase}`,
          borderRadius: 8,
          padding: "24px 28px",
          maxWidth: 480,
          width: "90vw",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: fontSizes.lg,
              color: colors.textPrimary,
              fontWeight: 700,
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: colors.textMuted,
              cursor: "pointer",
              fontSize: 18,
              padding: 4,
            }}
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        {shortcuts.map((section) => (
          <div key={section.category} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: fontSizes.xs,
                fontWeight: 700,
                color: colors.textSubtle,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              {section.category}
            </div>
            {section.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  borderBottom: i < section.items.length - 1 ? `1px solid ${colors.borderDim}` : "none",
                }}
              >
                <span style={{ color: colors.textSecondary, fontSize: fontSizes.body }}>
                  {item.desc}
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  {item.keys.map((k, ki) => (
                    <span key={ki} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {ki > 0 && (
                        <span style={{ color: colors.textMuted, fontSize: 10 }}>+</span>
                      )}
                      <Kbd>{k}</Kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

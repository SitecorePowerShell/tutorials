import React from "react";
import type { ConsoleEntry } from "../types";
import { colors, fontSizes } from "../theme";

type DialogConsoleEntry = Extract<
  ConsoleEntry,
  { type: "dialog-alert" | "dialog-read-variable" | "dialog-listview" }
>;

const titleBarStyle: React.CSSProperties = {
  background: colors.accentSecondary,
  color: "#fff",
  padding: "6px 12px",
  fontSize: fontSizes.sm,
  fontWeight: 600,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderRadius: "4px 4px 0 0",
};

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.7)",
  cursor: "default",
  fontSize: fontSizes.sm,
  padding: "0 4px",
  lineHeight: 1,
};

const bodyStyle: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.borderMedium}`,
  borderTop: "none",
  borderRadius: "0 0 4px 4px",
  padding: "12px 16px",
  fontSize: fontSizes.base,
  color: colors.textPrimary,
};

const disabledButtonStyle: React.CSSProperties = {
  background: colors.bgOverlay,
  border: `1px solid ${colors.borderDim}`,
  borderRadius: 3,
  color: colors.textMuted,
  padding: "4px 16px",
  fontSize: fontSizes.sm,
  cursor: "default",
  opacity: 0.7,
};

function DialogChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: "4px 0" }}>
      <div style={titleBarStyle}>
        <span>{title}</span>
        <span style={closeButtonStyle} aria-hidden="true">✕</span>
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

function AlertDialog({ entry }: { entry: Extract<ConsoleEntry, { type: "dialog-alert" }> }) {
  return (
    <DialogChrome title="Alert">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">⚠</span>
        <span>{entry.message}</span>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={disabledButtonStyle}>OK</span>
      </div>
    </DialogChrome>
  );
}

function ReadVariableDialog({ entry }: { entry: Extract<ConsoleEntry, { type: "dialog-read-variable" }> }) {
  return (
    <DialogChrome title={entry.title}>
      {entry.description && (
        <div style={{ marginBottom: 10, color: colors.textSecondary }}>{entry.description}</div>
      )}
      <div
        style={{
          background: colors.bgPanel,
          border: `1px solid ${colors.borderDim}`,
          borderRadius: 3,
          padding: "6px 10px",
          color: colors.textDimmed,
          fontSize: fontSizes.sm,
          marginBottom: 12,
        }}
      >
        (parameter input)
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <span style={disabledButtonStyle}>OK</span>
        <span style={disabledButtonStyle}>Cancel</span>
      </div>
    </DialogChrome>
  );
}

function ListViewDialog({ entry }: { entry: Extract<ConsoleEntry, { type: "dialog-listview" }> }) {
  const { columns, rows } = entry;

  return (
    <div style={{ margin: "4px 0", maxWidth: "100%", overflow: "hidden" }}>
      {/* Title bar */}
      <div style={titleBarStyle}>
        <span>{entry.title}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={closeButtonStyle} aria-hidden="true">—</span>
          <span style={closeButtonStyle} aria-hidden="true">☐</span>
          <span style={closeButtonStyle} aria-hidden="true">✕</span>
        </div>
      </div>

      {/* Table area */}
      <div
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.borderMedium}`,
          borderTop: "none",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: fontSizes.sm,
            fontFamily: "inherit",
          }}
        >
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    background: colors.accentPrimary,
                    color: "#fff",
                    padding: "5px 10px",
                    textAlign: "left",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    borderRight: i < columns.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "5px 10px",
                      borderBottom: `1px solid ${colors.borderLight}`,
                      background: ri % 2 === 0 ? colors.bgCard : colors.bgPanel,
                      color: colors.textPrimary,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div
        style={{
          background: colors.bgPanel,
          border: `1px solid ${colors.borderMedium}`,
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
          padding: "4px 10px",
          fontSize: fontSizes.xs,
          color: colors.textMuted,
          display: "flex",
          gap: 16,
        }}
      >
        <span>Results: {entry.itemCount}</span>
        <span>Page: 1 / 1</span>
      </div>
    </div>
  );
}

export const DialogEntry = React.memo(function DialogEntry({ entry }: { entry: DialogConsoleEntry }) {
  switch (entry.type) {
    case "dialog-alert":
      return <AlertDialog entry={entry} />;
    case "dialog-read-variable":
      return <ReadVariableDialog entry={entry} />;
    case "dialog-listview":
      return <ListViewDialog entry={entry} />;
  }
});

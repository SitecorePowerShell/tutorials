import { HighlightedCode } from "../HighlightedCode";
import { colors, fonts, fontSizes, gradients } from "../../theme";

interface CommandPreviewProps {
  command: string;
  onRun: () => void;
  onClear: () => void;
}

export function CommandPreview({ command, onRun, onClear }: CommandPreviewProps) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderTop: `1px solid ${colors.borderBase}`,
        background: colors.bgDeep,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: "6px 10px",
          background: colors.bgBase,
          border: `1px solid ${colors.borderBase}`,
          borderRadius: 4,
          fontFamily: fonts.monoFull,
          fontSize: fontSizes.sm,
          color: colors.textPrimary,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          minHeight: 28,
          lineHeight: 1.5,
        }}
      >
        {command ? (
          <HighlightedCode code={command} />
        ) : (
          <span style={{ color: colors.textDimmed, fontStyle: "italic" }}>
            Build a pipeline to see the command here...
          </span>
        )}
      </pre>
      <button
        onClick={onRun}
        disabled={!command}
        style={{
          background: command ? gradients.accent : colors.borderDim,
          border: "none",
          borderRadius: 6,
          color: command ? colors.textWhite : colors.textMuted,
          fontFamily: fonts.sans,
          fontSize: fontSizes.sm,
          fontWeight: 600,
          padding: "8px 18px",
          cursor: command ? "pointer" : "default",
          whiteSpace: "nowrap",
          opacity: command ? 1 : 0.5,
        }}
      >
        Run
      </button>
      <button
        onClick={onClear}
        style={{
          background: "transparent",
          border: `1px solid ${colors.borderMedium}`,
          borderRadius: 6,
          color: colors.textSecondary,
          fontFamily: fonts.sans,
          fontSize: fontSizes.sm,
          padding: "7px 12px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Clear
      </button>
    </div>
  );
}

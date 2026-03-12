import type { ValidationError } from "../../builder/assembleCommand";
import { HighlightedCode } from "../HighlightedCode";
import { colors, fonts, fontSizes, gradients } from "../../theme";

interface CommandPreviewProps {
  command: string;
  onRun: () => void;
  onClear: () => void;
  validationErrors?: ValidationError[];
}

export function CommandPreview({ command, onRun, onClear, validationErrors = [] }: CommandPreviewProps) {
  const canRun = command && validationErrors.length === 0;
  return (
    <>
      {validationErrors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: "6px 12px",
            borderTop: `1px solid ${colors.borderBase}`,
            background: colors.bgDeep,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {validationErrors.map((err, i) => (
            <span
              key={i}
              style={{
                fontSize: fontSizes.xs,
                fontFamily: fonts.sans,
                color: colors.statusError,
                background: "rgba(239,83,80,0.1)",
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              {err.cmdlet}: {err.paramName} required
            </span>
          ))}
        </div>
      )}
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
          disabled={!canRun}
          title={validationErrors.length > 0 ? validationErrors.map((e) => `${e.cmdlet}: ${e.paramName} required`).join(", ") : undefined}
          style={{
            background: canRun ? gradients.accent : colors.borderDim,
            border: "none",
            borderRadius: 6,
            color: canRun ? colors.textWhite : colors.textMuted,
            fontFamily: fonts.sans,
            fontSize: fontSizes.sm,
            fontWeight: 600,
            padding: "8px 18px",
            cursor: canRun ? "pointer" : "default",
            whiteSpace: "nowrap",
            opacity: canRun ? 1 : 0.5,
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
    </>
  );
}

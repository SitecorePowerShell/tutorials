import type { ValidationError } from "../../builder/assembleCommand";
import { HighlightedCode } from "../HighlightedCode";
import { colors, fonts, fontSizes, gradients } from "../../theme";

interface CommandPreviewProps {
  command: string;
  onRun: () => void;
  onClear: () => void;
  validationErrors?: ValidationError[];
  isMobile?: boolean;
}

export function CommandPreview({ command, onRun, onClear, validationErrors = [], isMobile }: CommandPreviewProps) {
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
          padding: isMobile ? "6px 10px" : "8px 12px",
          borderTop: `1px solid ${colors.borderBase}`,
          background: colors.bgDeep,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 8 : 10,
        }}
      >
        <pre
          style={{
            flex: isMobile ? undefined : 1,
            margin: 0,
            padding: "6px 10px",
            background: colors.bgBase,
            border: `1px solid ${colors.borderBase}`,
            borderRadius: 4,
            fontFamily: fonts.monoFull,
            fontSize: fontSizes.sm,
            color: colors.textPrimary,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            minHeight: 28,
            maxHeight: isMobile ? 80 : undefined,
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
        <div style={{ display: "flex", gap: isMobile ? 6 : 8 }}>
          <button
            onClick={onRun}
            disabled={!canRun}
            aria-label="Run"
            title={validationErrors.length > 0 ? validationErrors.map((e) => `${e.cmdlet}: ${e.paramName} required`).join(", ") : "Run"}
            style={{
              background: canRun ? gradients.accent : colors.borderDim,
              border: "none",
              borderRadius: isMobile ? 6 : 4,
              color: canRun ? colors.textWhite : colors.textMuted,
              fontFamily: "inherit",
              fontSize: isMobile ? 16 : fontSizes.base,
              fontWeight: 600,
              padding: isMobile ? 0 : "5px 16px",
              width: isMobile ? 40 : undefined,
              height: isMobile ? 32 : undefined,
              cursor: canRun ? "pointer" : "default",
              whiteSpace: "nowrap",
              opacity: canRun ? 1 : 0.5,
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
            title="Clear output"
            style={{
              background: "transparent",
              border: `1px solid ${colors.borderMedium}`,
              borderRadius: isMobile ? 6 : 4,
              color: colors.textClear,
              fontFamily: "inherit",
              fontSize: isMobile ? 14 : fontSizes.base,
              padding: isMobile ? 0 : "5px 12px",
              width: isMobile ? 40 : undefined,
              height: isMobile ? 32 : undefined,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            {isMobile ? "⌫" : "Clear"}
          </button>
        </div>
      </div>
    </>
  );
}

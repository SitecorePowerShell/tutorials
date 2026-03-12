import type { ReactNode } from "react";
import type { PipelineStage } from "../builder/assembleCommand";
import { BuilderInsertView } from "./BuilderInsertView";
import { colors, fontSizes } from "../theme";

interface EditorWithBuilderToggleProps {
  mode: "repl" | "ise";
  builderActive: boolean;
  onToggleBuilder: (active: boolean) => void;
  editorElement: ReactNode;
  onInsertCode: (command: string) => void;
  isMobile?: boolean;
  builderStages: PipelineStage[];
  onBuilderStagesChange: (stages: PipelineStage[]) => void;
  builderSelectedStageId: string | null;
  onBuilderSelectedStageIdChange: (id: string | null) => void;
}

export function EditorWithBuilderToggle({
  mode,
  builderActive,
  onToggleBuilder,
  editorElement,
  onInsertCode,
  isMobile,
  builderStages,
  onBuilderStagesChange,
  builderSelectedStageId,
  onBuilderSelectedStageIdChange,
}: EditorWithBuilderToggleProps) {
  const textLabel = mode === "repl" ? "Console" : "Script Editor";
  const insertLabel = mode === "repl" ? "Insert into Console" : "Insert into Editor";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Toggle bar */}
      <div
        style={{
          height: 36,
          display: "flex",
          background: colors.bgPanel,
          borderBottom: `1px solid ${colors.borderBase}`,
          flexShrink: 0,
        }}
      >
        {([false, true] as const).map((isBuilder) => {
          const active = builderActive === isBuilder;
          const label = isBuilder ? "Visual Builder" : textLabel;
          return (
            <button
              key={label}
              onClick={() => onToggleBuilder(isBuilder)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? `2px solid ${colors.accentPrimary}`
                  : "2px solid transparent",
                color: active ? colors.textPrimary : colors.textSecondary,
                fontWeight: active ? 600 : 400,
                fontSize: fontSizes.sm,
                fontFamily: "inherit",
                cursor: "pointer",
                padding: "0 12px",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {builderActive ? (
        <BuilderInsertView
          stages={builderStages}
          onStagesChange={onBuilderStagesChange}
          selectedStageId={builderSelectedStageId}
          onSelectedStageIdChange={onBuilderSelectedStageIdChange}
          onInsert={onInsertCode}
          isMobile={isMobile}
          insertLabel={insertLabel}
        />
      ) : (
        editorElement
      )}
    </div>
  );
}

import { useCallback } from "react";
import { assembleCommand, createStage, getValidationErrors, type PipelineStage } from "../builder/assembleCommand";
import { CmdletPalette } from "./builder/CmdletPalette";
import { PipelineDropZone } from "./builder/PipelineDropZone";
import { ParamPanel } from "./builder/ParamPanel";
import { HighlightedCode } from "./HighlightedCode";
import { colors, fonts, fontSizes, gradients } from "../theme";

interface BuilderInsertViewProps {
  stages: PipelineStage[];
  onStagesChange: (stages: PipelineStage[]) => void;
  selectedStageId: string | null;
  onSelectedStageIdChange: (id: string | null) => void;
  onInsert: (command: string) => void;
  isMobile?: boolean;
  insertLabel: string;
}

export function BuilderInsertView({
  stages,
  onStagesChange,
  selectedStageId,
  onSelectedStageIdChange,
  onInsert,
  isMobile,
  insertLabel,
}: BuilderInsertViewProps) {
  const command = assembleCommand(stages);
  const errors = getValidationErrors(stages);
  const canInsert = command && errors.length === 0;

  const usedCmdlets = new Set(stages.map((s) => s.cmdlet));

  const addStage = useCallback((cmdletName: string) => {
    if (stages.some((s) => s.cmdlet === cmdletName)) return;
    const newStage = createStage(cmdletName);
    onStagesChange([...stages, newStage]);
    onSelectedStageIdChange(newStage.id);
  }, [stages, onStagesChange, onSelectedStageIdChange]);

  const insertStage = useCallback((cmdletName: string, index: number) => {
    if (stages.some((s) => s.cmdlet === cmdletName)) return;
    const newStage = createStage(cmdletName);
    const next = [...stages];
    next.splice(index, 0, newStage);
    onStagesChange(next);
    onSelectedStageIdChange(newStage.id);
  }, [stages, onStagesChange, onSelectedStageIdChange]);

  const removeStage = useCallback((id: string) => {
    onStagesChange(stages.filter((s) => s.id !== id));
    if (selectedStageId === id) onSelectedStageIdChange(null);
  }, [stages, selectedStageId, onStagesChange, onSelectedStageIdChange]);

  const reorderStage = useCallback((fromIndex: number, toIndex: number) => {
    const next = [...stages];
    const [moved] = next.splice(fromIndex, 1);
    const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
    next.splice(adjustedTo, 0, moved);
    onStagesChange(next);
  }, [stages, onStagesChange]);

  const updateParams = useCallback((stageId: string, params: Record<string, string>) => {
    onStagesChange(stages.map((s) => (s.id === stageId ? { ...s, params } : s)));
  }, [stages, onStagesChange]);

  const updateSwitches = useCallback((stageId: string, switches: string[]) => {
    onStagesChange(stages.map((s) => (s.id === stageId ? { ...s, switches } : s)));
  }, [stages, onStagesChange]);

  const selectedStage = stages.find((s) => s.id === selectedStageId) ?? null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <CmdletPalette usedCmdlets={usedCmdlets} onAddStage={addStage} isMobile={isMobile} />

      <PipelineDropZone
        stages={stages}
        selectedStageId={selectedStageId}
        onSelectStage={onSelectedStageIdChange}
        onInsertStage={insertStage}
        onRemoveStage={removeStage}
        onReorderStage={reorderStage}
        isMobile={isMobile}
      />

      <ParamPanel
        stage={selectedStage}
        onUpdateParams={updateParams}
        onUpdateSwitches={updateSwitches}
        isMobile={isMobile}
      />

      {/* Validation errors */}
      {errors.length > 0 && (
        <div
          style={{
            padding: "6px 12px",
            borderTop: `1px solid ${colors.borderBase}`,
            background: colors.bgDeep,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {errors.map((err, i) => (
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

      {/* Command preview + insert button */}
      <div
        style={{
          padding: "8px 12px",
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              onStagesChange([]);
              onSelectedStageIdChange(null);
            }}
            disabled={stages.length === 0}
            style={{
              background: "transparent",
              border: `1px solid ${stages.length ? colors.borderMedium : colors.borderDim}`,
              borderRadius: 4,
              color: stages.length ? colors.textClear : colors.textMuted,
              fontFamily: "inherit",
              fontSize: isMobile ? 14 : fontSizes.base,
              padding: isMobile ? "10px 16px" : "5px 12px",
              cursor: stages.length ? "pointer" : "default",
              whiteSpace: "nowrap",
              opacity: stages.length ? 1 : 0.5,
              minHeight: isMobile ? 44 : undefined,
              flex: isMobile ? 1 : undefined,
            }}
          >
            Reset
          </button>
          <button
            onClick={() => onInsert(command)}
            disabled={!canInsert}
            title={errors.length > 0 ? errors.map((e) => `${e.cmdlet}: ${e.paramName} required`).join(", ") : undefined}
            style={{
              background: canInsert ? gradients.accent : colors.borderDim,
              border: "none",
              borderRadius: 4,
              color: canInsert ? colors.textWhite : colors.textMuted,
              fontFamily: "inherit",
              fontSize: isMobile ? 14 : fontSizes.base,
              fontWeight: 600,
              padding: isMobile ? "10px 20px" : "5px 16px",
              cursor: canInsert ? "pointer" : "default",
              whiteSpace: "nowrap",
              opacity: canInsert ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: isMobile ? 44 : undefined,
              flex: isMobile ? 1 : undefined,
            }}
          >
            {insertLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

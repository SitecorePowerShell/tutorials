import { useCallback } from "react";
import { assembleCommand, createStage, type PipelineStage } from "../builder/assembleCommand";
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

  const addStage = useCallback((cmdletName: string) => {
    const newStage = createStage(cmdletName);
    onStagesChange([...stages, newStage]);
    onSelectedStageIdChange(newStage.id);
  }, [stages, onStagesChange, onSelectedStageIdChange]);

  const insertStage = useCallback((cmdletName: string, index: number) => {
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
      <CmdletPalette onAddStage={addStage} isMobile={isMobile} />

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

      {/* Command preview + insert button */}
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
          onClick={() => {
            onStagesChange([]);
            onSelectedStageIdChange(null);
          }}
          disabled={stages.length === 0}
          style={{
            background: "transparent",
            border: `1px solid ${stages.length ? colors.borderLight : colors.borderDim}`,
            borderRadius: 6,
            color: stages.length ? colors.textSecondary : colors.textMuted,
            fontFamily: fonts.sans,
            fontSize: fontSizes.sm,
            fontWeight: 500,
            padding: "8px 14px",
            cursor: stages.length ? "pointer" : "default",
            whiteSpace: "nowrap",
            opacity: stages.length ? 1 : 0.5,
          }}
        >
          Reset
        </button>
        <button
          onClick={() => onInsert(command)}
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
          {insertLabel}
        </button>
      </div>
    </div>
  );
}

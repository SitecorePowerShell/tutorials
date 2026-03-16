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
  onShowHelp?: (cmdletName: string) => void;
}

export function BuilderInsertView({
  stages,
  onStagesChange,
  selectedStageId,
  onSelectedStageIdChange,
  onInsert,
  isMobile,
  insertLabel,
  onShowHelp,
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
  const selectedStageIndex = selectedStage ? stages.findIndex((s) => s.id === selectedStage.id) : undefined;

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
      {/* Command preview + action buttons (top) */}
      <div
        style={{
          padding: isMobile ? "6px 10px" : "8px 12px",
          borderBottom: `1px solid ${colors.borderBase}`,
          background: colors.bgDeep,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 6 : 10,
          flexShrink: 0,
        }}
      >
        {/* Validation errors inline */}
        {errors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: "none" }}>
            {errors.map((err, i) => (
              <span
                key={i}
                style={{
                  fontSize: fontSizes.xs,
                  fontFamily: fonts.sans,
                  color: colors.statusError,
                  background: "rgba(239,83,80,0.1)",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                {err.cmdlet}: {err.paramName}
              </span>
            ))}
          </div>
        )}
        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: isMobile ? "4px 8px" : "6px 10px",
            background: colors.bgBase,
            border: `1px solid ${colors.borderBase}`,
            borderRadius: 4,
            fontFamily: fonts.monoFull,
            fontSize: isMobile ? fontSizes.xs : fontSizes.sm,
            color: colors.textPrimary,
            overflowX: "auto",
            whiteSpace: "nowrap",
            minHeight: isMobile ? 24 : 28,
            lineHeight: 1.5,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {command ? (
            <HighlightedCode code={command} />
          ) : (
            <span style={{ color: colors.textDimmed, fontStyle: "italic" }}>
              {isMobile ? "Build a pipeline..." : "Build a pipeline to see the command here..."}
            </span>
          )}
        </pre>
        <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexShrink: 0 }}>
          <button
            onClick={() => onInsert(command)}
            disabled={!canInsert}
            aria-label={insertLabel}
            title={insertLabel}
            style={{
              background: canInsert ? gradients.accent : colors.borderDim,
              border: "none",
              borderRadius: 6,
              color: canInsert ? colors.textWhite : colors.textMuted,
              padding: isMobile ? 0 : "5px 16px",
              width: isMobile ? 40 : undefined,
              height: isMobile ? 32 : undefined,
              cursor: canInsert ? "pointer" : "default",
              opacity: canInsert ? 1 : 0.5,
              fontSize: isMobile ? 16 : fontSizes.base,
              fontWeight: 600,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              touchAction: "manipulation",
            }}
          >
            {isMobile ? "⤓" : insertLabel}
          </button>
          <button
            onClick={() => { onStagesChange([]); onSelectedStageIdChange(null); }}
            disabled={stages.length === 0}
            aria-label="Reset"
            title="Reset pipeline"
            style={{
              background: "transparent",
              border: `1px solid ${stages.length ? colors.borderMedium : colors.borderDim}`,
              borderRadius: 6,
              color: stages.length ? colors.textClear : colors.textMuted,
              padding: isMobile ? 0 : "5px 12px",
              width: isMobile ? 40 : undefined,
              height: isMobile ? 32 : undefined,
              cursor: stages.length ? "pointer" : "default",
              opacity: stages.length ? 1 : 0.5,
              fontSize: 14,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
            }}
          >
            {isMobile ? "↺" : "Reset"}
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
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
          collapsible={isMobile}
          stageIndex={selectedStageIndex}
          stageCount={stages.length}
          onReorderStage={isMobile ? reorderStage : undefined}
          onShowHelp={onShowHelp}
        />
      </div>

    </div>
  );
}

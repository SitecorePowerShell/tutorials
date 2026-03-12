import { useState, useEffect, useCallback, useRef } from "react";
import type { ConsoleEntry, BuilderConfig } from "../types";
import { assembleCommand, type PipelineStage } from "../builder/assembleCommand";
import { CmdletPalette } from "./builder/CmdletPalette";
import { PipelineDropZone } from "./builder/PipelineDropZone";
import { ParamPanel } from "./builder/ParamPanel";
import { CommandPreview } from "./builder/CommandPreview";
import { OutputPane } from "./OutputPane";
import { colors, fonts, fontSizes } from "../theme";

interface BuilderEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onClear: () => void;
  consoleOutput: ConsoleEntry[];
  isMobile?: boolean;
  builderConfig?: BuilderConfig;
}

export function BuilderEditor({
  code,
  onCodeChange,
  onRun,
  onClear,
  consoleOutput,
  isMobile,
  builderConfig,
}: BuilderEditorProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Track builderConfig reference to reset stages on task change
  const prevConfigRef = useRef<BuilderConfig | undefined>(undefined);
  useEffect(() => {
    if (builderConfig === prevConfigRef.current) return;
    prevConfigRef.current = builderConfig;

    if (builderConfig?.prefilled) {
      const prefilled: PipelineStage[] = builderConfig.prefilled.map((s) => ({
        id: crypto.randomUUID(),
        cmdlet: s.cmdlet,
        params: s.params ? { ...s.params } : {},
        switches: s.switches ? [...s.switches] : [],
        locked: s.locked,
      }));
      setStages(prefilled);
    } else {
      setStages([]);
    }
    setSelectedStageId(null);
  }, [builderConfig]);

  // Assemble command whenever stages change
  useEffect(() => {
    const cmd = assembleCommand(stages);
    onCodeChange(cmd);
  }, [stages, onCodeChange]);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleOutput]);

  const addStage = useCallback((cmdletName: string) => {
    const newStage: PipelineStage = {
      id: crypto.randomUUID(),
      cmdlet: cmdletName,
      params: {},
      switches: [],
    };
    setStages((prev) => [...prev, newStage]);
    setSelectedStageId(newStage.id);
  }, []);

  const insertStage = useCallback((cmdletName: string, index: number) => {
    const newStage: PipelineStage = {
      id: crypto.randomUUID(),
      cmdlet: cmdletName,
      params: {},
      switches: [],
    };
    setStages((prev) => {
      const next = [...prev];
      next.splice(index, 0, newStage);
      return next;
    });
    setSelectedStageId(newStage.id);
  }, []);

  const removeStage = useCallback((id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
    setSelectedStageId((prev) => (prev === id ? null : prev));
  }, []);

  const reorderStage = useCallback((fromIndex: number, toIndex: number) => {
    setStages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
      next.splice(adjustedTo, 0, moved);
      return next;
    });
  }, []);

  const updateParams = useCallback((stageId: string, params: Record<string, string>) => {
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, params } : s))
    );
  }, []);

  const updateSwitches = useCallback((stageId: string, switches: string[]) => {
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, switches } : s))
    );
  }, []);

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
      {/* Cmdlet palette */}
      <CmdletPalette
        availableCmdlets={builderConfig?.availableCmdlets}
        onAddStage={addStage}
        isMobile={isMobile}
      />

      {/* Pipeline drop zone */}
      <PipelineDropZone
        stages={stages}
        selectedStageId={selectedStageId}
        onSelectStage={setSelectedStageId}
        onInsertStage={insertStage}
        onRemoveStage={removeStage}
        onReorderStage={reorderStage}
        isMobile={isMobile}
      />

      {/* Parameter panel */}
      <ParamPanel
        stage={selectedStage}
        onUpdateParams={updateParams}
        onUpdateSwitches={updateSwitches}
        isMobile={isMobile}
      />

      {/* Command preview + run */}
      <CommandPreview
        command={code}
        onRun={onRun}
        onClear={onClear}
      />

      {/* Output */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 20px",
          background: colors.bgDeep,
          borderTop: `1px solid ${colors.borderBase}`,
          fontFamily: fonts.mono,
          fontSize: fontSizes.body,
          lineHeight: 1.6,
          minHeight: 60,
        }}
      >
        <OutputPane entries={consoleOutput} isISE={false} isBuilder={true} endRef={consoleEndRef} />
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}

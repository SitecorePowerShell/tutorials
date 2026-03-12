import { useState } from "react";
import type { PipelineStage } from "../../builder/assembleCommand";
import { CMDLET_REGISTRY } from "../../builder/cmdletRegistry";
import { colors, fonts, fontSizes } from "../../theme";

interface PipelineDropZoneProps {
  stages: PipelineStage[];
  selectedStageId: string | null;
  onSelectStage: (id: string | null) => void;
  onInsertStage: (cmdletName: string, index: number) => void;
  onRemoveStage: (id: string) => void;
  onReorderStage: (fromIndex: number, toIndex: number) => void;
  isMobile?: boolean;
}

export function PipelineDropZone({
  stages,
  selectedStageId,
  onSelectStage,
  onInsertStage,
  onRemoveStage,
  onReorderStage,
  isMobile,
}: PipelineDropZoneProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    // Calculate insertion index from mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    if (isMobile) return;
    const children = e.currentTarget.querySelectorAll("[data-stage-index]");
    let insertIdx = stages.length;
    for (let i = 0; i < children.length; i++) {
      const childRect = children[i].getBoundingClientRect();
      const midX = childRect.left + childRect.width / 2;
      if (e.clientX < midX) {
        insertIdx = i;
        break;
      }
    }
    setDragOverIndex(insertIdx);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);

    const cmdletName = e.dataTransfer.getData("application/x-builder-cmdlet");
    const reorderIdx = e.dataTransfer.getData("application/x-builder-reorder");

    if (cmdletName) {
      onInsertStage(cmdletName, dragOverIndex ?? stages.length);
    } else if (reorderIdx !== "") {
      const fromIdx = parseInt(reorderIdx, 10);
      const toIdx = dragOverIndex ?? stages.length;
      if (fromIdx !== toIdx) {
        onReorderStage(fromIdx, toIdx);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  if (stages.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: isMobile ? 60 : 64,
          margin: "0 12px",
          border: `2px dashed ${dragOverIndex !== null ? colors.accentPrimary : colors.borderDim}`,
          borderRadius: 8,
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          fontFamily: fonts.sans,
          transition: "border-color 0.15s",
        }}
      >
        {isMobile
          ? "Tap a cmdlet above to start building"
          : "Drag cmdlets here to build your pipeline"}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: 0,
        padding: "10px 12px",
        minHeight: isMobile ? 60 : 64,
        overflowX: isMobile ? "visible" : "auto",
        overflowY: isMobile ? "auto" : "visible",
      }}
    >
      {stages.map((stage, idx) => {
        const def = CMDLET_REGISTRY[stage.cmdlet];
        const stageColor = def?.color ?? colors.accentPrimary;
        const isSelected = stage.id === selectedStageId;

        return (
          <div
            key={stage.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            {/* Insertion indicator */}
            {dragOverIndex === idx && (
              <div
                style={{
                  width: isMobile ? "100%" : 3,
                  height: isMobile ? 3 : 40,
                  background: colors.accentPrimary,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${colors.accentPrimary}`,
                  flexShrink: 0,
                }}
              />
            )}

            {/* Pipe connector */}
            {idx > 0 && (
              <span
                style={{
                  color: colors.syntaxPipe,
                  fontWeight: 700,
                  fontSize: fontSizes.lg,
                  fontFamily: fonts.mono,
                  padding: isMobile ? "2px 0" : "0 6px",
                  userSelect: "none",
                }}
              >
                |
              </span>
            )}

            {/* Stage block */}
            <div
              data-stage-index={idx}
              draggable={!stage.locked && !isMobile}
              onDragStart={(e) => {
                if (stage.locked) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("application/x-builder-reorder", String(idx));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onSelectStage(isSelected ? null : stage.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                background: isSelected ? `${stageColor}33` : `${stageColor}18`,
                border: `1.5px solid ${isSelected ? stageColor : `${stageColor}44`}`,
                borderRadius: 8,
                cursor: stage.locked ? "default" : "pointer",
                userSelect: "none",
                opacity: stage.locked ? 0.7 : 1,
                transition: "border-color 0.15s, background 0.15s",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {stage.locked && (
                <span style={{ fontSize: 10 }} title="Locked">🔒</span>
              )}
              <span style={{ fontSize: isMobile ? 16 : 14 }}>{def?.icon}</span>
              <span
                style={{
                  color: stageColor,
                  fontSize: isMobile ? fontSizes.sm : fontSizes.xs,
                  fontFamily: fonts.mono,
                  fontWeight: 600,
                }}
              >
                {stage.cmdlet}
              </span>
              {!stage.locked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStage(stage.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.textMuted,
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              )}

              {/* Mobile reorder buttons */}
              {isMobile && !stage.locked && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 4 }}>
                  <button
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderStage(idx, idx - 1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: idx === 0 ? colors.textDimmed : colors.textMuted,
                      cursor: idx === 0 ? "default" : "pointer",
                      fontSize: 10,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    disabled={idx === stages.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderStage(idx, idx + 1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: idx === stages.length - 1 ? colors.textDimmed : colors.textMuted,
                      cursor: idx === stages.length - 1 ? "default" : "pointer",
                      fontSize: 10,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Trailing insertion indicator */}
      {dragOverIndex !== null && dragOverIndex >= stages.length && (
        <div
          style={{
            width: isMobile ? "100%" : 3,
            height: isMobile ? 3 : 40,
            background: colors.accentPrimary,
            borderRadius: 2,
            boxShadow: `0 0 8px ${colors.accentPrimary}`,
            flexShrink: 0,
            marginLeft: isMobile ? 0 : 6,
          }}
        />
      )}
    </div>
  );
}

import { CMDLET_REGISTRY, ALL_CMDLET_NAMES, getCmdletColor } from "../../builder/cmdletRegistry";
import { colors, fonts, fontSizes } from "../../theme";

interface CmdletPaletteProps {
  availableCmdlets?: string[];
  usedCmdlets?: Set<string>;
  onAddStage: (cmdletName: string) => void;
  isMobile?: boolean;
}

export function CmdletPalette({ availableCmdlets, usedCmdlets, onAddStage, isMobile }: CmdletPaletteProps) {
  const cmdlets = (availableCmdlets ?? ALL_CMDLET_NAMES)
    .filter((name) => CMDLET_REGISTRY[name] && !(usedCmdlets?.has(name)));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gap: isMobile ? 6 : 8,
        padding: isMobile ? "8px 10px" : "10px 12px",
        background: colors.bgPanel,
        borderBottom: `1px solid ${colors.borderBase}`,
        minHeight: isMobile ? 38 : 44,
        alignItems: "center",
        ...(isMobile ? {
          overflowX: "auto" as const,
          WebkitOverflowScrolling: "touch" as const,
          scrollbarWidth: "none" as const,
          msOverflowStyle: "none" as const,
        } : {}),
      }}
    >
      {!isMobile && (
        <span
          style={{
            fontSize: fontSizes.xs,
            color: colors.textMuted,
            fontFamily: fonts.sans,
            marginRight: 4,
            whiteSpace: "nowrap",
          }}
        >
          Cmdlets:
        </span>
      )}
      {cmdlets.map((name) => {
        const def = CMDLET_REGISTRY[name];
        const clr = getCmdletColor(def);
        return (
          <button
            key={name}
            draggable={!isMobile}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-builder-cmdlet", name);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onAddStage(name)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: isMobile ? "3px 8px" : "4px 10px",
              background: `${clr}22`,
              border: `1px solid ${clr}55`,
              borderRadius: 16,
              color: clr,
              fontSize: isMobile ? fontSizes.sm : fontSizes.xs,
              fontFamily: fonts.mono,
              fontWeight: 500,
              cursor: isMobile ? "pointer" : "grab",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
            title={isMobile ? `Tap to add ${name}` : `Drag to add ${name}`}
          >
            {!isMobile && <span>{def.icon}</span>}
            <span>{def.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

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
    .filter((name) => CMDLET_REGISTRY[name]);

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
        const isUsed = usedCmdlets?.has(name) ?? false;
        return (
          <button
            key={name}
            draggable={!isMobile && !isUsed}
            onDragStart={(e) => {
              if (isUsed) { e.preventDefault(); return; }
              e.dataTransfer.setData("application/x-builder-cmdlet", name);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => { if (!isUsed) onAddStage(name); }}
            disabled={isUsed}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: isMobile ? "3px 8px" : "4px 10px",
              background: isUsed ? `${clr}0a` : `${clr}22`,
              border: `1px solid ${isUsed ? `${clr}22` : `${clr}55`}`,
              borderRadius: 16,
              color: isUsed ? `${clr}66` : clr,
              fontSize: isMobile ? fontSizes.sm : fontSizes.xs,
              fontFamily: fonts.mono,
              fontWeight: 500,
              cursor: isUsed ? "default" : isMobile ? "pointer" : "grab",
              whiteSpace: "nowrap",
              userSelect: "none",
              opacity: isUsed ? 0.5 : 1,
            }}
            title={isUsed ? `${name} already in pipeline` : isMobile ? `Tap to add ${name}` : `Drag to add ${name}`}
          >
            <span>{def.icon}</span>
            <span>{def.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

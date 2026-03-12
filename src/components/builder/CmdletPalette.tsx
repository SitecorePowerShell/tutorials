import { CMDLET_REGISTRY, ALL_CMDLET_NAMES } from "../../builder/cmdletRegistry";
import { colors, fonts, fontSizes } from "../../theme";

interface CmdletPaletteProps {
  availableCmdlets?: string[];
  onAddStage: (cmdletName: string) => void;
  isMobile?: boolean;
}

export function CmdletPalette({ availableCmdlets, onAddStage, isMobile }: CmdletPaletteProps) {
  const cmdlets = (availableCmdlets ?? ALL_CMDLET_NAMES)
    .filter((name) => CMDLET_REGISTRY[name]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 12px",
        background: colors.bgPanel,
        borderBottom: `1px solid ${colors.borderBase}`,
        minHeight: 44,
        alignItems: "center",
      }}
    >
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
      {cmdlets.map((name) => {
        const def = CMDLET_REGISTRY[name];
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
              padding: "4px 10px",
              background: `${def.color}22`,
              border: `1px solid ${def.color}55`,
              borderRadius: 16,
              color: def.color,
              fontSize: isMobile ? fontSizes.sm : fontSizes.xs,
              fontFamily: fonts.mono,
              fontWeight: 500,
              cursor: isMobile ? "pointer" : "grab",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
            title={isMobile ? `Tap to add ${name}` : `Drag to add ${name}`}
          >
            <span>{def.icon}</span>
            <span>{def.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

import { colors, fontSizes } from "../theme";

export type MobilePanel = "lesson" | "editor" | "tree";

interface MobileTabBarProps {
  activeTab: MobilePanel;
  onTabChange: (tab: MobilePanel) => void;
  showTreeTab: boolean;
}

const tabs: { id: MobilePanel; icon: string; label: string }[] = [
  { id: "lesson", icon: "📖", label: "Lesson" },
  { id: "editor", icon: "⌨️", label: "Editor" },
  { id: "tree", icon: "🌲", label: "Tree" },
];

export function MobileTabBar({ activeTab, onTabChange, showTreeTab }: MobileTabBarProps) {
  const visibleTabs = showTreeTab ? tabs : tabs.filter((t) => t.id !== "tree");

  return (
    <div
      style={{
        display: "flex",
        background: colors.bgPanel,
        borderTop: `1px solid ${colors.borderBase}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        flexShrink: 0,
      }}
    >
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: 52,
              padding: "6px 0",
              background: active ? colors.bgActive : "transparent",
              border: "none",
              borderTop: active ? `2px solid ${colors.accentPrimary}` : "2px solid transparent",
              color: active ? colors.accentPrimary : colors.textSecondary,
              cursor: "pointer",
              fontSize: fontSizes.xs,
              fontFamily: "inherit",
              fontWeight: active ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

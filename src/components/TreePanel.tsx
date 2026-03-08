import { useState } from "react";
import type { SitecoreNode } from "../types";
import { colors, fonts, fontSizes } from "../theme";

function TreeNode({
  name,
  node,
  depth = 0,
}: {
  name: string;
  node: SitecoreNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = Object.entries(node._children || {});
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          paddingLeft: depth * 18 + 8,
          paddingTop: 3,
          paddingBottom: 3,
          cursor: hasChildren ? "pointer" : "default",
          fontSize: fontSizes.md,
          fontFamily: fonts.monoShort,
          color: hasChildren ? colors.accentLink : colors.textSubtle,
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderRadius: 3,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = colors.bgHover)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <span
          style={{
            width: 14,
            fontSize: fontSizes.xs,
            color: colors.accentPrimary,
            flexShrink: 0,
          }}
        >
          {hasChildren ? (expanded ? "▼" : "▶") : " "}
        </span>
        <span style={{ color: hasChildren ? colors.accentFolder : colors.textOutput }}>
          {(node._template || "").includes("Folder")
            ? "📁"
            : hasChildren
              ? "📂"
              : "📄"}
        </span>
        <span>{name}</span>
        <span
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.sm,
            marginLeft: "auto",
            paddingRight: 8,
          }}
        >
          {node._template?.split("/").pop() || ""}
        </span>
      </div>
      {expanded &&
        children.map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

interface TreePanelProps {
  tree: { sitecore: SitecoreNode };
}

export function TreePanel({ tree }: TreePanelProps) {
  return (
    <div
      style={{
        width: 280,
        borderLeft: `1px solid ${colors.borderBase}`,
        background: colors.bgSurface,
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${colors.borderBase}`,
          fontSize: fontSizes.base,
          fontWeight: 600,
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Sitecore Content Tree
      </div>
      <div style={{ padding: "8px 0" }}>
        <TreeNode name="sitecore" node={tree.sitecore} depth={0} />
      </div>
    </div>
  );
}

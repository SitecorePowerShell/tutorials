import { useState } from "react";
import type { SitecoreNode } from "../types";
import { colors, fonts, fontSizes } from "../theme";

function getTemplateIcon(template: string, hasChildren: boolean): string {
  const t = template.toLowerCase();
  if (t === "image") return "\uD83D\uDDBC\uFE0F";
  if (t === "pdf") return "\uD83D\uDCC4";
  if (t === "article") return "\uD83D\uDCF0";
  if (t === "product") return "\uD83D\uDCE6";
  if (t === "employee") return "\uD83D\uDC64";
  if (t === "configuration") return "\u2699\uFE0F";
  if (t === "landing page") return "\uD83C\uDFAF";
  if (t === "feature") return "\u2B50";
  if (t === "lookup item") return "\uD83D\uDD16";
  if (t.includes("folder")) return "\uD83D\uDCC1";
  if (hasChildren) return "\uD83D\uDCC2";
  return "\uD83D\uDCC4";
}

function TreeNode({
  name,
  node,
  depth = 0,
  isMobile,
}: {
  name: string;
  node: SitecoreNode;
  depth?: number;
  isMobile?: boolean;
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
          paddingTop: isMobile ? 8 : 3,
          paddingBottom: isMobile ? 8 : 3,
          minHeight: isMobile ? 40 : undefined,
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
          {getTemplateIcon(node._template || "", hasChildren)}
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
            isMobile={isMobile}
          />
        ))}
    </div>
  );
}

interface TreePanelProps {
  tree: { sitecore: SitecoreNode };
  isMobile?: boolean;
}

export function TreePanel({ tree, isMobile }: TreePanelProps) {
  return (
    <div
      style={{
        width: isMobile ? "100%" : 280,
        flex: isMobile ? 1 : undefined,
        borderLeft: isMobile ? "none" : `1px solid ${colors.borderBase}`,
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
        <TreeNode name="sitecore" node={tree.sitecore} depth={0} isMobile={isMobile} />
      </div>
    </div>
  );
}

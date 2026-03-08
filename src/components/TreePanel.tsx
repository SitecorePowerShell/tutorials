import { useState } from "react";
import type { SitecoreNode } from "../types";

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
          fontSize: 12.5,
          fontFamily: "'JetBrains Mono', monospace",
          color: hasChildren ? "#90caf9" : "#9e9eb8",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderRadius: 3,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "#1e1e3a")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <span
          style={{
            width: 14,
            fontSize: 10,
            color: "#5c6bc0",
            flexShrink: 0,
          }}
        >
          {hasChildren ? (expanded ? "▼" : "▶") : " "}
        </span>
        <span style={{ color: hasChildren ? "#7986cb" : "#b0b0c8" }}>
          {(node._template || "").includes("Folder")
            ? "📁"
            : hasChildren
              ? "📂"
              : "📄"}
        </span>
        <span>{name}</span>
        <span
          style={{
            color: "#555570",
            fontSize: 11,
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
        borderLeft: "1px solid #1a1a35",
        background: "#0d0d1f",
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1a1a35",
          fontSize: 12,
          fontWeight: 600,
          color: "#8888a8",
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

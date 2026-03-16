import React, { useState, useMemo } from "react";
import type { SitecoreNode } from "../types";
import { colors, fonts, fontSizes } from "../theme";
import { getItemProperty, getAllPropertyNames } from "../engine/properties";

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

function resolveNode(
  tree: { sitecore: SitecoreNode },
  path: string
): { name: string; node: SitecoreNode; path: string } | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments[0] !== "sitecore") return null;

  let current = tree.sitecore;
  let builtPath = "/sitecore";

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const children = current._children || {};
    if (!(seg in children)) return null;
    current = children[seg];
    builtPath += "/" + seg;
  }

  return { name: segments[segments.length - 1], node: current, path: builtPath };
}

const PropertyDetailView = React.memo(function PropertyDetailView({
  item,
  tree,
  onBack,
  onNavigate,
  isMobile,
}: {
  item: { name: string; node: SitecoreNode; path: string };
  tree: { sitecore: SitecoreNode };
  onBack: () => void;
  onNavigate: (item: { name: string; node: SitecoreNode; path: string }) => void;
  isMobile?: boolean;
}) {
  const [copiedProp, setCopiedProp] = useState<string | null>(null);

  const sitecoreItem = useMemo(() => ({ name: item.name, node: item.node, path: item.path }), [item.name, item.node, item.path]);
  const propNames = useMemo(() => getAllPropertyNames(sitecoreItem), [sitecoreItem]);

  const segments = item.path.split("/").filter(Boolean);

  const handleCopy = (propName: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedProp(propName);
    setTimeout(() => setCopiedProp(null), 1500);
  };

  return (
    <div style={{ padding: "8px 12px" }}>
      <div
        onClick={onBack}
        style={{
          color: colors.accentLink,
          cursor: "pointer",
          fontSize: fontSizes.sm,
          padding: "4px 0 8px",
          fontFamily: fonts.monoShort,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        ← Back to Tree
      </div>

      <div
        style={{
          fontSize: fontSizes.sm,
          fontFamily: fonts.monoShort,
          color: colors.textMuted,
          padding: "4px 0 10px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
        }}
      >
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const segPath = "/" + segments.slice(0, i + 1).join("/");
          return (
            <span key={segPath} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              {i > 0 && (
                <span style={{ color: colors.textDimmed, margin: "0 2px" }}>&gt;</span>
              )}
              {isLast ? (
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{seg}</span>
              ) : (
                <span
                  onClick={() => {
                    const resolved = resolveNode(tree, segPath);
                    if (resolved) onNavigate(resolved);
                  }}
                  style={{ color: colors.accentLink, cursor: "pointer", textDecoration: "underline" }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "underline")}
                >
                  {seg}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div
        style={{
          borderTop: `1px solid ${colors.borderBase}`,
        }}
      >
        {propNames.map((propName) => {
          const value = getItemProperty(sitecoreItem, propName);
          const isCopied = copiedProp === propName;
          return (
            <div
              key={propName}
              onClick={() => handleCopy(propName, value)}
              style={{
                display: "flex",
                padding: isMobile ? "8px 4px" : "4px 4px",
                minHeight: isMobile ? 36 : undefined,
                cursor: "pointer",
                fontSize: fontSizes.sm,
                fontFamily: fonts.monoShort,
                borderBottom: `1px solid ${colors.borderLight}`,
                borderRadius: 2,
                transition: "background 0.15s",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                title={propName}
                style={{
                  color: colors.textMuted,
                  width: "40%",
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {propName}
              </span>
              <span
                style={{
                  color: isCopied ? colors.statusSuccess : colors.textOutput,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {isCopied ? "Copied!" : value || "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const TreeNode = React.memo(function TreeNode({
  name,
  node,
  depth = 0,
  isMobile,
  parentPath,
  onSelect,
  expandedPaths,
  onToggleExpand,
}: {
  name: string;
  node: SitecoreNode;
  depth?: number;
  isMobile?: boolean;
  parentPath: string;
  onSelect: (item: { name: string; node: SitecoreNode; path: string }) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
}) {
  const children = Object.entries(node._children || {});
  const hasChildren = children.length > 0;
  const currentPath = parentPath ? `${parentPath}/${name}` : `/${name}`;
  const expanded = expandedPaths.has(currentPath);

  return (
    <div>
      <div
        style={{
          paddingLeft: depth * 18 + 8,
          paddingTop: isMobile ? 8 : 3,
          paddingBottom: isMobile ? 8 : 3,
          minHeight: isMobile ? 40 : undefined,
          cursor: "pointer",
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
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(currentPath);
          }}
          style={{
            width: 14,
            fontSize: fontSizes.xs,
            color: colors.accentPrimary,
            flexShrink: 0,
            cursor: hasChildren ? "pointer" : "default",
            padding: "2px 0",
          }}
        >
          {hasChildren ? (expanded ? "▼" : "▶") : " "}
        </span>
        <span
          onClick={() => onSelect({ name, node, path: currentPath })}
          style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, overflow: "hidden" }}
        >
          <span style={{ color: hasChildren ? colors.accentFolder : colors.textOutput, flexShrink: 0 }}>
            {getTemplateIcon(node._template || "", hasChildren)}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.sm,
              marginLeft: "auto",
              paddingRight: 8,
              flexShrink: 0,
            }}
          >
            {node._template?.split("/").pop() || ""}
          </span>
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
            parentPath={currentPath}
            onSelect={onSelect}
            expandedPaths={expandedPaths}
            onToggleExpand={onToggleExpand}
          />
        ))}
    </div>
  );
});

interface TreePanelProps {
  tree: { sitecore: SitecoreNode };
  isMobile?: boolean;
  embedded?: boolean;
}

/** Build initial expanded paths for nodes at depth < 2 */
function getDefaultExpandedPaths(tree: { sitecore: SitecoreNode }): Set<string> {
  const paths = new Set<string>();
  // depth 0: /sitecore
  paths.add("/sitecore");
  // depth 1: /sitecore/content, etc.
  for (const childName of Object.keys(tree.sitecore._children || {})) {
    paths.add(`/sitecore/${childName}`);
  }
  return paths;
}

export function TreePanel({ tree, isMobile, embedded }: TreePanelProps) {
  const [selectedItem, setSelectedItem] = useState<{
    name: string;
    node: SitecoreNode;
    path: string;
  } | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => getDefaultExpandedPaths(tree)
  );

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div
      style={{
        width: isMobile || embedded ? "100%" : 280,
        flex: isMobile || embedded ? 1 : undefined,
        borderLeft: isMobile || embedded ? "none" : `1px solid ${colors.borderBase}`,
        background: colors.bgSurface,
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      {selectedItem ? (
        <PropertyDetailView
          item={selectedItem}
          tree={tree}
          onBack={() => setSelectedItem(null)}
          onNavigate={setSelectedItem}
          isMobile={isMobile}
        />
      ) : (
        <>
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
            <TreeNode
              name="sitecore"
              node={tree.sitecore}
              depth={0}
              isMobile={isMobile}
              parentPath=""
              onSelect={setSelectedItem}
              expandedPaths={expandedPaths}
              onToggleExpand={handleToggleExpand}
            />
          </div>
        </>
      )}
    </div>
  );
}

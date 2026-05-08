import { useState } from "react";
import { colors, fonts, fontSizes } from "../theme";

interface VariablesPanelProps {
  /** Snapshot of user-defined variables (`$x = ...`). */
  variables: Record<string, unknown> | null;
  /** Current working directory (for $pwd). */
  cwd: string;
  /** Latest error message (for $error). */
  latestError?: string;
  /** Whether to render at mobile sizes. */
  isMobile?: boolean;
}

/**
 * Inspector for variables that exist after a script run. Three sections:
 *   1. User variables — anything assigned via `$x = ...`
 *   2. Automatic — built-ins backed by ScriptContext ($pwd, $error, $null, $true, $false)
 *   3. Sitecore — educational stubs that only resolve in a real SPE session
 */
export function VariablesPanel({
  variables,
  cwd,
  latestError,
  isMobile,
}: VariablesPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const userEntries = variables ? Object.entries(variables) : [];
  const hasUserVars = userEntries.length > 0;

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  if (!variables) {
    return (
      <div style={emptyStateStyle}>Variables aren't available for this provider.</div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: isMobile ? "10px 12px" : "12px 16px",
        fontFamily: fonts.sans,
        fontSize: fontSizes.body,
        color: colors.textPrimary,
      }}
    >
      <Section
        title="Your variables"
        emptyHint="Run a script with `$name = ...` to populate this section."
        empty={!hasUserVars}
      >
        {userEntries.map(([name, value]) => (
          <Row
            key={name}
            name={`$${name}`}
            value={value}
            isExpanded={!!expanded[name]}
            onToggle={() => toggle(name)}
          />
        ))}
      </Section>

      <Section title="Automatic">
        <Row name="$pwd" value={cwd} />
        <Row name="$error" value={latestError ? [latestError] : []} />
        <Row name="$null" value={null} />
        <Row name="$true" value={true} />
        <Row name="$false" value={false} />
      </Section>

      <Section
        title="Sitecore"
        subtitle="Resolved in real SPE only — placeholders shown here."
      >
        <Row
          name="$SitecoreContextItem"
          value="(current item from Sitecore.Context)"
          subtle
        />
        <Row name="$me" value="(the Sitecore.Context.User)" subtle />
        <Row name="$site" value="(the active Sitecore.Context.Site)" subtle />
      </Section>
    </div>
  );
}

// ============================================================================
// Internal layout helpers
// ============================================================================

const emptyStateStyle: React.CSSProperties = {
  padding: "20px 16px",
  color: colors.textMuted,
  fontStyle: "italic",
  fontSize: fontSizes.sm,
  fontFamily: fonts.sans,
};

function Section({
  title,
  subtitle,
  empty,
  emptyHint,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyHint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: fontSizes.xs,
          fontWeight: 700,
          color: colors.accentPrimary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
          borderBottom: `1px solid ${colors.borderLight}`,
          paddingBottom: 4,
        }}
      >
        {title}
        {subtitle && (
          <span
            style={{
              fontWeight: 400,
              color: colors.textMuted,
              textTransform: "none",
              letterSpacing: 0,
              marginLeft: 8,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {empty && (
        <div
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.xs,
            fontStyle: "italic",
            padding: "4px 0",
          }}
        >
          {emptyHint}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({
  name,
  value,
  isExpanded,
  onToggle,
  subtle,
}: {
  name: string;
  value: unknown;
  isExpanded?: boolean;
  onToggle?: () => void;
  subtle?: boolean;
}) {
  const { typeLabel, preview, expandable, children } = describeValue(value);
  const canExpand = expandable && !!onToggle;

  return (
    <div
      style={{
        padding: "4px 0",
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          cursor: canExpand ? "pointer" : "default",
        }}
        onClick={canExpand ? onToggle : undefined}
      >
        {canExpand && (
          <span
            aria-hidden="true"
            style={{
              color: colors.textMuted,
              fontSize: 10,
              width: 10,
              flexShrink: 0,
              transform: isExpanded ? "rotate(90deg)" : "none",
              transition: "transform 0.12s",
              display: "inline-block",
            }}
          >
            ▸
          </span>
        )}
        {!canExpand && <span style={{ width: 10, flexShrink: 0 }} aria-hidden="true" />}
        <code
          style={{
            fontFamily: fonts.mono,
            color: subtle ? colors.textMuted : colors.accentPrimary,
            fontSize: fontSizes.xs,
            flexShrink: 0,
          }}
        >
          {name}
        </code>
        <span
          style={{
            fontSize: 10,
            color: colors.textMuted,
            background: colors.bgPanel,
            border: `1px solid ${colors.borderDim}`,
            borderRadius: 3,
            padding: "0 5px",
            flexShrink: 0,
          }}
        >
          {typeLabel}
        </span>
        <code
          style={{
            fontFamily: fonts.mono,
            color: subtle ? colors.textMuted : colors.textCode,
            fontSize: fontSizes.xs,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontStyle: subtle ? "italic" : "normal",
            flex: 1,
            minWidth: 0,
          }}
          title={typeof preview === "string" ? preview : undefined}
        >
          {preview}
        </code>
      </div>
      {isExpanded && children && (
        <div style={{ marginLeft: 26, marginTop: 4 }}>{children}</div>
      )}
    </div>
  );
}

// ============================================================================
// Value introspection
// ============================================================================

interface ValueDescription {
  typeLabel: string;
  preview: string;
  expandable: boolean;
  children?: React.ReactNode;
}

const MAX_PREVIEW = 80;

function truncate(s: string): string {
  return s.length <= MAX_PREVIEW ? s : s.slice(0, MAX_PREVIEW - 1) + "…";
}

function describeValue(value: unknown): ValueDescription {
  if (value === null) return { typeLabel: "null", preview: "$null", expandable: false };
  if (value === undefined)
    return { typeLabel: "undefined", preview: "(unset)", expandable: false };
  if (typeof value === "boolean")
    return {
      typeLabel: "Boolean",
      preview: value ? "$true" : "$false",
      expandable: false,
    };
  if (typeof value === "number")
    return {
      typeLabel: Number.isInteger(value) ? "Int" : "Double",
      preview: String(value),
      expandable: false,
    };
  if (typeof value === "string")
    return {
      typeLabel: "String",
      preview: `"${truncate(value)}"`,
      expandable: false,
    };

  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 0) return { typeLabel: "Array[0]", preview: "@()", expandable: false };
    const sample = value
      .slice(0, 3)
      .map((v) => oneLine(v))
      .join(", ");
    return {
      typeLabel: `Array[${len}]`,
      preview: truncate(`@(${sample}${len > 3 ? ", …" : ""})`),
      expandable: true,
      children: <ChildList items={value.map((v, i) => ({ key: String(i), label: `[${i}]`, value: v }))} />,
    };
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    // Sitecore item (has .node)
    if ("node" in obj && typeof obj.node === "object") {
      const node = obj.node as Record<string, unknown>;
      const name = String(obj.name ?? "(unnamed)");
      const tpl = String(node._template ?? "?");
      return {
        typeLabel: "Item",
        preview: `{Name=${name}, Template=${tpl}}`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["name", "path", "node"])} />,
      };
    }

    // DialogBuilder marker
    if ("_dialogBuilder" in obj) {
      const title = String(obj.title ?? "Untitled");
      const fields = (obj.fields as unknown[] | undefined) ?? [];
      return {
        typeLabel: "DialogBuilder",
        preview: `"${title}" — ${fields.length} field(s)`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_dialogBuilder"])} />,
      };
    }

    // SearchBuilder marker
    if ("_searchBuilder" in obj) {
      const idx = String(obj.index ?? "?");
      const filters = (obj.filters as unknown[] | undefined) ?? [];
      return {
        typeLabel: "SearchBuilder",
        preview: `${idx} — ${filters.length} filter(s)`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_searchBuilder"])} />,
      };
    }

    // SearchResult
    if ("_searchResult" in obj) {
      const total = obj.TotalCount ?? "?";
      const more = obj.HasMore ? ", HasMore" : "";
      return {
        typeLabel: "SearchResult",
        preview: `${total} item(s)${more}`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_searchResult"])} />,
      };
    }

    // DialogResult
    if ("_dialogResult" in obj) {
      const result = String(obj.Result ?? "?");
      return {
        typeLabel: "DialogResult",
        preview: `Result=${result}`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_dialogResult"])} />,
      };
    }

    // User
    if ("_isUser" in obj) {
      return {
        typeLabel: "User",
        preview: `${obj.Name ?? "?"}${obj.IsAdministrator ? " (admin)" : ""}`,
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_isUser", "name"])} />,
      };
    }

    // Role
    if ("_isRole" in obj) {
      return {
        typeLabel: "Role",
        preview: String(obj.Name ?? "?"),
        expandable: true,
        children: <ChildList items={kvPairs(obj, ["_isRole", "name"])} />,
      };
    }

    // Generic object
    const keys = Object.keys(obj);
    return {
      typeLabel: "Object",
      preview: truncate(`@{${keys.slice(0, 3).join("; ")}${keys.length > 3 ? "; …" : ""}}`),
      expandable: keys.length > 0,
      children: <ChildList items={kvPairs(obj, [])} />,
    };
  }

  return {
    typeLabel: typeof value,
    preview: String(value),
    expandable: false,
  };
}

function oneLine(value: unknown): string {
  if (value === null) return "$null";
  if (typeof value === "string") return `"${truncate(value)}"`;
  if (typeof value === "object") {
    if (Array.isArray(value)) return `Array[${value.length}]`;
    const obj = value as Record<string, unknown>;
    if ("name" in obj) return String(obj.name);
    return "Object";
  }
  return String(value);
}

function kvPairs(
  obj: Record<string, unknown>,
  exclude: string[]
): { key: string; label: string; value: unknown }[] {
  const skip = new Set(exclude);
  return Object.entries(obj)
    .filter(([k]) => !skip.has(k))
    .map(([k, v]) => ({ key: k, label: k, value: v }));
}

function ChildList({
  items,
}: {
  items: { key: string; label: string; value: unknown }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      {items.map((it) => {
        const { typeLabel, preview } = describeValue(it.value);
        return (
          <div
            key={it.key}
            style={{
              display: "flex",
              gap: 8,
              padding: "2px 0",
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            <span
              style={{
                color: colors.textSecondary,
                flexShrink: 0,
              }}
            >
              {it.label}
            </span>
            <span style={{ color: colors.textMuted, fontSize: 10, flexShrink: 0 }}>
              {typeLabel}
            </span>
            <span
              style={{
                color: colors.textCode,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {preview}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { colors, fonts, fontSizes } from "../theme";
import { tokenize, renderTokens, type Token } from "./HighlightedCode";

// The shared tokenizer requires whitespace before `-operator` / `-param`
// patterns. Prepend a space and strip it from the first plain token so
// "-eq" at column 0 still highlights.
function tokenizeForDisplay(text: string): Token[] {
  const tokens = tokenize(" " + text);
  if (tokens.length > 0 && tokens[0].type === "plain" && tokens[0].text.startsWith(" ")) {
    const stripped = tokens[0].text.slice(1);
    if (stripped === "") tokens.shift();
    else tokens[0] = { ...tokens[0], text: stripped };
  }
  return tokens;
}

interface CheatSheetDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
  /** Current lesson ID (lesson.id from YAML) — enables scoped view */
  lessonId?: string;
}

/**
 * Map lesson IDs to the cheat-sheet section IDs that are most relevant.
 * Empty array = show all (no specific scope, e.g. playground/capstone).
 * Lessons not listed default to "all".
 */
const LESSON_SECTIONS: Record<string, string[]> = {
  "pipeline-builder-intro": ["pipeline", "paths"],
  "welcome": ["paths"],
  "get-children": ["paths", "pipeline"],
  "pipeline-basics": ["pipeline", "paths"],
  "filtering-deep": ["operators", "pipeline", "automatics"],
  "provider-paths": ["paths"],
  "ise-intro": ["paths", "pipeline"],
  "variables": ["automatics"],
  "foreach-object": ["automatics", "pipeline"],
  "content-reports": ["pipeline", "items", "find"],
  "creating-items": ["items", "paths"],
  "moving-copying": ["items", "paths"],
  "compound-filters": ["operators", "pipeline", "automatics"],
  "numeric-select": ["pipeline", "operators"],
  "string-operations": ["operators", "dotnet"],
  "dotnet-types": ["dotnet"],
  "data-export": ["pipeline", "dotnet", "items"],
  "conditionals": ["operators", "automatics"],
  "bulk-updates": ["items", "operators", "pipeline", "automatics"],
  "find-item-intro": ["find"],
  "find-item-filters": ["find"],
  "find-item-advanced": ["find"],
  "find-item-comparison": ["find", "pipeline"],
  "playground": [],
  "template-introspection": ["items"],
  "field-deep-dive": ["items"],
  "error-handling": ["automatics"],
  "publishing": ["items"],
  "real-world-scenarios": [],
  "dialog-builder": ["dialog", "pipeline", "automatics"],
  "search-builder": ["search", "find", "pipeline"],
  "security": ["security", "pipeline"],
};

interface Row {
  left: string;
  right: string;
  /** optional plain-text string used only for search filtering */
  search?: string;
}

interface Section {
  id: string;
  title: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    id: "paths",
    title: "Sitecore paths",
    rows: [
      { left: "master:\\content\\Home", right: "drive-qualified path" },
      { left: "/sitecore/content/Home", right: "absolute (forward slash)" },
      { left: ".", right: "current item" },
      { left: "..", right: "parent" },
      { left: "*", right: "wildcard at any segment" },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline patterns",
    rows: [
      {
        left: "Get-ChildItem -Recurse | Where-Object Name -like '*home*'",
        right: "filter recursively",
      },
      {
        left: "Get-ChildItem | Sort-Object Name | Select-Object -First 5",
        right: "sort + top N",
      },
      { left: "Get-ChildItem | Group-Object TemplateName", right: "group by property" },
      {
        left: "Get-ChildItem | ForEach-Object { $_.Name.ToUpper() }",
        right: "transform each",
      },
      { left: "Get-ChildItem | Measure-Object", right: "count" },
    ],
  },
  {
    id: "operators",
    title: "Comparison operators",
    rows: [
      { left: "-eq  -ne", right: "equal / not equal" },
      { left: "-gt  -ge  -lt  -le", right: "numeric comparison" },
      { left: "-like  -notlike", right: "wildcard match (* ?)" },
      { left: "-match  -notmatch", right: "regex match" },
      { left: "-contains  -in", right: "collection membership" },
      { left: "-replace 'a','b'", right: "regex replace" },
      { left: "-split  -join", right: "string split / join" },
      { left: "-and  -or  -not  !", right: "boolean composition" },
    ],
  },
  {
    id: "automatics",
    title: "Automatic variables",
    rows: [
      { left: "$_  $PSItem", right: "current pipeline item" },
      { left: "$null", right: "the null value" },
      { left: "$true  $false", right: "booleans" },
      { left: "$error", right: "recent errors (newest first)" },
      { left: "$pwd", right: "current location" },
    ],
  },
  {
    id: "items",
    title: "Item management",
    rows: [
      {
        left: 'New-Item -Path "master:\\content\\Home" -Name "About" -ItemType "Sample/Sample Item"',
        right: "create item",
      },
      { left: "Remove-Item -Path <path> [-Permanently]", right: "delete (recycle by default)" },
      { left: "Move-Item -Path <path> -Destination <path>", right: "move subtree" },
      { left: "Copy-Item -Path <path> -Destination <path>", right: "duplicate (new ID)" },
      {
        left: 'Set-ItemProperty -Path <path> -Name "Title" -Value "Welcome"',
        right: "set field value",
      },
      {
        left: "Publish-Item -Path <path> -Target web -PublishMode Smart",
        right: "publish to target",
      },
    ],
  },
  {
    id: "find",
    title: "Find-Item (index search)",
    rows: [
      { left: "-Index sitecore_master_index", right: "required: target index" },
      {
        left: '-Criteria @{Filter="Equals"; Field="_templatename"; Value="Article"}',
        right: "single criterion",
      },
      {
        left: "-Criteria @{...}, @{...}, @{...}",
        right: "multiple (AND)",
      },
      {
        left: "Filter values: Equals, StartsWith, Contains, GreaterThan, LessThan, Between",
        right: "filter operators",
      },
      { left: '-OrderBy "_name"', right: "sort results" },
      { left: "-First 10  /  -Last 10", right: "paginate" },
      { left: '-Where "TemplateName = @0" -WhereValues "Article"', right: "Dynamic LINQ" },
    ],
  },
  {
    id: "dotnet",
    title: ".NET shortcuts",
    rows: [
      { left: "[DateTime]::Now", right: "current date/time" },
      { left: "[DateTime]::Today", right: "midnight today" },
      { left: "[Math]::Round($x, 2)", right: "round to 2 decimals" },
      { left: "[guid]::NewGuid()", right: "new GUID" },
      { left: "[string]::IsNullOrEmpty($s)", right: "blank check" },
    ],
  },
  {
    id: "security",
    title: "Security & access",
    rows: [
      { left: "Get-User -Current", right: "the current user" },
      { left: 'Get-User -Identity "sitecore\\admin"', right: "look up by name" },
      { left: 'Get-User -Filter "sitecore\\*"', right: "wildcard search" },
      { left: 'Get-User $u | Select -ExpandProperty MemberOf', right: "list a user's roles" },
      { left: 'Get-Role -Filter "sitecore\\*"', right: "list roles in a domain" },
      { left: 'Get-RoleMember -Identity "sitecore\\Editors"', right: "members of a role" },
      { left: 'New-Role -Identity "sitecore\\Editors" -Description "..."', right: "create a role" },
      {
        left: 'Add-RoleMember -Identity "sitecore\\Editors" -Members "sitecore\\michael"',
        right: "grant role membership",
      },
      {
        left: 'Test-ItemAcl -Path <path> -Identity <user> -AccessRight item:write',
        right: "can <user> do <right>?",
      },
      {
        left: "Rights: item:read, item:write, item:rename, item:create, item:delete, item:admin",
        right: "common access rights",
      },
      { left: 'Test-Account -Identity "sitecore\\admin"', right: "does this identity exist?" },
    ],
  },
  {
    id: "search",
    title: "SearchBuilder",
    rows: [
      { left: "Import-Function -Name SearchBuilder", right: "load the library (once)" },
      {
        left: '$search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion',
        right: "create a builder with paging",
      },
      {
        left: '$search | Add-TemplateFilter -Name "Article"',
        right: "filter by template name (or -Id)",
      },
      {
        left: '$search | Add-FieldEquals -Field "country" -Value "US"',
        right: "exact field match",
      },
      {
        left: '$search | Add-FieldContains -Field "Title" -Value "Welcome"',
        right: "substring / phrase match",
      },
      {
        left: '$search | Add-DateRangeFilter -Field "__Updated" -Last "30d"',
        right: "relative date (also -From/-To)",
      },
      {
        left: '$search | Add-SearchFilter -Field "x" -Filter "Equals" -Value "y" -Invert -Boost 5',
        right: "low-level filter (NOT, weight)",
      },
      { left: "$results = $search | Invoke-Search", right: "execute; pagination auto-advances" },
      { left: "$results.Items  /  .HasMore  /  .TotalCount", right: "result properties" },
      { left: "$search | Reset-SearchBuilder", right: "rewind paging to page 1" },
    ],
  },
  {
    id: "dialog",
    title: "DialogBuilder",
    rows: [
      { left: "Import-Function -Name DialogBuilder", right: "load the library (once)" },
      {
        left: '$dialog = New-DialogBuilder -Title "..." -ShowHints',
        right: "create a builder",
      },
      {
        left: '$dialog | Add-TextField -Name "x" -Title "X" -Mandatory',
        right: "text input (use -IsPassword/-IsEmail/-IsNumber)",
      },
      {
        left: '$dialog | Add-MultiLineTextField -Name "x" -Title "X" -Lines 5',
        right: "text area",
      },
      { left: '$dialog | Add-Checkbox -Name "x" -Title "X"', right: "boolean checkbox" },
      {
        left: '$dialog | Add-Dropdown -Name "x" -Title "X" -Options @{...}',
        right: "single select (also Add-RadioButtons, Add-Checklist)",
      },
      {
        left: '$dialog | Add-DateTimePicker -Name "x" -Title "X" -DateOnly',
        right: "date / datetime",
      },
      {
        left: '$dialog | Add-ItemPicker -Name "x" -Title "X" -Root "/sitecore/content"',
        right: "Sitecore item picker (also Add-Droptree, Add-TreeList)",
      },
      { left: "$result = $dialog | Invoke-Dialog", right: "show; bind $-vars to scope" },
      {
        left: "Layout: -Tab \"Foo\"  /  -Columns N  /  -ParentGroupId N",
        right: "tabs, 12-col grid, conditional show/hide",
      },
    ],
  },
];

function rowMatches(row: Row, q: string): boolean {
  const hay = (row.left + " " + row.right + " " + (row.search ?? "")).toLowerCase();
  return hay.includes(q);
}

export function CheatSheetDrawer({ open, onClose, isMobile, lessonId }: CheatSheetDrawerProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<"lesson" | "all">("lesson");
  const panelRef = useRef<HTMLDivElement>(null);

  const lessonSectionIds = lessonId ? LESSON_SECTIONS[lessonId] : undefined;
  // "Lesson" scope is meaningful only when we have a non-empty mapping for the
  // current lesson. Otherwise the toggle is hidden and we show everything.
  const lessonScopeAvailable = !!lessonSectionIds && lessonSectionIds.length > 0;
  const effectiveScope = lessonScopeAvailable ? scope : "all";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  // Click-outside (desktop only — mobile uses backdrop)
  useEffect(() => {
    if (!open || isMobile) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose, isMobile]);

  const filtered = useMemo(() => {
    // Scope: keep all sections, or only those relevant to the active lesson
    // (in the lesson's declared order, so the most relevant section is on top).
    let scoped: Section[];
    if (effectiveScope === "lesson" && lessonSectionIds && lessonSectionIds.length > 0) {
      const byId = new Map(SECTIONS.map((s) => [s.id, s]));
      scoped = lessonSectionIds.map((id) => byId.get(id)).filter((s): s is Section => !!s);
    } else {
      scoped = SECTIONS;
    }

    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped
      .map((s) => ({ ...s, rows: s.rows.filter((r) => rowMatches(r, q)) }))
      .filter((s) => s.rows.length > 0);
  }, [query, effectiveScope, lessonSectionIds]);

  if (!open) return null;

  const drawer = (
    <div
      ref={panelRef}
      role="complementary"
      aria-label="PowerShell cheat sheet"
      style={{
        background: colors.bgPanel,
        borderLeft: isMobile ? "none" : `1px solid ${colors.borderBase}`,
        borderTop: isMobile ? `1px solid ${colors.borderBase}` : "none",
        borderTopLeftRadius: isMobile ? 12 : 0,
        borderTopRightRadius: isMobile ? 12 : 0,
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: fonts.sans,
        color: colors.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.borderBase}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h2
            style={{
              margin: 0,
              fontSize: fontSizes.body,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Cheat sheet
          </h2>
          <span style={{ fontSize: fontSizes.xs, color: colors.textMuted }}>
            quick reference
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close cheat sheet"
          style={{
            background: "none",
            border: "none",
            color: colors.textMuted,
            cursor: "pointer",
            fontSize: 18,
            padding: 4,
          }}
        >
          &#x2715;
        </button>
      </div>

      {/* Scope toggle + Search */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${colors.borderLight}`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {lessonScopeAvailable && (
          <div
            role="tablist"
            aria-label="Cheat sheet scope"
            style={{
              display: "flex",
              border: `1px solid ${colors.borderBase}`,
              borderRadius: 4,
              overflow: "hidden",
              fontSize: fontSizes.xs,
            }}
          >
            {(["lesson", "all"] as const).map((s) => {
              const active = effectiveScope === s;
              return (
                <button
                  key={s}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScope(s)}
                  style={{
                    flex: 1,
                    background: active ? colors.bgActive : "transparent",
                    border: "none",
                    color: active ? colors.textPrimary : colors.textMuted,
                    fontFamily: "inherit",
                    fontSize: fontSizes.xs,
                    fontWeight: active ? 600 : 400,
                    padding: "5px 8px",
                    cursor: "pointer",
                  }}
                >
                  {s === "lesson" ? "📌 This lesson" : "All topics"}
                </button>
              );
            })}
          </div>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter… (e.g. 'where', '-match', 'guid')"
          aria-label="Filter cheat sheet"
          style={{
            width: "100%",
            background: colors.bgDeep,
            border: `1px solid ${colors.borderBase}`,
            borderRadius: 4,
            color: colors.textPrimary,
            padding: "6px 10px",
            fontSize: fontSizes.sm,
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: "20px 16px",
              fontSize: fontSizes.sm,
              color: colors.textMuted,
              textAlign: "center",
            }}
          >
            No matches.
          </div>
        )}
        {filtered.map((section) => {
          const isCollapsed = !!collapsed[section.id];
          return (
            <div key={section.id} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                aria-expanded={!isCollapsed}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: `1px solid ${colors.borderLight}`,
                  color: colors.accentPrimary,
                  textAlign: "left",
                  padding: "8px 16px",
                  fontFamily: "inherit",
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{section.title}</span>
                <span aria-hidden="true" style={{ color: colors.textMuted, fontSize: 10 }}>
                  {isCollapsed ? "▸" : "▾"}
                </span>
              </button>
              {!isCollapsed && (
                <div style={{ padding: "4px 0" }}>
                  {section.rows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                        gap: 12,
                        padding: "5px 16px",
                        fontSize: fontSizes.xs,
                        borderBottom: i < section.rows.length - 1
                          ? `1px solid ${colors.borderLight}`
                          : "none",
                      }}
                    >
                      <code
                        style={{
                          fontFamily: fonts.mono,
                          color: colors.textCode,
                          background: colors.bgDeep,
                          border: `1px solid ${colors.borderLight}`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          alignSelf: "start",
                        }}
                      >
                        {renderTokens(tokenizeForDisplay(row.left))}
                      </code>
                      <span style={{ color: colors.textSecondary, alignSelf: "center" }}>
                        {row.right}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Mobile: bottom sheet with backdrop
  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 95 }}>
        <div
          onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "75vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {drawer}
        </div>
      </div>
    );
  }

  // Desktop: right-side drawer
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        zIndex: 95,
        boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
      }}
    >
      {drawer}
    </div>
  );
}

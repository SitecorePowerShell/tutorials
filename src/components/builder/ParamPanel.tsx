import { useState, useEffect } from "react";
import type { PipelineStage } from "../../builder/assembleCommand";
import { CMDLET_REGISTRY, COMMON_PROPERTIES, FILTER_OPERATORS, FOREACH_OPERATORS, CRITERIA_FILTER_TYPES, INDEX_FIELDS, getCmdletColor } from "../../builder/cmdletRegistry";
import { colors, fonts, fontSizes } from "../../theme";

interface ParamPanelProps {
  stage: PipelineStage | null;
  onUpdateParams: (stageId: string, params: Record<string, string>) => void;
  onUpdateSwitches: (stageId: string, switches: string[]) => void;
  isMobile?: boolean;
}

interface WhereConditionRow {
  property: string;
  operator: string;
  value: string;
}

type ForEachOpType = "property" | "interpolation" | "operator" | "writehost";

export function ParamPanel({ stage, onUpdateParams, onUpdateSwitches, isMobile }: ParamPanelProps) {
  // Where-Object multi-row state
  const [whereRows, setWhereRows] = useState<WhereConditionRow[]>([{ property: "", operator: "-eq", value: "" }]);
  const [whereJoinOperator, setWhereJoinOperator] = useState<"-and" | "-or">("-and");
  const [useStructured, setUseStructured] = useState(true);

  // ForEach-Object structured state
  const [foreachOpType, setForeachOpType] = useState<ForEachOpType>("property");
  const [foreachProperty, setForeachProperty] = useState("");
  const [foreachTemplate, setForeachTemplate] = useState("");
  const [foreachOperator, setForeachOperator] = useState("-replace");
  const [foreachOperatorArgs, setForeachOperatorArgs] = useState("");

  // Criteria builder state for Find-Item
  interface CriterionRow {
    Filter: string;
    Field: string;
    Value: string;
    Invert: boolean;
  }
  const [criteriaRows, setCriteriaRows] = useState<CriterionRow[]>([{ Filter: "Equals", Field: "_templatename", Value: "", Invert: false }]);

  // Reset all structured state when selected stage changes
  useEffect(() => {
    setUseStructured(true);
    setForeachOpType("property");
    setForeachProperty("");
    setForeachTemplate("");
    setForeachOperator("-replace");
    setForeachOperatorArgs("");

    // Parse existing FilterScript back into whereRows
    const filterScript = stage?.params.FilterScript;
    if (filterScript) {
      const inner = filterScript.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
      if (inner) {
        // Detect join operator
        const hasOr = / -or /i.test(inner);
        const joinOp: "-and" | "-or" = hasOr ? "-or" : "-and";
        setWhereJoinOperator(joinOp);
        const parts = inner.split(new RegExp(`\\s+${joinOp}\\s+`, "i"));
        const parsed = parts.map((part) => {
          const m = part.match(/\$_\.(\S+)\s+(-\w+)\s+"([^"]*)"/);
          if (m) return { property: m[1], operator: m[2], value: m[3] };
          const m2 = part.match(/\$_\.(\S+)\s+(-\w+)\s+(\S+)/);
          if (m2) return { property: m2[1], operator: m2[2], value: m2[3] };
          return { property: "", operator: "-eq", value: "" };
        });
        if (parsed.some((r) => r.property)) {
          setWhereRows(parsed);
        } else {
          setWhereRows([{ property: "", operator: "-eq", value: "" }]);
        }
      } else {
        setWhereRows([{ property: "", operator: "-eq", value: "" }]);
      }
    } else {
      setWhereRows([{ property: "", operator: "-eq", value: "" }]);
      setWhereJoinOperator("-and");
    }

    // Parse existing Process back into forEach state
    const process = stage?.params.Process;
    if (process) {
      const inner = process.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
      if (inner.startsWith("Write-Host")) {
        const pm = inner.match(/Write-Host\s+\$_\.(\S+)/);
        setForeachOpType("writehost");
        setForeachProperty(pm ? pm[1] : "");
      } else if (inner.startsWith('"') && inner.includes("$(")) {
        setForeachOpType("interpolation");
        const pm = inner.match(/\$\(\$_\.(\S+)\)/);
        setForeachProperty(pm ? pm[1] : "");
        const tm = inner.match(/^"([^$]*)\$\(/);
        setForeachTemplate(tm ? tm[1] : "");
      } else if (/ -\w+/.test(inner)) {
        setForeachOpType("operator");
        const pm = inner.match(/\$_\.(\S+)\s+(-\w+)\s*(.*)/);
        if (pm) {
          setForeachProperty(pm[1]);
          setForeachOperator(pm[2]);
          setForeachOperatorArgs(pm[3] || "");
        }
      } else {
        setForeachOpType("property");
        const pm = inner.match(/\$_\.(\S+)/);
        setForeachProperty(pm ? pm[1] : "");
      }
    }

    // Parse existing criteria from stage params if present
    if (stage?.params.Criteria) {
      try {
        const parsed = JSON.parse(stage.params.Criteria);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCriteriaRows(parsed.map((c: CriterionRow) => ({
            Filter: c.Filter || "Equals",
            Field: c.Field || "_templatename",
            Value: c.Value || "",
            Invert: c.Invert || false,
          })));
          return;
        }
      } catch { /* ignore parse errors */ }
    }
    setCriteriaRows([{ Filter: "Equals", Field: "_templatename", Value: "", Invert: false }]);
  }, [stage?.id]);

  if (!stage) {
    return (
      <div
        style={{
          padding: 16,
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          fontFamily: fonts.sans,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        Click a stage in the pipeline to configure its parameters
      </div>
    );
  }

  const def = CMDLET_REGISTRY[stage.cmdlet];
  if (!def) return null;

  const inputStyle: React.CSSProperties = {
    background: colors.bgDeep,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: 4,
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: isMobile ? fontSizes.sm : fontSizes.xs,
    padding: "5px 8px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: "auto",
    minWidth: 100,
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: fonts.sans,
    fontWeight: 600,
    marginBottom: 4,
    display: "block",
  };

  const switchToFreeTextButton = (
    <button
      onClick={() => setUseStructured(false)}
      style={{
        background: "none",
        border: "none",
        color: colors.accentLink,
        fontSize: fontSizes.xs,
        cursor: "pointer",
        padding: "4px 0 0 0",
        fontFamily: fonts.sans,
      }}
    >
      Switch to free-text
    </button>
  );

  const switchToStructuredButton = (paramName: string) => (
    <button
      onClick={() => setUseStructured(true)}
      style={{
        background: "none",
        border: "none",
        color: colors.accentLink,
        fontSize: fontSizes.xs,
        cursor: "pointer",
        padding: "4px 0 0 0",
        fontFamily: fonts.sans,
      }}
    >
      Switch to structured
    </button>
  );

  const handleParamChange = (paramName: string, value: string) => {
    onUpdateParams(stage.id, { ...stage.params, [paramName]: value });
  };

  // --- Where-Object multi-row helpers ---

  const assembleWhereFilter = (rows: WhereConditionRow[], joinOp: string) => {
    const conditions = rows
      .filter((r) => r.property)
      .map((r) => `$_.${r.property} ${r.operator} "${r.value}"`);
    if (conditions.length === 0) return "";
    return `{ ${conditions.join(` ${joinOp} `)} }`;
  };

  const updateWhereRows = (newRows: WhereConditionRow[], joinOp?: string) => {
    setWhereRows(newRows);
    const op = joinOp ?? whereJoinOperator;
    const assembled = assembleWhereFilter(newRows, op);
    if (assembled) {
      onUpdateParams(stage.id, { ...stage.params, FilterScript: assembled });
    }
  };

  const handleWhereRowChange = (index: number, field: keyof WhereConditionRow, value: string) => {
    const newRows = whereRows.map((row, i) => i === index ? { ...row, [field]: value } : row);
    updateWhereRows(newRows);
  };

  const addWhereRow = () => {
    updateWhereRows([...whereRows, { property: "", operator: "-eq", value: "" }]);
  };

  const removeWhereRow = (index: number) => {
    if (whereRows.length <= 1) return;
    const newRows = whereRows.filter((_, i) => i !== index);
    updateWhereRows(newRows);
  };

  const handleJoinOperatorChange = (joinOp: "-and" | "-or") => {
    setWhereJoinOperator(joinOp);
    updateWhereRows(whereRows, joinOp);
  };

  // --- ForEach-Object structured helpers ---

  const assembleForEachExpression = (opType: ForEachOpType, prop: string, template: string, op: string, args: string) => {
    if (!prop) return "";
    switch (opType) {
      case "property":
        return `{ $_.${prop} }`;
      case "interpolation":
        return `{ "${template}$($_.${prop})" }`;
      case "operator":
        return args ? `{ $_.${prop} ${op} ${args} }` : `{ $_.${prop} ${op} }`;
      case "writehost":
        return `{ Write-Host $_.${prop} }`;
    }
  };

  const updateForEachParam = (opType: ForEachOpType, prop: string, template: string, op: string, args: string) => {
    const assembled = assembleForEachExpression(opType, prop, template, op, args);
    if (assembled) {
      onUpdateParams(stage.id, { ...stage.params, Process: assembled });
    }
  };

  // Criteria builder helpers
  const updateCriteriaParam = (rows: CriterionRow[]) => {
    setCriteriaRows(rows);
    const json = JSON.stringify(rows.map((r) => ({
      Filter: r.Filter,
      Field: r.Filter === "DescendantOf" ? undefined : r.Field,
      Value: r.Value,
      Invert: r.Invert || undefined,
    })));
    onUpdateParams(stage.id, { ...stage.params, Criteria: json });
  };

  const handleCriterionChange = (index: number, field: keyof CriterionRow, value: string | boolean) => {
    const newRows = criteriaRows.map((row, i) => i === index ? { ...row, [field]: value } : row);
    updateCriteriaParam(newRows);
  };

  const addCriterionRow = () => {
    updateCriteriaParam([...criteriaRows, { Filter: "Equals", Field: "_templatename", Value: "", Invert: false }]);
  };

  const removeCriterionRow = (index: number) => {
    if (criteriaRows.length <= 1) return;
    const newRows = criteriaRows.filter((_, i) => i !== index);
    updateCriteriaParam(newRows);
  };

  const handleSwitchToggle = (sw: string) => {
    const newSwitches = stage.switches.includes(sw)
      ? stage.switches.filter((s) => s !== sw)
      : [...stage.switches, sw];
    onUpdateSwitches(stage.id, newSwitches);
  };

  // --- Render helpers ---

  const renderWhereStructured = (paramDef: { name: string; required?: boolean }) => (
    <div key={paramDef.name}>
      <label style={labelStyle}>
        {paramDef.name} {paramDef.required && <span style={{ color: colors.statusError }}>*</span>}
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {whereRows.map((row, idx) => (
          <div key={idx}>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: isMobile ? "wrap" : "nowrap",
                alignItems: "center",
              }}
            >
              <select
                aria-label="Filter property"
                value={row.property}
                onChange={(e) => handleWhereRowChange(idx, "property", e.target.value)}
                disabled={stage.locked}
                style={selectStyle}
              >
                <option value="">Property...</option>
                {COMMON_PROPERTIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                aria-label="Filter operator"
                value={row.operator}
                onChange={(e) => handleWhereRowChange(idx, "operator", e.target.value)}
                disabled={stage.locked}
                style={selectStyle}
              >
                {FILTER_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                type="text"
                aria-label="Filter value"
                value={row.value}
                onChange={(e) => handleWhereRowChange(idx, "value", e.target.value)}
                disabled={stage.locked}
                placeholder="Value"
                style={{ ...inputStyle, flex: 1, minWidth: 80 }}
              />
              {whereRows.length > 1 && !stage.locked && (
                <button
                  onClick={() => removeWhereRow(idx)}
                  aria-label="Remove condition"
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.statusError,
                    fontSize: fontSizes.sm,
                    cursor: "pointer",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {idx < whereRows.length - 1 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: `1px solid ${colors.borderMedium}`,
                  }}
                >
                  {(["-and", "-or"] as const).map((op) => (
                    <button
                      key={op}
                      onClick={() => handleJoinOperatorChange(op)}
                      disabled={stage.locked}
                      aria-label={`Join with ${op}`}
                      style={{
                        background: whereJoinOperator === op ? colors.accentLink : colors.bgDeep,
                        color: whereJoinOperator === op ? "#fff" : colors.textMuted,
                        border: "none",
                        padding: "2px 10px",
                        fontSize: fontSizes.xs,
                        fontFamily: fonts.mono,
                        cursor: stage.locked ? "default" : "pointer",
                        fontWeight: whereJoinOperator === op ? 600 : 400,
                      }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {!stage.locked && (
        <button
          onClick={addWhereRow}
          style={{
            background: "none",
            border: `1px dashed ${colors.borderMedium}`,
            borderRadius: 4,
            color: colors.accentLink,
            fontSize: fontSizes.xs,
            cursor: "pointer",
            padding: "4px 10px",
            fontFamily: fonts.sans,
            marginTop: 4,
          }}
        >
          + Add Condition
        </button>
      )}
      {switchToFreeTextButton}
    </div>
  );

  const renderForEachStructured = (paramDef: { name: string; required?: boolean }) => {
    const preview = assembleForEachExpression(foreachOpType, foreachProperty || "Name", foreachTemplate, foreachOperator, foreachOperatorArgs) || "{ $_.Name }";

    return (
      <div key={paramDef.name}>
        <label style={labelStyle}>
          {paramDef.name} {paramDef.required && <span style={{ color: colors.statusError }}>*</span>}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: isMobile ? "wrap" : "nowrap",
              alignItems: "center",
            }}
          >
            <select
              aria-label="ForEach operation type"
              value={foreachOpType}
              onChange={(e) => {
                const newType = e.target.value as ForEachOpType;
                setForeachOpType(newType);
                updateForEachParam(newType, foreachProperty, foreachTemplate, foreachOperator, foreachOperatorArgs);
              }}
              disabled={stage.locked}
              style={selectStyle}
            >
              <option value="property">Property access</option>
              <option value="interpolation">String interpolation</option>
              <option value="operator">Operator expression</option>
              <option value="writehost">Write-Host</option>
            </select>
            <select
              aria-label="ForEach property"
              value={foreachProperty}
              onChange={(e) => {
                const val = e.target.value;
                setForeachProperty(val);
                updateForEachParam(foreachOpType, val, foreachTemplate, foreachOperator, foreachOperatorArgs);
              }}
              disabled={stage.locked}
              style={selectStyle}
            >
              <option value="">Property...</option>
              {COMMON_PROPERTIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Interpolation: prefix/suffix template input */}
            {foreachOpType === "interpolation" && (
              <input
                type="text"
                aria-label="String template"
                value={foreachTemplate}
                onChange={(e) => {
                  const val = e.target.value;
                  setForeachTemplate(val);
                  updateForEachParam(foreachOpType, foreachProperty, val, foreachOperator, foreachOperatorArgs);
                }}
                disabled={stage.locked}
                placeholder="prefix text"
                style={{ ...inputStyle, flex: 1, minWidth: 80 }}
              />
            )}

            {/* Operator: operator dropdown + args */}
            {foreachOpType === "operator" && (
              <>
                <select
                  aria-label="ForEach operator"
                  value={foreachOperator}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForeachOperator(val);
                    updateForEachParam(foreachOpType, foreachProperty, foreachTemplate, val, foreachOperatorArgs);
                  }}
                  disabled={stage.locked}
                  style={selectStyle}
                >
                  {FOREACH_OPERATORS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label="Operator arguments"
                  value={foreachOperatorArgs}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForeachOperatorArgs(val);
                    updateForEachParam(foreachOpType, foreachProperty, foreachTemplate, foreachOperator, val);
                  }}
                  disabled={stage.locked}
                  placeholder={'"old","new"'}
                  style={{ ...inputStyle, flex: 1, minWidth: 80 }}
                />
              </>
            )}
          </div>

          {/* Preview */}
          <div
            style={{
              fontSize: fontSizes.xs,
              fontFamily: fonts.mono,
              color: colors.textMuted,
              padding: "4px 8px",
              background: colors.bgDeep,
              borderRadius: 4,
              border: `1px solid ${colors.borderLight}`,
            }}
          >
            <span style={{ color: colors.textSecondary }}>Preview: </span>
            {preview}
          </div>
        </div>
        {switchToFreeTextButton}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "10px 12px",
        borderTop: `1px solid ${colors.borderBase}`,
        background: colors.bgPanel,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: fontSizes.sm,
          fontFamily: fonts.sans,
          color: getCmdletColor(def),
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{def.icon}</span>
        <span>{def.name} Parameters</span>
        {stage.locked && (
          <span style={{ fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: 400 }}>
            (locked)
          </span>
        )}
      </div>

      {def.params.map((paramDef) => {
        const isExpression = paramDef.type === "expression";
        const isFilterScript = paramDef.name === "FilterScript";
        const isProcess = paramDef.name === "Process";

        if (paramDef.type === "criteriaList") {
          return (
            <div key={paramDef.name}>
              <label style={labelStyle}>
                Criteria <span style={{ color: colors.statusError }}>*</span>
                <span style={{ fontWeight: 400, color: colors.textMuted }}> (AND logic)</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {criteriaRows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      alignItems: "center",
                      padding: "4px 6px",
                      background: colors.bgDeep,
                      borderRadius: 4,
                      border: `1px solid ${colors.borderLight}`,
                    }}
                  >
                    <select
                      aria-label="Filter type"
                      value={row.Filter}
                      onChange={(e) => handleCriterionChange(idx, "Filter", e.target.value)}
                      disabled={stage.locked}
                      style={{ ...selectStyle, minWidth: 90 }}
                    >
                      {CRITERIA_FILTER_TYPES.map((ft) => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                    {row.Filter !== "DescendantOf" && (
                      <select
                        aria-label="Index field"
                        value={INDEX_FIELDS.includes(row.Field) ? row.Field : "__custom__"}
                        onChange={(e) => {
                          if (e.target.value !== "__custom__") {
                            handleCriterionChange(idx, "Field", e.target.value);
                          }
                        }}
                        disabled={stage.locked}
                        style={{ ...selectStyle, minWidth: 100 }}
                      >
                        {INDEX_FIELDS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                        <option value="__custom__">custom...</option>
                      </select>
                    )}
                    {row.Filter !== "DescendantOf" && !INDEX_FIELDS.includes(row.Field) && (
                      <input
                        type="text"
                        aria-label="Custom field name"
                        value={row.Field}
                        onChange={(e) => handleCriterionChange(idx, "Field", e.target.value)}
                        disabled={stage.locked}
                        placeholder="field name"
                        style={{ ...inputStyle, width: 90, flex: "none" }}
                      />
                    )}
                    <input
                      type="text"
                      aria-label="Search value"
                      value={row.Value}
                      onChange={(e) => handleCriterionChange(idx, "Value", e.target.value)}
                      disabled={stage.locked}
                      placeholder={row.Filter === "DescendantOf" ? "master:\\content\\Home" : "Value"}
                      style={{ ...inputStyle, flex: 1, minWidth: 80 }}
                    />
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        fontSize: fontSizes.xs,
                        color: colors.textMuted,
                        fontFamily: fonts.sans,
                        cursor: stage.locked ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.Invert}
                        onChange={(e) => handleCriterionChange(idx, "Invert", e.target.checked)}
                        disabled={stage.locked}
                      />
                      NOT
                    </label>
                    {criteriaRows.length > 1 && !stage.locked && (
                      <button
                        onClick={() => removeCriterionRow(idx)}
                        aria-label="Remove criterion"
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.statusError,
                          fontSize: fontSizes.sm,
                          cursor: "pointer",
                          padding: "0 2px",
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!stage.locked && (
                <button
                  onClick={addCriterionRow}
                  style={{
                    background: "none",
                    border: `1px dashed ${colors.borderMedium}`,
                    borderRadius: 4,
                    color: colors.accentLink,
                    fontSize: fontSizes.xs,
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontFamily: fonts.sans,
                    marginTop: 4,
                  }}
                >
                  + Add Criterion
                </button>
              )}
            </div>
          );
        }

        // Where-Object structured editor
        if (isExpression && isFilterScript && useStructured) {
          return renderWhereStructured(paramDef);
        }

        // ForEach-Object structured editor
        if (isExpression && isProcess && useStructured) {
          return renderForEachStructured(paramDef);
        }

        // Group First + Last on one row for Select-Object
        if (paramDef.name === "First" && def.params.some((p) => p.name === "Last")) {
          const lastDef = def.params.find((p) => p.name === "Last")!;
          return (
            <div key="First-Last" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First</label>
                <input
                  type="text"
                  aria-label="First"
                  value={stage.params.First ?? ""}
                  onChange={(e) => handleParamChange("First", e.target.value)}
                  disabled={stage.locked}
                  placeholder={paramDef.placeholder}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last</label>
                <input
                  type="text"
                  aria-label="Last"
                  value={stage.params.Last ?? ""}
                  onChange={(e) => handleParamChange("Last", e.target.value)}
                  disabled={stage.locked}
                  placeholder={lastDef.placeholder}
                  style={inputStyle}
                />
              </div>
            </div>
          );
        }
        // Skip standalone Last if already rendered with First
        if (paramDef.name === "Last" && def.params.some((p) => p.name === "First")) {
          return null;
        }

        // Group OrderBy + First + Skip on one row for Find-Item
        if (paramDef.name === "OrderBy" && def.params.some((p) => p.name === "Skip")) {
          const firstDef = def.params.find((p) => p.name === "First");
          const skipDef = def.params.find((p) => p.name === "Skip");
          return (
            <div key="OrderBy-First-Skip" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>OrderBy</label>
                <input
                  type="text"
                  aria-label="OrderBy"
                  value={stage.params.OrderBy ?? ""}
                  onChange={(e) => handleParamChange("OrderBy", e.target.value)}
                  disabled={stage.locked}
                  placeholder={paramDef.placeholder}
                  style={inputStyle}
                />
              </div>
              {firstDef && (
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First</label>
                  <input
                    type="text"
                    aria-label="First"
                    value={stage.params.First ?? ""}
                    onChange={(e) => handleParamChange("First", e.target.value)}
                    disabled={stage.locked}
                    placeholder={firstDef.placeholder}
                    style={inputStyle}
                  />
                </div>
              )}
              {skipDef && (
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Skip</label>
                  <input
                    type="text"
                    aria-label="Skip"
                    value={stage.params.Skip ?? ""}
                    onChange={(e) => handleParamChange("Skip", e.target.value)}
                    disabled={stage.locked}
                    placeholder={skipDef.placeholder}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          );
        }
        // Skip standalone First/Skip if already rendered with OrderBy
        if ((paramDef.name === "First" || paramDef.name === "Skip") && def.params.some((p) => p.name === "OrderBy")) {
          return null;
        }

        return (
          <div key={paramDef.name}>
            <label style={labelStyle}>
              {paramDef.name} {paramDef.required && <span style={{ color: colors.statusError }}>*</span>}
              {paramDef.type === "propertyList" && (
                <span style={{ fontWeight: 400, color: colors.textMuted }}> (comma-separated)</span>
              )}
            </label>
            <input
              type="text"
              aria-label={paramDef.name}
              value={stage.params[paramDef.name] ?? ""}
              onChange={(e) => handleParamChange(paramDef.name, e.target.value)}
              disabled={stage.locked}
              placeholder={paramDef.placeholder}
              style={inputStyle}
            />
            {isExpression && (isFilterScript || isProcess) && !useStructured && switchToStructuredButton(paramDef.name)}
          </div>
        );
      })}

      {def.switches.length > 0 && (
        <div>
          <label style={labelStyle}>Switches</label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {def.switches.map((sw) => (
              <label
                key={sw}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: fontSizes.xs,
                  color: colors.textSecondary,
                  fontFamily: fonts.mono,
                  cursor: stage.locked ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={stage.switches.includes(sw)}
                  onChange={() => handleSwitchToggle(sw)}
                  disabled={stage.locked}
                />
                -{sw}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

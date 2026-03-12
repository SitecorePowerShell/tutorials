import { useState, useEffect } from "react";
import type { PipelineStage } from "../../builder/assembleCommand";
import { CMDLET_REGISTRY, COMMON_PROPERTIES, FILTER_OPERATORS, CRITERIA_FILTER_TYPES, INDEX_FIELDS, getCmdletColor } from "../../builder/cmdletRegistry";
import { colors, fonts, fontSizes } from "../../theme";

interface ParamPanelProps {
  stage: PipelineStage | null;
  onUpdateParams: (stageId: string, params: Record<string, string>) => void;
  onUpdateSwitches: (stageId: string, switches: string[]) => void;
  isMobile?: boolean;
}

export function ParamPanel({ stage, onUpdateParams, onUpdateSwitches, isMobile }: ParamPanelProps) {
  const [filterProperty, setFilterProperty] = useState("");
  const [filterOperator, setFilterOperator] = useState("-eq");
  const [filterValue, setFilterValue] = useState("");
  const [useStructured, setUseStructured] = useState(true);

  // Criteria builder state for Find-Item
  interface CriterionRow {
    Filter: string;
    Field: string;
    Value: string;
    Invert: boolean;
  }
  const [criteriaRows, setCriteriaRows] = useState<CriterionRow[]>([{ Filter: "Equals", Field: "_templatename", Value: "", Invert: false }]);

  // Reset structured filter state when selected stage changes
  useEffect(() => {
    setFilterProperty("");
    setFilterOperator("-eq");
    setFilterValue("");
    setUseStructured(true);
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

  const handleParamChange = (paramName: string, value: string) => {
    onUpdateParams(stage.id, { ...stage.params, [paramName]: value });
  };

  const handleStructuredFilterChange = (prop: string, op: string, val: string) => {
    setFilterProperty(prop);
    setFilterOperator(op);
    setFilterValue(val);
    if (prop && val) {
      const assembled = `{ $_.${prop} ${op} "${val}" }`;
      onUpdateParams(stage.id, { ...stage.params, FilterScript: assembled });
    } else if (prop) {
      const assembled = `{ $_.${prop} ${op} "${val}" }`;
      onUpdateParams(stage.id, { ...stage.params, FilterScript: assembled });
    }
  };

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

        if (isExpression && isFilterScript && useStructured) {
          return (
            <div key={paramDef.name}>
              <label style={labelStyle}>
                {paramDef.name} {paramDef.required && <span style={{ color: colors.statusError }}>*</span>}
              </label>
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
                  value={filterProperty}
                  onChange={(e) => handleStructuredFilterChange(e.target.value, filterOperator, filterValue)}
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
                  value={filterOperator}
                  onChange={(e) => handleStructuredFilterChange(filterProperty, e.target.value, filterValue)}
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
                  value={filterValue}
                  onChange={(e) => handleStructuredFilterChange(filterProperty, filterOperator, e.target.value)}
                  disabled={stage.locked}
                  placeholder="Value"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
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
            </div>
          );
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
            {isExpression && isFilterScript && !useStructured && (
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
            )}
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

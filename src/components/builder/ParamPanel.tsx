import { useState, useEffect } from "react";
import type { PipelineStage } from "../../builder/assembleCommand";
import { CMDLET_REGISTRY, COMMON_PROPERTIES, FILTER_OPERATORS, getCmdletColor } from "../../builder/cmdletRegistry";
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

  // Reset structured filter state when selected stage changes
  useEffect(() => {
    setFilterProperty("");
    setFilterOperator("-eq");
    setFilterValue("");
    setUseStructured(true);
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

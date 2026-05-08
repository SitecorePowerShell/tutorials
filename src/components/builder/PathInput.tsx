import { useEffect, useMemo, useRef, useState } from "react";
import { colors, fonts, fontSizes } from "../../theme";
import { getCompletions } from "../../engine/completions";
import { VIRTUAL_TREE } from "../../engine/virtualTree";

interface PathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  style?: React.CSSProperties;
}

const MAX_SUGGESTIONS = 8;

/**
 * Drop-in replacement for `<input type="text">` for path parameters in the
 * visual builder. Suggests Sitecore paths from the virtual tree using the
 * same engine that powers REPL tab-completion.
 *
 * - Suggestions appear as a dropdown beneath the input on focus / typing.
 * - ↑/↓ navigates, Tab or Enter accepts, Escape dismisses.
 * - Mouse click on a suggestion accepts.
 */
export function PathInput({
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
  style,
}: PathInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [] as string[];
    const result = getCompletions(value, value.length, { sitecore: VIRTUAL_TREE.sitecore });
    return result?.matches.slice(0, MAX_SUGGESTIONS) ?? [];
  }, [value]);

  // Reset highlight when the suggestion set changes
  useEffect(() => {
    setActiveIdx(0);
  }, [suggestions.length, value]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const accept = (suggestion: string) => {
    onChange(suggestion);
    setOpen(false);
    // Re-focus so the user can keep typing further segments
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      // Open on ArrowDown even if currently closed
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIdx((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      accept(suggestions[activeIdx] ?? suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        style={style}
      />
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 2,
            background: colors.bgPanel,
            border: `1px solid ${colors.borderMedium}`,
            borderRadius: 4,
            zIndex: 20,
            maxHeight: 240,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s + i}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                // mousedown fires before blur, preventing the input from losing
                // focus before the click can register
                e.preventDefault();
                accept(s);
              }}
              style={{
                padding: "5px 10px",
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: i === activeIdx ? colors.textPrimary : colors.textSecondary,
                background: i === activeIdx ? colors.bgActive : "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

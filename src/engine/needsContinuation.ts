/**
 * Determines whether the accumulated input buffer needs a continuation line.
 * Returns true when the text has trailing pipe, backtick continuation,
 * unclosed braces, or unclosed quotes.
 */
export function needsContinuation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;

  // Trailing pipe
  if (trimmed.endsWith("|")) return true;

  // Backtick line continuation
  if (trimmed.endsWith("`")) return true;

  // Trailing comma (more array elements on next line, e.g. multi-criteria hashtables)
  if (trimmed.endsWith(",")) return true;

  // Unbalanced braces
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  if (openBraces > closeBraces) return true;

  // Unclosed quotes — state machine approach
  // States: none, inDouble, inSingle
  let quoteState: "none" | "double" | "single" = "none";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (quoteState === "none") {
      if (ch === '"') quoteState = "double";
      else if (ch === "'") quoteState = "single";
    } else if (quoteState === "double") {
      if (ch === '"' && !(i > 0 && trimmed[i - 1] === "`")) quoteState = "none";
    } else if (quoteState === "single") {
      if (ch === "'") quoteState = "none";
    }
  }
  if (quoteState !== "none") return true;

  return false;
}

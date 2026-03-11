import { useMemo } from "react";
import { findMatchingBracket, BRACKETS } from "../utils/bracketUtils";

export interface BracketHighlight {
  pos: number;
  type: "matched" | "unmatched";
}

/**
 * Returns bracket highlight positions for the ISE overlay.
 * Checks the character at the cursor and one before it.
 */
export function useBracketMatching(
  code: string,
  cursorPos: number
): BracketHighlight[] {
  return useMemo(() => {
    const highlights: BracketHighlight[] = [];

    // Check character at cursor and one before it
    const positions = [cursorPos, cursorPos - 1].filter(
      (p) => p >= 0 && p < code.length && BRACKETS.has(code[p])
    );

    if (positions.length === 0) return highlights;

    // Use the first bracket found (prefer the one before cursor)
    const pos = positions[positions.length - 1];
    const matchPos = findMatchingBracket(code, pos);

    if (matchPos !== null) {
      highlights.push({ pos, type: "matched" });
      highlights.push({ pos: matchPos, type: "matched" });
    } else {
      highlights.push({ pos, type: "unmatched" });
    }

    return highlights;
  }, [code, cursorPos]);
}

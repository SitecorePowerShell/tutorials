import { useMemo } from "react";
import type { SitecoreNode } from "../types";
import { getCompletions } from "../engine/completions";

/**
 * Computes ghost text prediction from command history and completions.
 * Returns the suffix to display after the cursor, or null.
 * Only active when cursor is at the end of the code.
 */
export function useGhostText(
  code: string,
  cursorPos: number,
  commandHistory: string[],
  tree?: { sitecore: SitecoreNode },
  userVariables?: string[]
): string | null {
  return useMemo(() => {
    // Only show ghost text when cursor is at the end
    if (!code || cursorPos !== code.length) return null;

    // Don't show ghost text inside comments
    const lastNewline = code.lastIndexOf("\n");
    const currentLine = code.slice(lastNewline + 1);
    if (/^\s*#/.test(currentLine)) return null;

    const codeLower = code.toLowerCase();

    // Primary: scan history in reverse for a prefix match
    for (let i = commandHistory.length - 1; i >= 0; i--) {
      const entry = commandHistory[i];
      if (
        entry.length > code.length &&
        entry.toLowerCase().startsWith(codeLower)
      ) {
        return entry.slice(code.length);
      }
    }

    // Secondary: use completion engine for the first match
    const result = getCompletions(code, cursorPos, tree, userVariables);
    if (result && result.matches.length > 0) {
      const match = result.matches[0];
      const tokenLength = result.replaceEnd - result.replaceStart;
      const currentToken = code.slice(result.replaceStart, result.replaceEnd);
      // Only show ghost if the match extends beyond what's typed
      if (match.length > currentToken.length && match.toLowerCase().startsWith(currentToken.toLowerCase())) {
        return match.slice(currentToken.length);
      }
    }

    return null;
  }, [code, cursorPos, commandHistory, tree, userVariables]);
}

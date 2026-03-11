const BRACKET_PAIRS: Record<string, string> = {
  "{": "}",
  "(": ")",
  "[": "]",
};

const CLOSE_TO_OPEN: Record<string, string> = {
  "}": "{",
  ")": "(",
  "]": "[",
};

const OPENERS = new Set(Object.keys(BRACKET_PAIRS));
const CLOSERS = new Set(Object.keys(CLOSE_TO_OPEN));
export const BRACKETS = new Set([...OPENERS, ...CLOSERS]);

/**
 * Determine if a position in code is inside a string.
 * Returns the quote type if inside, or false if not.
 */
export function isInsideString(
  code: string,
  pos: number
): false | "single" | "double" {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < pos && i < code.length; i++) {
    const ch = code[i];
    if (ch === "\\" && (inSingle || inDouble)) {
      i++; // skip escaped character
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
  }

  if (inDouble) return "double";
  if (inSingle) return "single";
  return false;
}

/**
 * Determine if a position in code is inside a comment.
 * Handles single-line (#) and block (<# ... #>) comments.
 */
export function isInsideComment(code: string, pos: number): boolean {
  let inBlock = false;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < pos && i < code.length; i++) {
    const ch = code[i];

    if (ch === "\\" && (inSingle || inDouble)) {
      i++;
      continue;
    }

    if (!inBlock && !inSingle && !inDouble) {
      if (ch === '"') {
        inDouble = true;
        continue;
      }
      if (ch === "'") {
        inSingle = true;
        continue;
      }
      if (ch === "<" && code[i + 1] === "#") {
        inBlock = true;
        i++;
        continue;
      }
      if (ch === "#") {
        // Single-line comment — extends to end of line
        const eol = code.indexOf("\n", i);
        if (eol === -1 || pos <= eol) return true;
        i = eol;
        continue;
      }
    } else if (inBlock) {
      if (ch === "#" && code[i + 1] === ">") {
        inBlock = false;
        i++;
        continue;
      }
    } else if (inDouble && ch === '"') {
      inDouble = false;
    } else if (inSingle && ch === "'") {
      inSingle = false;
    }
  }

  return inBlock;
}

type ScanState = "normal" | "singleQuote" | "doubleQuote" | "comment" | "blockComment";

/**
 * Find the matching bracket/paren/brace for the character at `pos`.
 * Returns the index of the match, or null if unmatched.
 */
export function findMatchingBracket(
  code: string,
  pos: number
): number | null {
  const ch = code[pos];
  if (!ch) return null;

  const isOpener = OPENERS.has(ch);
  const isCloser = CLOSERS.has(ch);
  if (!isOpener && !isCloser) return null;

  const target = isOpener ? BRACKET_PAIRS[ch] : CLOSE_TO_OPEN[ch];
  const direction = isOpener ? 1 : -1;
  let depth = 0;

  // Scan in the appropriate direction
  for (
    let i = pos;
    direction === 1 ? i < code.length : i >= 0;
    i += direction
  ) {
    // Skip characters inside strings or comments
    const state = charState(code, i);
    if (state !== "normal") continue;

    if (code[i] === ch) {
      depth++;
    } else if (code[i] === target) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return null;
}

/**
 * Determine the parsing state at a given position (normal, string, or comment).
 * This is a simple forward scan so it's O(n), but code sizes here are small.
 */
function charState(code: string, pos: number): ScanState {
  let state: ScanState = "normal";

  for (let i = 0; i < pos; i++) {
    const ch = code[i];

    switch (state) {
      case "normal":
        if (ch === '"') state = "doubleQuote";
        else if (ch === "'") state = "singleQuote";
        else if (ch === "<" && code[i + 1] === "#") {
          state = "blockComment";
          i++;
        } else if (ch === "#") {
          const eol = code.indexOf("\n", i);
          if (eol === -1 || pos <= eol) return "comment";
          i = eol;
        }
        break;
      case "doubleQuote":
        if (ch === "\\") i++;
        else if (ch === '"') state = "normal";
        break;
      case "singleQuote":
        if (ch === "\\") i++;
        else if (ch === "'") state = "normal";
        break;
      case "blockComment":
        if (ch === "#" && code[i + 1] === ">") {
          state = "normal";
          i++;
        }
        break;
    }
  }

  return state;
}

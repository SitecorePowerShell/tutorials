import { isInsideString } from "../utils/bracketUtils";

const PAIRS: Record<string, string> = {
  "{": "}",
  "(": ")",
  "[": "]",
  '"': '"',
  "'": "'",
};

const CLOSERS = new Set(["}", ")", "]", '"', "'"]);

const EMPTY_PAIRS = new Set(["{}", "()", "[]", '""', "''"]);

/**
 * Creates a keydown handler that implements auto-close bracket/quote behavior.
 * Returns true if the event was handled (caller should preventDefault).
 */
export function createBracketAutoCloseHandler(
  code: string,
  getCursorPos: () => number,
  updateCode: (newCode: string, newCursor: number) => void
): (e: React.KeyboardEvent) => boolean {
  return (e: React.KeyboardEvent): boolean => {
    // Only handle single character keys, Backspace
    const { key } = e;
    const cursorPos = getCursorPos();

    // Opening brackets — always auto-close
    if (key === "{" || key === "(" || key === "[") {
      e.preventDefault();
      const close = PAIRS[key];
      const newCode =
        code.slice(0, cursorPos) + key + close + code.slice(cursorPos);
      updateCode(newCode, cursorPos + 1);
      return true;
    }

    // Quote characters — auto-close if not inside same-type string
    if (key === '"' || key === "'") {
      const nextChar = code[cursorPos];

      // If next char is the same quote, skip over it
      if (nextChar === key) {
        e.preventDefault();
        updateCode(code, cursorPos + 1);
        return true;
      }

      // Don't auto-close if inside a string of the same type
      const stringState = isInsideString(code, cursorPos);
      if (
        (key === '"' && stringState === "double") ||
        (key === "'" && stringState === "single")
      ) {
        return false; // let normal typing handle it
      }

      e.preventDefault();
      const newCode =
        code.slice(0, cursorPos) + key + key + code.slice(cursorPos);
      updateCode(newCode, cursorPos + 1);
      return true;
    }

    // Closing brackets — skip over if next char matches
    if (CLOSERS.has(key) && key !== '"' && key !== "'") {
      const nextChar = code[cursorPos];
      if (nextChar === key) {
        e.preventDefault();
        updateCode(code, cursorPos + 1);
        return true;
      }
      return false;
    }

    // Backspace — delete empty pair
    if (key === "Backspace") {
      if (cursorPos > 0 && cursorPos < code.length) {
        const pair = code[cursorPos - 1] + code[cursorPos];
        if (EMPTY_PAIRS.has(pair)) {
          e.preventDefault();
          const newCode =
            code.slice(0, cursorPos - 1) + code.slice(cursorPos + 1);
          updateCode(newCode, cursorPos - 1);
          return true;
        }
      }
      return false;
    }

    return false;
  };
}

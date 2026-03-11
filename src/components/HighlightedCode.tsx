import type React from "react";
import { colors, fonts, fontSizes } from "../theme";

export interface Token {
  type: string;
  text: string;
}

/** Tokenize PowerShell code into typed spans for syntax highlighting */
export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  // Order matters: comments first (greedy line), then strings, then other patterns
  const pattern =
    /(#[^\n]*)|(["'][^"']*["'])|(\b(?:Get-Item|Get-ChildItem|Where-Object|Select-Object|Sort-Object|Measure-Object|Get-Member|ForEach-Object|New-Item|Remove-Item|Move-Item|Copy-Item|Set-Item|Get-Help|Get-Command|Set-Location|Write-Host|Write-Output|Export-Csv|ConvertTo-Json|ConvertFrom-Json|Out-String|Group-Object|Rename-Item|Test-Path|Import-Csv|Add-Member|New-Object)\b)|(\$[\w]+(?:\.[\w]+)*)|(\s-(?:eq|ne|lt|le|gt|ge|like|notlike|match|notmatch|contains|notcontains|in|notin|replace|split|join|and|or|not|band|bor|bnot|is|isnot|as|f)\b)|(\s-\w+)|(\[(?:DateTime|Math|guid|Guid|string|String|int|Int32|double|Double|bool|Boolean|array|Array|timespan|TimeSpan|regex|Regex|xml|convert|Convert|Environment|IO\.Path|System\.\w+)\])|(\b\d+\.?\d*\b)|(\|)|([{}])/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: "plain", text: code.slice(lastIndex, match.index) });
    }

    if (match[1] != null) tokens.push({ type: "comment", text: match[0] });
    else if (match[2] != null) tokens.push({ type: "string", text: match[0] });
    else if (match[3] != null) tokens.push({ type: "keyword", text: match[0] });
    else if (match[4] != null) tokens.push({ type: "variable", text: match[0] });
    else if (match[5] != null) tokens.push({ type: "operator", text: match[0] });
    else if (match[6] != null) tokens.push({ type: "param", text: match[0] });
    else if (match[7] != null) tokens.push({ type: "type", text: match[0] });
    else if (match[8] != null) tokens.push({ type: "number", text: match[0] });
    else if (match[9] != null) tokens.push({ type: "pipe", text: match[0] });
    else if (match[10] != null) tokens.push({ type: "brace", text: match[0] });

    lastIndex = pattern.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < code.length) {
    tokens.push({ type: "plain", text: code.slice(lastIndex) });
  }

  return tokens;
}

const tokenColors: Record<string, { color: string; fontWeight?: number }> = {
  comment: { color: colors.syntaxComment },
  string: { color: colors.syntaxString },
  keyword: { color: colors.syntaxKeyword, fontWeight: 600 },
  variable: { color: colors.syntaxVariable },
  operator: { color: colors.syntaxOperator },
  param: { color: colors.syntaxParam },
  type: { color: colors.syntaxType },
  number: { color: colors.syntaxNumber },
  pipe: { color: colors.syntaxPipe, fontWeight: 700 },
  brace: { color: colors.syntaxBrace },
};

/** Render tokenized code as styled spans */
export function renderTokens(tokens: Token[]): React.ReactElement[] {
  return tokens.map((tok, i) => {
    const style = tokenColors[tok.type];
    if (!style) return <span key={i} style={{ color: colors.textPrimary }}>{tok.text}</span>;
    return (
      <span key={i} style={style}>
        {tok.text}
      </span>
    );
  });
}

/** Render tokenized code with bracket match highlights overlaid */
export function renderTokensWithHighlights(
  tokens: Token[],
  highlights: Array<{ pos: number; type: "matched" | "unmatched" }>
): React.ReactElement[] {
  if (highlights.length === 0) return renderTokens(tokens);

  const highlightSet = new Map<number, "matched" | "unmatched">();
  for (const h of highlights) highlightSet.set(h.pos, h.type);

  const elements: React.ReactElement[] = [];
  let charOffset = 0;
  let key = 0;

  for (const tok of tokens) {
    const tokenStyle = tokenColors[tok.type] ?? { color: colors.textPrimary };
    let lastSplit = 0;

    for (let i = 0; i < tok.text.length; i++) {
      const absPos = charOffset + i;
      if (highlightSet.has(absPos)) {
        // Emit text before this highlight
        if (i > lastSplit) {
          elements.push(
            <span key={key++} style={tokenStyle}>
              {tok.text.slice(lastSplit, i)}
            </span>
          );
        }
        // Emit highlighted character
        const hType = highlightSet.get(absPos)!;
        elements.push(
          <span
            key={key++}
            style={{
              ...tokenStyle,
              backgroundColor:
                hType === "matched"
                  ? colors.bracketMatch
                  : colors.bracketUnmatched,
              borderRadius: 2,
            }}
          >
            {tok.text[i]}
          </span>
        );
        lastSplit = i + 1;
      }
    }

    // Emit remaining text in token
    if (lastSplit < tok.text.length) {
      elements.push(
        <span key={key++} style={tokenStyle}>
          {tok.text.slice(lastSplit)}
        </span>
      );
    }

    charOffset += tok.text.length;
  }

  return elements;
}

/** Syntax highlighter for PowerShell (used in output pane) */
export function HighlightedCode({ code }: { code: string }) {
  return (
    <code
      style={{
        fontFamily: fonts.monoFull,
        fontSize: fontSizes.body,
      }}
    >
      {renderTokens(tokenize(code))}
    </code>
  );
}

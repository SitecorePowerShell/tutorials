import type { ReactElement } from "react";
import { colors, fonts, fontSizes } from "../theme";

function processInline(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      `<code style="background:${colors.bgOverlay};padding:2px 6px;border-radius:3px;font-family:${fonts.monoShort};font-size:${fontSizes.md}px;color:${colors.accentLink};border:1px solid ${colors.borderMedium}">$1</code>`
    )
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${colors.accentLink};text-decoration:underline">$1</a>`
    );
}

function getCalloutStyles(): Record<string, { icon: string; label: string; border: string; bg: string }> {
  return {
    TIP: { icon: "\u{1F4A1}", label: "Tip", border: colors.statusSuccess, bg: colors.bgCardSuccess },
    WARNING: { icon: "\u26A0", label: "Warning", border: colors.statusHint, bg: colors.bgHint },
    NOTE: { icon: "\u2139", label: "Note", border: colors.accentPrimary, bg: colors.bgOverlay },
  };
}

function renderCallout(lines: string[], key: number): ReactElement {
  const firstLine = lines[0];
  const typeMatch = firstLine.match(/^\[!(\w+)\]\s*(.*)/);
  const type = typeMatch ? typeMatch[1].toUpperCase() : null;
  const calloutStyleMap = getCalloutStyles();
  const style = type && calloutStyleMap[type] ? calloutStyleMap[type] : null;

  const contentLines = style
    ? [typeMatch![2], ...lines.slice(1)].filter((l) => l !== "")
    : lines;

  const border = style ? style.border : colors.borderDim;
  const bg = style ? style.bg : colors.bgOverlay;

  return (
    <div
      key={key}
      style={{
        borderLeft: `3px solid ${border}`,
        padding: 12,
        borderRadius: 6,
        background: bg,
        margin: "8px 0",
        lineHeight: 1.65,
      }}
    >
      {style && (
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {style.icon} {style.label}
        </div>
      )}
      {contentLines.map((cl, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: processInline(cl) }} />
      ))}
    </div>
  );
}

/** Very simple markdown: **bold**, `code`, ```blocks```, bullet lists, > callouts */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let quoteBuffer: string[] = [];
  let key = 0;

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      elements.push(renderCallout(quoteBuffer, key++));
      quoteBuffer = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={key++}
            style={{
              background: colors.bgOverlay,
              padding: "12px 16px",
              borderRadius: 6,
              overflowX: "auto",
              margin: "8px 0",
              fontSize: fontSizes.body,
              lineHeight: 1.5,
              border: `1px solid ${colors.borderMedium}`,
            }}
          >
            <code
              style={{
                color: colors.textCode,
                fontFamily: fonts.mono,
              }}
            >
              {codeBuffer.join("\n")}
            </code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blockquote / callout lines
    if (line.startsWith("> ") || line === ">") {
      const content = line === ">" ? "" : line.slice(2);
      quoteBuffer.push(content);
      continue;
    }

    // Non-quote line — flush any accumulated quote
    flushQuote();

    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />);
      continue;
    }

    // Process inline formatting
    const processed = processInline(line);

    if (line.startsWith("• ") || line.startsWith("- ")) {
      const bullet = processed.replace(/^[•-]\s/, "");
      elements.push(
        <div
          key={key++}
          style={{
            paddingLeft: 16,
            position: "relative",
            lineHeight: 1.65,
            marginBottom: 2,
          }}
        >
          <span style={{ position: "absolute", left: 0, color: colors.accentPrimary }}>
            •
          </span>
          <span dangerouslySetInnerHTML={{ __html: bullet }} />
        </div>
      );
    } else {
      elements.push(
        <p
          key={key++}
          style={{ margin: "4px 0", lineHeight: 1.65 }}
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }
  }

  // Flush trailing quote block
  flushQuote();

  return <div>{elements}</div>;
}

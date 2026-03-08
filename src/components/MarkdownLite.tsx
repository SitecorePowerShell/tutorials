import type { ReactElement } from "react";

/** Very simple markdown: **bold**, `code`, ```blocks```, bullet lists */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={key++}
            style={{
              background: "#1a1a2e",
              padding: "12px 16px",
              borderRadius: 6,
              overflowX: "auto",
              margin: "8px 0",
              fontSize: 13,
              lineHeight: 1.5,
              border: "1px solid #2a2a4a",
            }}
          >
            <code
              style={{
                color: "#c5c8d4",
                fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
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

    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />);
      continue;
    }

    // Process inline formatting
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /`([^`]+)`/g,
        '<code style="background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;color:#90caf9;border:1px solid #2a2a4a">$1</code>'
      );

    if (line.startsWith("• ") || line.startsWith("- ")) {
      processed = processed.replace(/^[•-]\s/, "");
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
          <span style={{ position: "absolute", left: 0, color: "#5c6bc0" }}>
            •
          </span>
          <span dangerouslySetInnerHTML={{ __html: processed }} />
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

  return <div>{elements}</div>;
}

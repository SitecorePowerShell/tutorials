import { describe, it, expect } from "vitest";
import { parseCliXml } from "../../integration/speClient";

describe("parseCliXml", () => {
  it("returns null for non-CLIXML text", () => {
    expect(parseCliXml("just plain output")).toBeNull();
    expect(parseCliXml("")).toBeNull();
    expect(parseCliXml("ERROR: something went wrong")).toBeNull();
  });

  it("parses a single error stream entry", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error">Cannot find path 'master:\\content\\DoesNotExist'</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "error", text: "Cannot find path 'master:\\content\\DoesNotExist'" },
    ]);
  });

  it("parses multiple error lines", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error">Get-Item : Cannot find path 'master:\\nonexistent'</S>
  <S S="Error">At line:1 char:1</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toHaveLength(2);
    expect(result![0].stream).toBe("error");
    expect(result![1].stream).toBe("error");
  });

  it("parses warning stream entries", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Warning">This item is protected.</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "warning", text: "This item is protected." },
    ]);
  });

  it("parses verbose stream entries", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Verbose">Processing item: /sitecore/content/Home</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "verbose", text: "Processing item: /sitecore/content/Home" },
    ]);
  });

  it("parses debug stream entries", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Debug">Cache miss for item ID {110D559F}</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "debug", text: "Cache miss for item ID {110D559F}" },
    ]);
  });

  it("parses information stream entries", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Information">Script completed successfully.</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "information", text: "Script completed successfully." },
    ]);
  });

  it("parses mixed stream types in order", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Verbose">Starting operation...</S>
  <S S="Warning">Item has no layout.</S>
  <S S="Error">Cannot find path 'master:\\missing'</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "verbose", text: "Starting operation..." },
      { stream: "warning", text: "Item has no layout." },
      { stream: "error", text: "Cannot find path 'master:\\missing'" },
    ]);
  });

  it("decodes CLIXML escape sequences", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error">Line one_x000D__x000A_Line two_x000D__x000A_Line three</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toHaveLength(1);
    expect(result![0].text).toBe("Line one\nLine two\nLine three");
  });

  it("decodes underscore escape sequences", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error">file_x005F_name.txt</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result![0].text).toBe("file_name.txt");
  });

  it("skips empty message elements", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error"></S>
  <S S="Error">Real error message</S>
  <S S="Warning">   </S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toEqual([
      { stream: "error", text: "Real error message" },
    ]);
  });

  it("returns null for malformed XML", () => {
    const clixml = `#< CLIXML
<Objs><broken><`;
    const result = parseCliXml(clixml);
    expect(result).toBeNull();
  });

  it("returns null when CLIXML has no recognized stream elements", () => {
    const clixml = `#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="UnknownStream">Some data</S>
</Objs>`;
    const result = parseCliXml(clixml);
    expect(result).toBeNull();
  });

  it("handles CLIXML preceded by text content", () => {
    const mixed = `Some output text
#< CLIXML
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">
  <S S="Error">Something failed</S>
</Objs>`;
    const result = parseCliXml(mixed);
    expect(result).toEqual([
      { stream: "error", text: "Something failed" },
    ]);
  });
});

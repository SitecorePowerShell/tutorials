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

  // --- Serialized ErrorRecord format (via <#messages#> delimiter) ---

  it("parses serialized ErrorRecord from <#messages#> delimiter", () => {
    const response = `<#messages#><Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04"><Obj RefId="0"><TN RefId="0"><T>System.Management.Automation.ErrorRecord</T><T>System.Object</T></TN><ToString>Cannot find path 'master:/' and id {B9CEE2BB-83D0-484C-90E5-B83145AB12D3} because it does not exist.</ToString><MS><B N="writeErrorStream">true</B></MS></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).toEqual([
      { stream: "error", text: "Cannot find path 'master:/' and id {B9CEE2BB-83D0-484C-90E5-B83145AB12D3} because it does not exist." },
    ]);
  });

  it("parses deserialized ErrorRecord types", () => {
    const response = `<#messages#><Objs Version="1.1.0.1"><Obj RefId="0"><TN RefId="0"><T>Deserialized.System.Management.Automation.ErrorRecord</T><T>System.Object</T></TN><ToString>Item not found.</ToString><MS /></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).toEqual([
      { stream: "error", text: "Item not found." },
    ]);
  });

  it("preserves output before <#messages#> delimiter", () => {
    const response = `Some normal output<#messages#><Objs Version="1.1.0.1"><Obj RefId="0"><TN RefId="0"><T>System.Management.Automation.WarningRecord</T><T>System.Object</T></TN><ToString>Deprecated command.</ToString><MS /></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).toEqual([
      { stream: "output", text: "Some normal output" },
      { stream: "warning", text: "Deprecated command." },
    ]);
  });

  it("handles <#messages#> with no preceding output", () => {
    const response = `<#messages#><Objs Version="1.1.0.1"><Obj RefId="0"><TN RefId="0"><T>System.Management.Automation.ErrorRecord</T><T>System.Object</T></TN><ToString>Path not found.</ToString><MS /></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).toEqual([
      { stream: "error", text: "Path not found." },
    ]);
  });

  it("parses serialized WarningRecord, VerboseRecord, DebugRecord, InformationRecord", () => {
    const makeRecord = (type: string, msg: string) =>
      `<Obj RefId="0"><TN RefId="0"><T>${type}</T><T>System.Object</T></TN><ToString>${msg}</ToString><MS /></Obj>`;
    const response = `<#messages#><Objs Version="1.1.0.1">${
      makeRecord("System.Management.Automation.WarningRecord", "warn msg")
    }${
      makeRecord("System.Management.Automation.VerboseRecord", "verbose msg")
    }${
      makeRecord("System.Management.Automation.DebugRecord", "debug msg")
    }${
      makeRecord("System.Management.Automation.InformationRecord", "info msg")
    }</Objs>`;
    const result = parseCliXml(response);
    expect(result).toEqual([
      { stream: "warning", text: "warn msg" },
      { stream: "verbose", text: "verbose msg" },
      { stream: "debug", text: "debug msg" },
      { stream: "information", text: "info msg" },
    ]);
  });

  it("decodes escape sequences in serialized ErrorRecord ToString", () => {
    const response = `<#messages#><Objs Version="1.1.0.1"><Obj RefId="0"><TN RefId="0"><T>System.Management.Automation.ErrorRecord</T><T>System.Object</T></TN><ToString>Line one_x000D__x000A_Line two</ToString><MS /></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).toHaveLength(1);
    expect(result![0].text).toBe("Line one\nLine two");
  });

  it("handles real-world SPE ErrorRecord with nested objects", () => {
    // Simplified version of the real SPE response with nested Exception, InvocationInfo, etc.
    const response = `<#messages#><Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04"><Obj RefId="0"><TN RefId="0"><T>System.Collections.Generic.List\`1[[System.Object, mscorlib]]</T><T>System.Object</T></TN><LST><Obj RefId="1"><TN RefId="1"><T>System.Management.Automation.ErrorRecord</T><T>System.Object</T></TN><ToString>Cannot find path 'master:/' and id {B9CEE2BB} because it does not exist.</ToString><MS><B N="writeErrorStream">true</B><Obj N="Exception" RefId="2"><TN RefId="2"><T>System.IO.IOException</T><T>System.Exception</T><T>System.Object</T></TN><ToString>System.IO.IOException: Cannot find path</ToString><Props><S N="Message">Cannot find path</S></Props></Obj></MS></Obj></LST></Obj></Objs>`;
    const result = parseCliXml(response);
    expect(result).not.toBeNull();
    // Should extract the ErrorRecord's ToString, not the nested Exception's
    const errorEntries = result!.filter(e => e.stream === "error");
    expect(errorEntries.length).toBeGreaterThanOrEqual(1);
    expect(errorEntries[0].text).toContain("Cannot find path 'master:/' and id {B9CEE2BB}");
  });
});

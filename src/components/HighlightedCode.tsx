/** Syntax highlighter for PowerShell */
export function HighlightedCode({ code }: { code: string }) {
  const keywords =
    /\b(Get-Item|Get-ChildItem|Where-Object|Select-Object|Sort-Object|Measure-Object|Get-Member|ForEach-Object|New-Item|Remove-Item|Move-Item|Copy-Item|Set-Item|Get-Help|Get-Command)\b/gi;
  const params = /\s(-\w+)/g;
  const strings = /("[^"]*"|'[^']*')/g;
  const pipes = /(\|)/g;
  const variables = /(\$_?\.\w+|\$\w+)/g;
  const braces = /([{}])/g;

  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(strings, '<span style="color:#a5d6a7">$1</span>');
  html = html.replace(
    keywords,
    '<span style="color:#90caf9;font-weight:600">$1</span>'
  );
  html = html.replace(
    params,
    ' <span style="color:#ce93d8">$1</span>'
  );
  html = html.replace(
    pipes,
    '<span style="color:#ffcc80;font-weight:700">$1</span>'
  );
  html = html.replace(
    variables,
    '<span style="color:#ef9a9a">$1</span>'
  );
  html = html.replace(
    braces,
    '<span style="color:#fff59d">$1</span>'
  );

  return (
    <code
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily:
          "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
        fontSize: 13,
      }}
    />
  );
}

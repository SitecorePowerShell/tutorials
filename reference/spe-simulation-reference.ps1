<#
    .SYNOPSIS
        SPE Tutorial - Simulation Reference Capture Script
    
    .DESCRIPTION
        Run this in the SPE ISE on a vanilla Sitecore instance.
        Captures real output formatting and edge case behaviors
        so the browser-based tutorial simulation can match exactly.
        
        Results are written to a single output string you can 
        copy/paste back. Nothing is modified - all read-only operations.
    
    .NOTES
        Safe to run on any instance. No writes, no deletes, no publishing.
#>

$divider = "`n" + ("=" * 70) + "`n"
$results = [System.Text.StringBuilder]::new()

function Add-Section($title) {
    $results.AppendLine($divider) | Out-Null
    $results.AppendLine("## $title") | Out-Null
    $results.AppendLine($divider) | Out-Null
}

function Capture-Output([scriptblock]$Command, [string]$Label) {
    $results.AppendLine("--- $Label ---") | Out-Null
    $results.AppendLine("Command: $($Command.ToString().Trim())") | Out-Null
    $results.AppendLine("Output:") | Out-Null
    try {
        $output = & $Command | Out-String
        $results.AppendLine($output.TrimEnd()) | Out-Null
    }
    catch {
        $results.AppendLine("ERROR: $($_.Exception.Message)") | Out-Null
    }
    $results.AppendLine("") | Out-Null
}

# ============================================================================
# 1. DEFAULT OUTPUT FORMATTING
#    How does Get-Item / Get-ChildItem format by default?
# ============================================================================
Add-Section "1. Default Output Formatting"

Capture-Output { Get-Item -Path "master:\content\Home" } `
    "Get-Item single item"

Capture-Output { Get-ChildItem -Path "master:\content\Home" } `
    "Get-ChildItem direct children"

Capture-Output { Get-ChildItem -Path "master:\content\Home" -Recurse } `
    "Get-ChildItem recursive"

# ============================================================================
# 2. CURRENT LOCATION / DOT PATH BEHAVIOR
#    What does "." resolve to? What about bare Get-Item?
# ============================================================================
Add-Section "2. Current Location and Dot Paths"

Capture-Output { Get-Location } `
    "Get-Location (current working directory)"

Capture-Output { Get-Item -Path . } `
    "Get-Item -Path . (dot)"

Capture-Output { Get-Item . } `
    "Get-Item . (positional, no -Path)"

Capture-Output { Get-ChildItem -Path . } `
    "Get-ChildItem -Path . (dot)"

Capture-Output { Get-ChildItem } `
    "Get-ChildItem (no path at all)"

Capture-Output { Get-Item -Path "master:" } `
    "Get-Item master: (bare drive)"

Capture-Output { Get-Item -Path "master:\" } `
    "Get-Item master:\ (drive with backslash)"

# ============================================================================
# 3. PATH FORMAT VARIATIONS
#    Which path formats are valid? Does /sitecore matter?
# ============================================================================
Add-Section "3. Path Format Variations"

Capture-Output { Get-Item -Path "master:\content\Home" } `
    "Standard: master:\content\Home"

Capture-Output { Get-Item -Path "master:\sitecore\content\Home" } `
    "With /sitecore prefix: master:\sitecore\content\Home"

Capture-Output { Get-Item -Path "master:/content/Home" } `
    "Forward slashes: master:/content/Home"

Capture-Output { (Get-Item -Path "master:\content\Home").ItemPath } `
    "ItemPath property value"

Capture-Output { (Get-Item -Path "master:\content\Home").Paths.FullPath } `
    "Paths.FullPath property value"

Capture-Output { (Get-Item -Path "master:\content\Home").Paths.Path } `
    "Paths.Path property value"

# ============================================================================
# 4. ITEM PROPERTY ACCESS
#    What properties are directly accessible? How do fields work?
# ============================================================================
Add-Section "4. Item Properties and Fields"

Capture-Output { 
    $item = Get-Item -Path "master:\content\Home"
    $item | Get-Member -MemberType Property | Select-Object Name, MemberType | Out-String
} "Get-Member properties on an item"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "Name: $($item.Name)"
    "ID: $($item.ID)"
    "TemplateName: $($item.TemplateName)"
    "TemplateID: $($item.TemplateID)"
    "HasChildren: $($item.HasChildren)"
    "Language: $($item.Language)"
    "Version: $($item.Version)"
    "ItemPath: $($item.ItemPath)"
} "Direct property access"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "Field names:"
    $item.Fields | ForEach-Object { $_.Name } | Sort-Object
} "All field names on Home item"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    $item["__Updated"]
    $item["__Created"]
    $item["__Updated by"]
} "Accessing system fields via indexer"

# ============================================================================
# 5. PIPELINE BEHAVIORS
#    Verify Select-Object, Where-Object, Sort-Object formatting
# ============================================================================
Add-Section "5. Pipeline Output Formatting"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" | 
        Select-Object -Property Name, Id, TemplateName
} "Select-Object with 3 properties"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" | 
        Select-Object -Property Name, Id, "__Updated"
} "Select-Object with field name containing underscores"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse |
        Where-Object { $_.TemplateName -eq "Sample Item" }
} "Where-Object filtering by TemplateName"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse |
        Where-Object { $_.Name -like "*Home*" }
} "Where-Object with -like wildcard"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse |
        Sort-Object -Property Name |
        Select-Object -Property Name, TemplateName
} "Sort then Select"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse | Measure-Object
} "Measure-Object output format"

# ============================================================================
# 6. ERROR FORMATTING
#    What do common errors look like?
# ============================================================================
Add-Section "6. Error Messages"

Capture-Output { Get-Item -Path "master:\content\doesnotexist" } `
    "Get-Item on nonexistent path"

Capture-Output { Get-Item -Path "master:\content\Home\doesnotexist" } `
    "Get-Item nonexistent child"

Capture-Output { Get-ChildItem -Path "master:\content\doesnotexist" } `
    "Get-ChildItem on nonexistent path"

# ============================================================================
# 7. TEMPLATE NAME FORMAT
#    What does TemplateName actually return?
# ============================================================================
Add-Section "7. Template Names"

Capture-Output {
    Get-ChildItem -Path "master:\content" -Recurse |
        Select-Object -Property Name, TemplateName |
        Sort-Object -Property TemplateName -Unique
} "All unique TemplateName values in content tree"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "TemplateName: $($item.TemplateName)"
    "Template.Name: $($item.Template.Name)"
    "Template.FullName: $($item.Template.FullName)"
} "TemplateName vs Template.Name vs Template.FullName"

# ============================================================================
# 8. CHILDREN AND HASCHILDREN
#    Is it a bool? String? How does the default table show it?
# ============================================================================
Add-Section "8. Children / HasChildren"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "HasChildren type: $($item.HasChildren.GetType().Name)"
    "HasChildren value: $($item.HasChildren)"
    "Children.Count: $($item.Children.Count)"
} "HasChildren type and value"

# ============================================================================
# 9. ID FORMAT
#    Braces or no braces? Uppercase or lowercase?
# ============================================================================
Add-Section "9. ID Formatting"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "ID: $($item.ID)"
    "ID type: $($item.ID.GetType().Name)"
    "ID.ToString(): $($item.ID.ToString())"
    "ID.Guid: $($item.ID.Guid)"
} "ID format details"

# ============================================================================
# 10. PROVIDER DRIVES
#    What drives are available?
# ============================================================================
Add-Section "10. Provider Drives"

Capture-Output { Get-PSDrive | Where-Object { $_.Provider -like "*CmsItemProvider*" } } `
    "Available Sitecore drives"

# ============================================================================
# OUTPUT
# ============================================================================
$finalOutput = $results.ToString()
$finalOutput

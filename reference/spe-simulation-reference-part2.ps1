<#
    .SYNOPSIS
        SPE Tutorial - Simulation Reference Capture Script (Part 2)
    
    .DESCRIPTION
        Focuses on Select-Object formatting behavior, property access
        patterns, editing context errors, and Format-Table differences.
        
        Safe to run — only section 4 makes a temporary change that is
        immediately rolled back (CancelEdit). Nothing is persisted.
    
    .NOTES
        Run in SPE ISE on a vanilla Sitecore instance.
#>

$results = [System.Text.StringBuilder]::new()
$divider = "`n" + ("=" * 70) + "`n"

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
        $results.AppendLine("CATEGORY: $($_.CategoryInfo)") | Out-Null
    }
    $results.AppendLine("") | Out-Null
}

# ============================================================================
# 1. SELECT-OBJECT FORMATTING BEHAVIOR
#    Does Select-Object use dynamic widths or inherit the view widths?
#    How does property casing affect headers?
# ============================================================================
Add-Section "1. Select-Object Formatting"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, TemplateName
} "Select 2 properties - column widths"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, ID
} "Select Name and ID - does header say ID or Id?"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, Id
} "Select Name and Id (lowercase d) - header casing?"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, HasChildren, TemplateName
} "Select 3 properties - does HasChildren header say HasChildren or Children?"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, ItemPath, TemplateName
} "Select with ItemPath"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Select-Object -Property Name, "__Updated", "__Created by"
} "Select with system field ScriptProperties"

Capture-Output {
    Get-Item -Path "master:\content\Home" |
        Select-Object -Property Name, Database, DisplayName
} "Select with Database and DisplayName"

# ============================================================================
# 2. FORMAT-TABLE VS DEFAULT
#    Does Format-Table produce different output than default?
# ============================================================================
Add-Section "2. Format-Table Behavior"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" | Format-Table
} "Format-Table with no properties (default view?)"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Format-Table -Property Name, TemplateName
} "Format-Table with explicit properties"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" |
        Format-Table -Property Name, TemplateName -AutoSize
} "Format-Table -AutoSize"

# ============================================================================
# 3. PROPERTY ACCESS PATTERNS
#    Dot notation vs indexer for various property types
# ============================================================================
Add-Section "3. Property Access Patterns"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "Dot __Updated: $($item.__Updated)"
    "Indexer __Updated: $($item['__Updated'])"
    "Dot Title: $($item.Title)"
    "Indexer Title: $($item['Title'])"
} "Dot notation vs indexer for fields"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    # Fields with spaces - dot notation won't work
    "Indexer __Updated by: $($item['__Updated by'])"
    "Indexer __Created by: $($item['__Created by'])"
} "Fields with spaces via indexer"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    # Using the ScriptProperty name (from Types.ps1xml) with dot notation
    $propName = "__Updated by"
    "ScriptProperty: $($item.$propName)"
} "ScriptProperty access for space-containing field"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "PSAdapted Title type: $($item.PSAdapted.Title)"
    "Fields[Title].Value: $($item.Fields['Title'].Value)"
} "Alternative field access methods"

# ============================================================================
# 4. EDITING CONTEXT
#    What happens when you try to modify without BeginEdit?
#    What does the BeginEdit/EndEdit flow look like?
# ============================================================================
Add-Section "4. Editing Context Behavior"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    # Try direct field set WITHOUT BeginEdit
    $item["Title"] = "Test Change Without Edit"
    "After set without BeginEdit - Title: $($item['Title'])"
} "Set field without BeginEdit"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    $item.Editing.BeginEdit()
    $item["Title"] = "Temp Change"
    "During edit - Title: $($item['Title'])"
    $item.Editing.CancelEdit()
    "After CancelEdit - Title: $($item['Title'])"
} "BeginEdit, set, CancelEdit (no persist)"

Capture-Output {
    $item = Get-Item -Path "master:\content\Home"
    "Editing.IsEditing before: $($item.Editing.IsEditing)"
    $item.Editing.BeginEdit()
    "Editing.IsEditing during: $($item.Editing.IsEditing)"
    $item.Editing.CancelEdit()
    "Editing.IsEditing after: $($item.Editing.IsEditing)"
} "IsEditing state transitions"

# ============================================================================
# 5. NEW-ITEM / REMOVE-ITEM BEHAVIOR
#    Output format for New-Item, error for duplicate names, 
#    Remove-Item confirmation behavior
# ============================================================================
Add-Section "5. New-Item and Remove-Item"

Capture-Output {
    # Create a temp item then immediately remove it
    $newItem = New-Item -Path "master:\content\Home" -Name "__tutorial_test_temp" -ItemType "Sample/Sample Item"
    $newItem | Out-String
    Remove-Item -Path "master:\content\Home\__tutorial_test_temp" -Permanently
    "Cleanup complete"
} "New-Item output format + cleanup"

Capture-Output {
    New-Item -Path "master:\content\Home" -Name "__tutorial_test_dup" -ItemType "Sample/Sample Item" | Out-Null
    # Try creating same name again
    New-Item -Path "master:\content\Home" -Name "__tutorial_test_dup" -ItemType "Sample/Sample Item"
    Remove-Item -Path "master:\content\Home\__tutorial_test_dup" -Permanently
    # Clean up any duplicate too
    $dupes = Get-ChildItem -Path "master:\content\Home" | Where-Object { $_.Name -eq "__tutorial_test_dup" }
    $dupes | Remove-Item -Permanently
} "New-Item with duplicate name"

# ============================================================================
# 6. PIPELINE INPUT BEHAVIOR
#    Can Get-ChildItem take pipeline input from Get-Item?
# ============================================================================
Add-Section "6. Pipeline Input Patterns"

Capture-Output {
    Get-Item -Path "master:\content\Home" | Get-ChildItem
} "Get-Item piped to Get-ChildItem"

Capture-Output {
    Get-Item -Path "master:\content\Home" | Get-ChildItem -Recurse | 
        Select-Object -First 3
} "Pipeline with Select-Object -First"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse |
        Group-Object -Property TemplateName
} "Group-Object by TemplateName"

Capture-Output {
    Get-ChildItem -Path "master:\content\Home" -Recurse |
        Sort-Object -Property Name -Descending |
        Select-Object -First 5 -Property Name, TemplateName
} "Sort descending + First 5"

# ============================================================================
# 7. USING SITECORE QUERY
#    Does Get-Item support Sitecore query syntax?
# ============================================================================
Add-Section "7. Query Syntax"

Capture-Output {
    Get-Item -Path "master:" -Query "/sitecore/content/Home/*"
} "Get-Item with -Query parameter"

Capture-Output {
    Get-Item -Path "master:" -Query "/sitecore/content/Home//*[@@templatename='Sample Item']"
} "Get-Item -Query with template filter"

# ============================================================================
# OUTPUT
# ============================================================================
$finalOutput = $results.ToString()
$finalOutput

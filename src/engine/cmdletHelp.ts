// ============================================================================
// Centralized Help Data for SPE Cmdlets
// ============================================================================

export interface ParamHelp {
  name: string;
  type: string;
  description: string;
  required: boolean;
  position: number | null;
  defaultValue?: string;
}

export interface CmdletExample {
  title: string;
  code: string;
  description: string;
}

export interface CmdletHelp {
  name: string;
  synopsis: string;
  description: string;
  syntax: string[];
  /** Optional labels for each syntax line (e.g. parameter set names) */
  syntaxLabels?: string[];
  parameters: ParamHelp[];
  examples: CmdletExample[];
  aliases: string[];
  relatedCmdlets: string[];
}

// ============================================================================
// Full help entries for top 10 cmdlets
// ============================================================================

const FULL_HELP: CmdletHelp[] = [
  {
    name: "Get-Item",
    synopsis: "Gets a Sitecore item at the specified path.",
    description:
      "The Get-Item command retrieves a Sitecore item from the content tree using a drive-qualified path (e.g. master:\\content\\Home). " +
      "It returns a single item with its properties including Name, TemplateName, ID, and all field values.",
    syntax: ["Get-Item [-Path] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item (e.g. master:\\content\\Home).",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Get the Home item",
        code: 'Get-Item -Path "master:\\content\\Home"',
        description: "Retrieves the Home item from the master database.",
      },
      {
        title: "Example 2: Get an item using positional parameter",
        code: "Get-Item master:\\content\\Home\\About",
        description: "The -Path parameter is positional, so you can omit the parameter name.",
      },
    ],
    aliases: ["gi"],
    relatedCmdlets: ["Get-ChildItem", "Set-Location", "New-Item"],
  },
  {
    name: "Get-ChildItem",
    synopsis: "Gets the child items of a Sitecore item.",
    description:
      "The Get-ChildItem command returns the direct children of a Sitecore item. " +
      "Use -Recurse to retrieve all descendants. Commonly aliased as gci, ls, or dir.",
    syntax: [
      "Get-ChildItem [-Path] <String> [-Recurse]",
    ],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the parent item.",
        required: true,
        position: 0,
      },
      {
        name: "Recurse",
        type: "SwitchParameter",
        description: "Gets items in all child containers recursively.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: List children of Home",
        code: 'Get-ChildItem -Path "master:\\content\\Home"',
        description: "Returns the direct children of the Home item (About, Products, News).",
      },
      {
        title: "Example 2: Recursively list all descendants",
        code: 'Get-ChildItem -Path "master:\\content\\Home" -Recurse',
        description: "Returns all items under Home, including nested children.",
      },
      {
        title: "Example 3: Using alias",
        code: 'gci "master:\\content\\Home"',
        description: "Uses the built-in alias gci instead of the full command name.",
      },
    ],
    aliases: ["gci", "ls", "dir"],
    relatedCmdlets: ["Get-Item", "Where-Object", "Select-Object"],
  },
  {
    name: "Where-Object",
    synopsis: "Filters items from the pipeline based on a condition.",
    description:
      "The Where-Object command selects items from a pipeline based on a script block condition. " +
      "Use $_ inside the script block to reference the current pipeline item. " +
      "Supports operators like -eq, -ne, -like, -match, -gt, -lt and compound conditions with -and/-or.",
    syntax: [
      "... | Where-Object { <condition> }",
    ],
    parameters: [
      {
        name: "FilterScript",
        type: "ScriptBlock",
        description: "A script block that evaluates to $true or $false for each item. Use $_ to reference the current item.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Filter by template name",
        code: 'Get-ChildItem master:\\content\\Home | Where-Object { $_.TemplateName -eq "Sample Item" }',
        description: "Returns only children of Home whose template is 'Sample Item'.",
      },
      {
        title: "Example 2: Filter with wildcard",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Where-Object { $_.Name -like "*News*" }',
        description: "Finds all descendants with 'News' in the name.",
      },
      {
        title: "Example 3: Compound filter",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Where-Object { $_.HasChildren -eq "True" -and $_.TemplateName -ne "Folder" }',
        description: "Combines multiple conditions with -and.",
      },
    ],
    aliases: ["where", "?"],
    relatedCmdlets: ["ForEach-Object", "Select-Object", "Get-ChildItem"],
  },
  {
    name: "ForEach-Object",
    synopsis: "Performs an operation on each item in the pipeline.",
    description:
      "The ForEach-Object command executes a script block against each item in the pipeline. " +
      "Use $_ to reference the current item. The output of the script block replaces the pipeline data.",
    syntax: [
      "... | ForEach-Object { <script block> }",
    ],
    parameters: [
      {
        name: "Process",
        type: "ScriptBlock",
        description: "The script block to execute for each item. Use $_ to reference the current item.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Output item names",
        code: 'Get-ChildItem master:\\content\\Home | ForEach-Object { $_.Name }',
        description: "Extracts the Name property from each child item.",
      },
      {
        title: "Example 2: String formatting",
        code: 'Get-ChildItem master:\\content\\Home | ForEach-Object { "Item: $($_.Name)" }',
        description: "Creates formatted strings for each pipeline item.",
      },
      {
        title: "Example 3: Using alias",
        code: 'Get-ChildItem master:\\content\\Home | % { $_.Name }',
        description: "Uses the % alias for ForEach-Object.",
      },
    ],
    aliases: ["foreach", "%"],
    relatedCmdlets: ["Where-Object", "Select-Object", "Write-Host"],
  },
  {
    name: "Select-Object",
    synopsis: "Selects specific properties or a subset of items from the pipeline.",
    description:
      "The Select-Object command selects specified properties from items, creating objects with only those properties. " +
      "Use -First/-Last to limit items, -Skip/-SkipLast to skip items, -ExpandProperty to unwrap a single property, " +
      "-ExcludeProperty to remove properties from the output, and -Unique to remove duplicates.",
    syntax: [
      "... | Select-Object [-Property] <String[]> [-ExcludeProperty <String[]>]",
      "... | Select-Object -ExpandProperty <String>",
      "... | Select-Object [-First <Int>] [-Last <Int>] [-Skip <Int>] [-SkipLast <Int>]",
    ],
    syntaxLabels: ["Properties", "Expand", "Subset"],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The properties to select. Separate multiple properties with commas. Use * for all properties.",
        required: false,
        position: 0,
      },
      {
        name: "ExcludeProperty",
        type: "String[]",
        description: "Properties to exclude from the output. Often used with -Property * to select all except specific properties.",
        required: false,
        position: null,
      },
      {
        name: "ExpandProperty",
        type: "String",
        description: "Expands a single property value instead of returning the item. Useful for extracting strings or nested collections.",
        required: false,
        position: null,
      },
      {
        name: "First",
        type: "Int32",
        description: "Gets only the specified number of items from the beginning of the pipeline.",
        required: false,
        position: null,
      },
      {
        name: "Last",
        type: "Int32",
        description: "Gets only the specified number of items from the end of the pipeline.",
        required: false,
        position: null,
      },
      {
        name: "Skip",
        type: "Int32",
        description: "Skips the specified number of items from the beginning, then selects the rest.",
        required: false,
        position: null,
      },
      {
        name: "SkipLast",
        type: "Int32",
        description: "Skips the specified number of items from the end of the pipeline.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Select specific properties",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Select-Object -Property Name, TemplateName',
        description: "Returns a table showing only Name and TemplateName for each item.",
      },
      {
        title: "Example 2: Get the first 3 items",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Select-Object -First 3',
        description: "Returns only the first 3 items from the pipeline.",
      },
      {
        title: "Example 3: Skip and take",
        code: 'Get-ChildItem master:\\content\\Home | Select-Object -Skip 2 -First 3',
        description: "Skips the first 2 items, then takes the next 3.",
      },
      {
        title: "Example 4: Expand a property",
        code: 'Get-ChildItem master:\\content\\Home | Select-Object -ExpandProperty Name',
        description: "Returns just the Name string values instead of item objects.",
      },
      {
        title: "Example 5: Exclude properties",
        code: 'Get-Item master:\\content\\Home | Select-Object * -ExcludeProperty TemplateID',
        description: "Selects all properties except TemplateID.",
      },
    ],
    aliases: ["select"],
    relatedCmdlets: ["Sort-Object", "Where-Object", "Format-Table"],
  },
  {
    name: "Sort-Object",
    synopsis: "Sorts items in the pipeline by property values.",
    description:
      "The Sort-Object command sorts items by one or more property values. " +
      "By default, sorting is ascending. Use -Descending to reverse the order. " +
      "Use -Unique to remove duplicates from the sorted output.",
    syntax: [
      "... | Sort-Object [-Property] <String[]> [-Descending] [-Unique]",
    ],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The property or properties to sort by. Separate multiple properties with commas.",
        required: false,
        position: 0,
      },
      {
        name: "Descending",
        type: "SwitchParameter",
        description: "Sorts in descending order.",
        required: false,
        position: null,
      },
      {
        name: "Unique",
        type: "SwitchParameter",
        description: "Eliminates duplicates and returns only unique items.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Sort by name",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Sort-Object Name',
        description: "Sorts all descendants alphabetically by name.",
      },
      {
        title: "Example 2: Sort descending",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Sort-Object Name -Descending',
        description: "Sorts all descendants in reverse alphabetical order.",
      },
    ],
    aliases: ["sort"],
    relatedCmdlets: ["Select-Object", "Where-Object", "Group-Object"],
  },
  {
    name: "Set-Location",
    synopsis: "Sets the current working location to a Sitecore path.",
    description:
      "The Set-Location command changes your current working directory in the Sitecore tree. " +
      "After changing location, you can use relative paths with other commands.",
    syntax: ["Set-Location [-Path] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to navigate to.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Navigate to content root",
        code: 'Set-Location "master:\\content\\Home"',
        description: "Changes the working directory to the Home item.",
      },
      {
        title: "Example 2: Using alias",
        code: 'cd "master:\\content\\Home\\About"',
        description: "Uses the cd alias to navigate.",
      },
    ],
    aliases: ["cd", "sl", "chdir"],
    relatedCmdlets: ["Get-Location", "Get-Item", "Get-ChildItem"],
  },
  {
    name: "New-Item",
    synopsis: "Creates a new Sitecore item at the specified path.",
    description:
      "The New-Item command creates a new item in the Sitecore content tree. " +
      "You must specify the parent path and a name for the new item. Optionally specify -ItemType for the template.",
    syntax: ["New-Item [-Path] <String> -Name <String> [-ItemType <String>]"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The path to the parent item where the new item will be created.",
        required: true,
        position: 0,
      },
      {
        name: "Name",
        type: "String",
        description: "The name of the new item.",
        required: true,
        position: null,
      },
      {
        name: "ItemType",
        type: "String",
        description: "The template name for the new item.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Create a new item",
        code: 'New-Item -Path "master:\\content\\Home" -Name "Blog" -ItemType "Sample Item"',
        description: "Creates a new item named 'Blog' under Home.",
      },
    ],
    aliases: ["ni"],
    relatedCmdlets: ["Get-Item", "Remove-Item", "Copy-Item"],
  },
  {
    name: "Format-Table",
    synopsis: "Formats pipeline output as a table with selected columns.",
    description:
      "The Format-Table command formats the output of a pipeline as a table with specified properties as columns. " +
      "Use -AutoSize to fit columns to the data width, -HideTableHeaders for header-free output, " +
      "or -GroupBy to break the table into groups by a property value.",
    syntax: [
      "... | Format-Table [-Property] <String[]> [-AutoSize] [-HideTableHeaders] [-GroupBy <String>]",
    ],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The properties to display as table columns.",
        required: false,
        position: 0,
      },
      {
        name: "GroupBy",
        type: "String",
        description: "Groups the table output by the specified property, adding a header for each group.",
        required: false,
        position: null,
      },
      {
        name: "AutoSize",
        type: "SwitchParameter",
        description: "Adjusts the column size based on the width of the data.",
        required: false,
        position: null,
      },
      {
        name: "HideTableHeaders",
        type: "SwitchParameter",
        description: "Omits the column headers from the table.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Format as table",
        code: 'Get-ChildItem master:\\content\\Home | Format-Table Name, TemplateName',
        description: "Displays child items in a table with Name and TemplateName columns.",
      },
    ],
    aliases: ["ft"],
    relatedCmdlets: ["Select-Object", "ConvertTo-Json"],
  },
  {
    name: "Write-Host",
    synopsis: "Writes text to the console output.",
    description:
      "The Write-Host command writes customized output to the console. " +
      "Unlike Write-Output, it writes directly to the host and does not pass objects through the pipeline. " +
      "Use -ForegroundColor for colored output, -NoNewline to suppress the trailing newline, " +
      "or -Separator to control how multiple objects are joined.",
    syntax: [
      "Write-Host [-Object] <String> [-ForegroundColor <String>] [-NoNewline] [-Separator <String>]",
    ],
    parameters: [
      {
        name: "Object",
        type: "String",
        description: "The text or object to display.",
        required: false,
        position: 0,
      },
      {
        name: "ForegroundColor",
        type: "String",
        description: "The text color (e.g. Red, Green, Yellow, Cyan).",
        required: false,
        position: null,
      },
      {
        name: "NoNewline",
        type: "SwitchParameter",
        description: "Suppresses the newline at the end of the output.",
        required: false,
        position: null,
      },
      {
        name: "Separator",
        type: "String",
        description: "String to insert between multiple objects.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Write a message",
        code: 'Write-Host "Hello from SPE!"',
        description: "Displays a simple text message.",
      },
      {
        title: "Example 2: Write with color",
        code: 'Write-Host "Warning!" -ForegroundColor Yellow',
        description: "Displays text in yellow.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Write-Output", "ForEach-Object"],
  },
];

// ============================================================================
// Full help entries for remaining cmdlets
// ============================================================================

const FULL_HELP_2: CmdletHelp[] = [
  {
    name: "Get-Location",
    synopsis: "Gets the current working location.",
    description:
      "The Get-Location command returns the current Sitecore drive path. " +
      "This is useful for confirming your position in the content tree after navigating with Set-Location.",
    syntax: ["Get-Location"],
    parameters: [],
    examples: [
      {
        title: "Example 1: Display the current location",
        code: "Get-Location",
        description: "Returns the current working path (e.g. master:\\content\\Home).",
      },
      {
        title: "Example 2: Using alias",
        code: "pwd",
        description: "Uses the pwd alias to show the current location.",
      },
    ],
    aliases: ["pwd", "gl"],
    relatedCmdlets: ["Set-Location"],
  },
  {
    name: "Get-Member",
    synopsis: "Gets the properties of pipeline objects.",
    description:
      "The Get-Member command displays the properties available on Sitecore items in the pipeline. " +
      "This includes built-in properties like Name, TemplateName, and ID as well as all custom field values. " +
      "Use it to discover what properties you can access on an item.",
    syntax: ["<input> | Get-Member"],
    parameters: [],
    examples: [
      {
        title: "Example 1: Inspect properties of the Home item",
        code: "Get-Item master:\\content\\Home | Get-Member",
        description: "Lists all available properties on the Home item.",
      },
      {
        title: "Example 2: Discover fields on a child item",
        code: "Get-ChildItem master:\\content\\Home | Select-Object -First 1 | Get-Member",
        description: "Shows the properties available on the first child of Home.",
      },
    ],
    aliases: ["gm"],
    relatedCmdlets: ["Select-Object"],
  },
  {
    name: "Group-Object",
    synopsis: "Groups pipeline items by a property value.",
    description:
      "The Group-Object command groups pipeline items that share the same value for a specified property. " +
      "Each group includes a Count, Name (the shared value), and the grouped items. " +
      "Use -NoElement to omit the grouped items and show only the count and name.",
    syntax: ["<input> | Group-Object [-Property] <String> [-NoElement]"],
    parameters: [
      {
        name: "Property",
        type: "String",
        description: "The property to group by.",
        required: true,
        position: 0,
      },
      {
        name: "NoElement",
        type: "SwitchParameter",
        description: "Omits the members of a group from the results, showing only Count and Name.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Group children by template",
        code: "Get-ChildItem master:\\content\\Home -Recurse | Group-Object TemplateName",
        description: "Groups all descendants of Home by their template name, showing how many items use each template.",
      },
      {
        title: "Example 2: Group and format results",
        code: "Get-ChildItem master:\\content\\Home -Recurse | Group-Object TemplateName | Format-Table Count, Name",
        description: "Groups by template and displays only the count and template name columns.",
      },
    ],
    aliases: ["group"],
    relatedCmdlets: ["Sort-Object", "Measure-Object"],
  },
  {
    name: "Measure-Object",
    synopsis: "Calculates numeric properties or counts items in the pipeline.",
    description:
      "The Measure-Object command counts pipeline items and optionally calculates Sum, Average, Maximum, and Minimum " +
      "for a numeric property. Without -Property, it returns only the Count.",
    syntax: [
      "<input> | Measure-Object",
      "<input> | Measure-Object [-Property] <String> [-Sum] [-Average] [-Maximum] [-Minimum]",
    ],
    syntaxLabels: ["Count", "Numeric"],
    parameters: [
      {
        name: "Property",
        type: "String",
        description: "A numeric property to measure. Required when using -Sum, -Average, -Maximum, or -Minimum.",
        required: false,
        position: 0,
      },
      {
        name: "Sum",
        type: "SwitchParameter",
        description: "Calculates the sum of the specified property values.",
        required: false,
        position: null,
      },
      {
        name: "Average",
        type: "SwitchParameter",
        description: "Calculates the average of the specified property values.",
        required: false,
        position: null,
      },
      {
        name: "Maximum",
        type: "SwitchParameter",
        description: "Returns the maximum value of the specified property.",
        required: false,
        position: null,
      },
      {
        name: "Minimum",
        type: "SwitchParameter",
        description: "Returns the minimum value of the specified property.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Count children of Home",
        code: "Get-ChildItem master:\\content\\Home | Measure-Object",
        description: "Returns the number of direct children under the Home item.",
      },
      {
        title: "Example 2: Count all descendants",
        code: "Get-ChildItem master:\\content\\Home -Recurse | Measure-Object",
        description: "Counts every item in the entire tree under Home.",
      },
      {
        title: "Example 3: Count filtered items",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Where-Object { $_.TemplateName -eq "Sample Item" } | Measure-Object',
        description: "Counts only items that use the Sample Item template.",
      },
    ],
    aliases: ["measure"],
    relatedCmdlets: ["Group-Object", "Select-Object"],
  },
  {
    name: "Remove-Item",
    synopsis: "Removes a Sitecore item.",
    description:
      "The Remove-Item command deletes an item from the Sitecore content tree. " +
      "You can specify the item by path or pipe it from the pipeline. " +
      "The item and all its children are removed.",
    syntax: ["Remove-Item [-Path] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item to remove.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Remove an item by path",
        code: "Remove-Item master:\\content\\Home\\About",
        description: "Deletes the About item from under Home.",
      },
      {
        title: "Example 2: Remove via pipeline",
        code: "Get-Item master:\\content\\Home\\About | Remove-Item",
        description: "Pipes an item to Remove-Item for deletion.",
      },
    ],
    aliases: ["ri", "rm", "del"],
    relatedCmdlets: ["New-Item", "Move-Item"],
  },
  {
    name: "Copy-Item",
    synopsis: "Copies a Sitecore item to a new location.",
    description:
      "The Copy-Item command creates a duplicate of a Sitecore item at a new destination path. " +
      "The original item remains unchanged. The copy receives a new ID but retains all field values.",
    syntax: ["Copy-Item [-Path] <String> [-Destination] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item to copy.",
        required: true,
        position: 0,
      },
      {
        name: "Destination",
        type: "String",
        description: "The Sitecore drive path where the copy will be created.",
        required: true,
        position: 1,
      },
    ],
    examples: [
      {
        title: "Example 1: Copy an item to a new location",
        code: "Copy-Item master:\\content\\Home\\About master:\\content\\Home\\Products",
        description: "Creates a copy of the About item under Products.",
      },
      {
        title: "Example 2: Copy using named parameters",
        code: 'Copy-Item -Path "master:\\content\\Home\\About" -Destination "master:\\content\\Home\\News"',
        description: "Copies the About item under the News section.",
      },
    ],
    aliases: ["ci", "cp", "copy"],
    relatedCmdlets: ["Move-Item", "New-Item"],
  },
  {
    name: "Move-Item",
    synopsis: "Moves a Sitecore item to a new location.",
    description:
      "The Move-Item command relocates a Sitecore item from its current position to a new parent. " +
      "The item keeps its name, ID, and field values but changes its position in the content tree.",
    syntax: ["Move-Item [-Path] <String> [-Destination] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item to move.",
        required: true,
        position: 0,
      },
      {
        name: "Destination",
        type: "String",
        description: "The Sitecore drive path of the new parent item.",
        required: true,
        position: 1,
      },
    ],
    examples: [
      {
        title: "Example 1: Move an item to a new parent",
        code: "Move-Item master:\\content\\Home\\About master:\\content\\Home\\Products",
        description: "Moves the About item so it becomes a child of Products.",
      },
      {
        title: "Example 2: Move using named parameters",
        code: 'Move-Item -Path "master:\\content\\Home\\About" -Destination "master:\\content\\Home\\News"',
        description: "Moves the About item under the News section.",
      },
    ],
    aliases: ["mi", "mv", "move"],
    relatedCmdlets: ["Copy-Item", "Rename-Item"],
  },
  {
    name: "Rename-Item",
    synopsis: "Renames a Sitecore item.",
    description:
      "The Rename-Item command changes the name of an existing Sitecore item. " +
      "You can specify the item by path or pipe it from the pipeline. " +
      "The item keeps its ID, fields, and position in the tree.",
    syntax: ["Rename-Item [-Path] <String> [-NewName] <String>"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item to rename.",
        required: true,
        position: 0,
      },
      {
        name: "NewName",
        type: "String",
        description: "The new name for the item.",
        required: true,
        position: 1,
      },
    ],
    examples: [
      {
        title: "Example 1: Rename an item",
        code: 'Rename-Item master:\\content\\Home\\About -NewName "About Us"',
        description: "Renames the About item to 'About Us'.",
      },
      {
        title: "Example 2: Rename via pipeline",
        code: 'Get-Item master:\\content\\Home\\About | Rename-Item -NewName "About Us"',
        description: "Pipes an item to Rename-Item and sets the new name.",
      },
    ],
    aliases: ["rni", "ren"],
    relatedCmdlets: ["Move-Item", "Copy-Item"],
  },
  {
    name: "Set-ItemProperty",
    synopsis: "Sets a field value on a Sitecore item.",
    description:
      "The Set-ItemProperty command updates the value of a field on a Sitecore item. " +
      "Specify the item by path or pipe it from the pipeline, then provide the field name and new value. " +
      "This is the primary way to edit item field data in SPE.",
    syntax: ["Set-ItemProperty [-Path] <String> -Name <String> [-Value <String>]"],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item.",
        required: true,
        position: 0,
      },
      {
        name: "Name",
        type: "String",
        description: "The name of the field to set.",
        required: true,
        position: null,
      },
      {
        name: "Value",
        type: "String",
        description: "The new value for the field.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Set a field value",
        code: 'Set-ItemProperty -Path "master:\\content\\Home" -Name "Title" -Value "Welcome"',
        description: "Sets the Title field on the Home item to 'Welcome'.",
      },
      {
        title: "Example 2: Set a field via pipeline",
        code: 'Get-Item master:\\content\\Home | Set-ItemProperty -Name "Title" -Value "Updated Title"',
        description: "Pipes the Home item and updates its Title field.",
      },
    ],
    aliases: ["sp"],
    relatedCmdlets: ["Get-Item", "Get-Member"],
  },
  {
    name: "ConvertTo-Json",
    synopsis: "Converts pipeline objects to JSON format.",
    description:
      "The ConvertTo-Json command serializes pipeline items into a JSON string representation. " +
      "This is useful for inspecting the full structure of Sitecore items or exporting data for use outside SPE.",
    syntax: ["<input> | ConvertTo-Json"],
    parameters: [],
    examples: [
      {
        title: "Example 1: Convert an item to JSON",
        code: "Get-Item master:\\content\\Home | ConvertTo-Json",
        description: "Displays the Home item's properties and fields as a JSON object.",
      },
      {
        title: "Example 2: Convert multiple items to JSON",
        code: "Get-ChildItem master:\\content\\Home | ConvertTo-Json",
        description: "Serializes all children of Home as a JSON array.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Format-Table", "Select-Object"],
  },
  {
    name: "Write-Output",
    synopsis: "Sends output to the pipeline.",
    description:
      "The Write-Output command sends objects to the success pipeline. " +
      "Unlike Write-Host, the output can be captured in variables or piped to other commands. " +
      "Multiple arguments are joined with spaces.",
    syntax: ["Write-Output <Object>"],
    parameters: [
      {
        name: "InputObject",
        type: "String",
        description: "The object or text to write to the pipeline.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Write a message",
        code: 'Write-Output "Hello from SPE"',
        description: "Sends the string to the output pipeline.",
      },
      {
        title: "Example 2: Using alias",
        code: 'echo "Testing 1 2 3"',
        description: "Uses the echo alias to write output.",
      },
    ],
    aliases: ["echo", "write"],
    relatedCmdlets: ["Write-Host"],
  },
  {
    name: "Show-Alert",
    synopsis: "Displays a Sitecore alert dialog.",
    description:
      "The Show-Alert command displays a modal alert dialog in the Sitecore interface. " +
      "In the simulation, it renders an alert panel with the specified title text.",
    syntax: ["Show-Alert [-Title] <String>"],
    parameters: [
      {
        name: "Title",
        type: "String",
        description: "The message text to display in the alert dialog.",
        required: true,
        position: 0,
      },
    ],
    examples: [
      {
        title: "Example 1: Show a simple alert",
        code: 'Show-Alert "Operation complete"',
        description: "Displays an alert dialog with the message 'Operation complete'.",
      },
      {
        title: "Example 2: Show alert with a dynamic message",
        code: 'Show-Alert "Found $((Get-ChildItem master:\\content\\Home | Measure-Object).Count) items"',
        description: "Displays an alert with a dynamically generated item count.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Read-Variable", "Show-ListView"],
  },
  {
    name: "Show-ListView",
    synopsis: "Displays pipeline items in a list view dialog.",
    description:
      "The Show-ListView command presents pipeline items in a Sitecore list view dialog. " +
      "You can optionally specify which properties to display as columns and a title for the dialog. " +
      "In the simulation, it renders a formatted table view.",
    syntax: ["<input> | Show-ListView [-Property <String[]>] [-Title <String>]"],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The properties to display as columns in the list view.",
        required: false,
        position: 0,
      },
      {
        name: "Title",
        type: "String",
        description: "The title to display in the dialog header.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Show children in a list view",
        code: 'Get-ChildItem master:\\content\\Home | Show-ListView -Property Name, TemplateName -Title "Home Children"',
        description: "Displays children of Home in a list view showing Name and TemplateName columns.",
      },
      {
        title: "Example 2: Show filtered items",
        code: 'Get-ChildItem master:\\content\\Home -Recurse | Where-Object { $_.TemplateName -eq "Sample Item" } | Show-ListView -Property Name',
        description: "Filters items by template and displays them in a list view.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Alert", "Format-Table"],
  },
  {
    name: "Read-Variable",
    synopsis: "Shows a dialog for user input.",
    description:
      "The Read-Variable command displays a Sitecore dialog that prompts the user to enter values for variables. " +
      "In the simulation, it renders a dialog panel with the specified title and description.",
    syntax: ["Read-Variable -Title <String> [-Description <String>]"],
    parameters: [
      {
        name: "Title",
        type: "String",
        description: "The title to display at the top of the input dialog.",
        required: true,
        position: null,
      },
      {
        name: "Description",
        type: "String",
        description: "A description or instructions displayed in the dialog.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Show a variable input dialog",
        code: 'Read-Variable -Title "Configure Report"',
        description: "Displays a dialog with the title 'Configure Report'.",
      },
      {
        title: "Example 2: Dialog with description",
        code: 'Read-Variable -Title "Settings" -Description "Choose your report parameters"',
        description: "Shows a dialog with both a title and descriptive text.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Alert"],
  },
  {
    name: "Close-Window",
    synopsis: "Closes the current Sitecore dialog.",
    description:
      "The Close-Window command closes any open SPE dialog window. " +
      "In the simulation, this is a no-op since dialogs are rendered inline. " +
      "It is included for script compatibility with real SPE.",
    syntax: ["Close-Window"],
    parameters: [],
    examples: [
      {
        title: "Example 1: Close the dialog",
        code: "Close-Window",
        description: "Closes the current dialog (no-op in the simulation).",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Alert", "Show-ListView"],
  },
  {
    name: "Get-Alias",
    synopsis: "Lists available command aliases.",
    description:
      "The Get-Alias command displays all supported command aliases and the commands they map to. " +
      "This is helpful for discovering shortcuts like gci for Get-ChildItem or % for ForEach-Object.",
    syntax: ["Get-Alias"],
    parameters: [],
    examples: [
      {
        title: "Example 1: List all aliases",
        code: "Get-Alias",
        description: "Displays a table of all available aliases and their target commands.",
      },
      {
        title: "Example 2: Using alias",
        code: "gal",
        description: "Uses the gal alias to list all aliases.",
      },
    ],
    aliases: ["gal"],
    relatedCmdlets: ["Get-Help"],
  },
  {
    name: "Find-Item",
    synopsis: "Searches the Sitecore index for items matching criteria.",
    description:
      "The Find-Item command uses Sitecore's search index to find items based on field criteria. " +
      "It is faster than tree traversal for large content trees. " +
      "Each criterion is a hashtable with Filter, Field, and Value keys.",
    syntax: ["Find-Item [-Index] <String> -Criteria <Hashtable[]> [-OrderBy <String>] [-First <Int>] [-Last <Int>] [-Skip <Int>]"],
    parameters: [
      {
        name: "Index",
        type: "String",
        description: "The name of the search index to query (e.g. sitecore_master_index).",
        required: true,
        position: 0,
      },
      {
        name: "Criteria",
        type: "Hashtable[]",
        description: "One or more hashtables specifying search criteria. Each should have Filter, Field, and Value keys.",
        required: true,
        position: null,
      },
      {
        name: "OrderBy",
        type: "String",
        description: "The field to sort results by.",
        required: false,
        position: null,
      },
      {
        name: "First",
        type: "Int32",
        description: "Returns only the first N matching items.",
        required: false,
        position: null,
      },
      {
        name: "Last",
        type: "Int32",
        description: "Returns only the last N matching items.",
        required: false,
        position: null,
      },
      {
        name: "Skip",
        type: "Int32",
        description: "Skips the first N matching items.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Find items by template",
        code: 'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"}',
        description: "Searches the master index for all items using the Sample Item template.",
      },
      {
        title: "Example 2: Find with multiple criteria",
        code: 'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"}, @{Filter="Contains"; Field="Title"; Value="Welcome"}',
        description: "Finds Sample Item items whose Title field contains 'Welcome'.",
      },
      {
        title: "Example 3: Find with result limiting",
        code: 'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"} -First 5',
        description: "Returns only the first 5 matching items.",
      },
    ],
    aliases: ["fi"],
    relatedCmdlets: ["Get-ChildItem", "Where-Object"],
  },
  {
    name: "Publish-Item",
    synopsis: "Publishes a Sitecore item to a publishing target.",
    description:
      "The Publish-Item command publishes one or more Sitecore items to a specified publishing target (default: web). " +
      "You can specify the publish mode (Smart, Full, or Incremental) and optionally publish child items with -Recurse. " +
      "Items can be provided via -Path, -Item, or pipeline input.",
    syntax: [
      "Publish-Item [-Path] <String> [-PublishMode <String>] [-Target <String>] [-Language <String>] [-Recurse]",
      "<input> | Publish-Item [-PublishMode <String>] [-Target <String>] [-Recurse]",
    ],
    parameters: [
      {
        name: "Path",
        type: "String",
        description: "The Sitecore drive path to the item to publish.",
        required: false,
        position: 0,
      },
      {
        name: "Item",
        type: "Item",
        description: "The Sitecore item object to publish.",
        required: false,
        position: null,
      },
      {
        name: "PublishMode",
        type: "String",
        description: "The publish mode: Smart (default), Full, or Incremental.",
        required: false,
        position: null,
        defaultValue: "Smart",
      },
      {
        name: "Target",
        type: "String",
        description: "The publishing target database (default: web).",
        required: false,
        position: null,
        defaultValue: "web",
      },
      {
        name: "Language",
        type: "String",
        description: "The language version to publish.",
        required: false,
        position: null,
      },
      {
        name: "Recurse",
        type: "SwitchParameter",
        description: "When specified, publishes the item and all its descendants.",
        required: false,
        position: null,
      },
    ],
    examples: [
      {
        title: "Example 1: Publish an item by path",
        code: 'Publish-Item -Path "master:\\content\\Home"',
        description: "Publishes the Home item to the default web target using Smart publish mode.",
      },
      {
        title: "Example 2: Publish via pipeline",
        code: 'Get-Item master:\\content\\Home | Publish-Item -PublishMode Full',
        description: "Pipes the Home item and publishes it using Full publish mode.",
      },
      {
        title: "Example 3: Publish multiple items",
        code: 'Get-ChildItem master:\\content\\Home | Publish-Item -Target "web"',
        description: "Publishes all children of Home to the web target.",
      },
    ],
    aliases: ["pi"],
    relatedCmdlets: ["Get-Item", "Get-ChildItem"],
  },
  {
    name: "Initialize-Item",
    synopsis: "Converts search result objects to full Sitecore items.",
    description:
      "The Initialize-Item command converts SearchResultItem objects (returned by Find-Item) into full Sitecore Item objects. " +
      "This is necessary in real SPE because search results are lightweight proxies that don't support all item operations. " +
      "In the simulation, Find-Item already returns full items, so Initialize-Item acts as a pass-through.",
    syntax: ["<input> | Initialize-Item"],
    parameters: [],
    examples: [
      {
        title: "Example 1: Initialize search results",
        code: 'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"} | Initialize-Item',
        description: "Converts Find-Item search results into full Sitecore items for further processing.",
      },
      {
        title: "Example 2: Initialize and select properties",
        code: 'Find-Item -Index sitecore_master_index -Criteria @{Filter="Equals"; Field="_templatename"; Value="Sample Item"} | Initialize-Item | Select-Object Name, TemplateName',
        description: "Converts search results to items and selects specific properties.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Find-Item", "Get-Item"],
  },
];

// ============================================================================
// Help entries — third batch: dialog cmdlets, write streams, DialogBuilder /
// SearchBuilder modules, and security commands.
// ============================================================================

const FULL_HELP_3: CmdletHelp[] = [
  // ---------- Show family (parameter and modal dialogs) ----------
  {
    name: "Show-Confirm",
    synopsis: "Displays a Yes/No confirmation dialog.",
    description:
      "Shows a modal Yes/No prompt and returns 'yes' or 'no'. Useful for guarding destructive operations behind explicit user confirmation.",
    syntax: ["Show-Confirm [-Title] <String>"],
    parameters: [
      { name: "Title", type: "String", description: "The prompt text to display.", required: true, position: 0 },
    ],
    examples: [
      {
        title: "Example 1: Confirm before deleting",
        code: 'if ((Show-Confirm "Delete the Home item?") -eq "yes") { Remove-Item master:\\content\\Home }',
        description: "Only proceeds with the destructive operation if the user clicks Yes.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Alert", "Show-Input", "Show-YesNoCancel"],
  },
  {
    name: "Show-Input",
    synopsis: "Displays a single-field text input dialog.",
    description: "Prompts the user for a string value and returns whatever was typed (or $null if cancelled).",
    syntax: ["Show-Input [-Prompt] <String> [-DefaultValue <String>]"],
    parameters: [
      { name: "Prompt", type: "String", description: "Label shown above the input field.", required: true, position: 0 },
      { name: "DefaultValue", type: "String", description: "Pre-populated text in the input.", required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Ask for a name",
        code: '$name = Show-Input "What is the new item name?"',
        description: "Captures user input into a variable for later use.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Confirm", "Read-Variable"],
  },
  {
    name: "Show-YesNoCancel",
    synopsis: "Displays a Yes/No/Cancel dialog.",
    description:
      "A three-way prompt that returns 'yes', 'no', or 'cancel'. Used when the user needs a third option beyond simple confirmation.",
    syntax: ["Show-YesNoCancel [-Title] <String>"],
    parameters: [
      { name: "Title", type: "String", description: "The prompt text to display.", required: true, position: 0 },
    ],
    examples: [
      {
        title: "Example 1: Save changes prompt",
        code: 'switch (Show-YesNoCancel "Save before closing?") { "yes" { Save-Item }; "cancel" { return } }',
        description: "Branches on three possible responses.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Confirm", "Show-Alert"],
  },
  {
    name: "Show-FieldEditor",
    synopsis: "Opens the Sitecore field editor dialog for an item.",
    description: "Launches Sitecore's standard field-editor UI so the user can edit specific fields of an item interactively.",
    syntax: ["Show-FieldEditor -Item <Item> [-Name <String[]>]"],
    parameters: [
      { name: "Item", type: "Item", description: "The Sitecore item whose fields are being edited.", required: true, position: null },
      { name: "Name", type: "String[]", description: "Names of the fields to expose; defaults to all editable fields.", required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Edit Title and Body of Home",
        code: 'Get-Item master:\\content\\Home | Show-FieldEditor -Name "Title", "Body"',
        description: "Restricts the field editor to the named fields only.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Read-Variable", "Set-ItemProperty"],
  },
  {
    name: "Show-ModalDialog",
    synopsis: "Opens an arbitrary Sitecore modal dialog by URL or XAML control.",
    description:
      "Renders a custom modal dialog (typically a Sheer or SPEAK control) and returns the dialog's result string. Used to integrate custom UIs into PowerShell scripts.",
    syntax: ["Show-ModalDialog -Control <String> [-Parameters <Hashtable>] [-Width <Int>] [-Height <Int>]"],
    parameters: [
      { name: "Control", type: "String", description: "The XAML control name or URL to load.", required: true, position: null },
      { name: "Parameters", type: "Hashtable", description: "Optional key/value pairs passed to the control.", required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Show a custom dialog",
        code: '$result = Show-ModalDialog -Control "MyDialog" -Parameters @{Mode="Edit"}',
        description: "Hosts a custom Sheer or SPEAK control as a modal.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Show-Alert", "Read-Variable"],
  },

  // ---------- Write family ----------
  {
    name: "Write-Error",
    synopsis: "Writes a non-terminating error to the error stream.",
    description:
      "Emits an error record without halting script execution. The user sees the message in red but the script continues. Use `throw` to terminate instead.",
    syntax: ["Write-Error [-Message] <String>"],
    parameters: [
      { name: "Message", type: "String", description: "The error message text.", required: true, position: 0 },
    ],
    examples: [
      {
        title: "Example 1: Report a problem and continue",
        code: 'if (-not (Test-Path $path)) { Write-Error "Path not found: $path"; return }',
        description: "Surfaces the issue to the user while still letting later cleanup run.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Write-Warning", "Write-Host"],
  },
  {
    name: "Write-Warning",
    synopsis: "Writes a warning message to the warning stream.",
    description:
      "Emits a yellow WARNING-prefixed message. Indicates a problem the user should know about that doesn't prevent the script from succeeding.",
    syntax: ["Write-Warning [-Message] <String>"],
    parameters: [
      { name: "Message", type: "String", description: "The warning message text.", required: true, position: 0 },
    ],
    examples: [
      {
        title: "Example 1: Flag a deprecated path",
        code: 'Write-Warning "This script will be removed in v9. Use Find-Item instead."',
        description: "Communicates non-fatal concerns.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Write-Error", "Write-Host"],
  },

  // ---------- DialogBuilder family ----------
  {
    name: "Import-Function",
    synopsis: "Loads a Sitecore PowerShell function library by name.",
    description:
      "Loads an SPE script library (DialogBuilder, SearchBuilder, etc.) so its commands become available in the current session. Real SPE resolves the name to a script library item under /sitecore/system/Modules/PowerShell.",
    syntax: ["Import-Function -Name <String>"],
    parameters: [
      { name: "Name", type: "String", description: "The library name to load (e.g. 'DialogBuilder', 'SearchBuilder').", required: true, position: 0 },
    ],
    examples: [
      {
        title: "Example 1: Load DialogBuilder",
        code: "Import-Function -Name DialogBuilder",
        description: "Makes New-DialogBuilder, Add-TextField, Invoke-Dialog, etc. available.",
      },
      {
        title: "Example 2: Load SearchBuilder",
        code: "Import-Function -Name SearchBuilder",
        description: "Makes the New-SearchBuilder fluent search API available.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["New-DialogBuilder", "New-SearchBuilder"],
  },
  {
    name: "New-DialogBuilder",
    synopsis: "Creates a new DialogBuilder instance for fluent dialog construction.",
    description:
      "Returns a builder object that you pipe through Add-* field commands and ultimately into Invoke-Dialog. The builder accumulates fields, layout, and dialog-level options like title and dimensions.",
    syntax: [
      "New-DialogBuilder -Title <String> [-Description <String>] [-Width <Int>] [-Height <Int>] [-OkButtonName <String>] [-CancelButtonName <String>] [-ShowHints] [-Icon <String>]",
    ],
    parameters: [
      { name: "Title", type: "String", description: "Dialog title shown in the title bar.", required: true, position: null },
      { name: "Description", type: "String", description: "Descriptive text shown below the title.", required: false, position: null },
      { name: "Width", type: "Int32", description: "Dialog width in pixels (default: 500).", required: false, position: null },
      { name: "Height", type: "Int32", description: "Dialog height in pixels (default: 400).", required: false, position: null },
      { name: "OkButtonName", type: "String", description: "Custom text for the OK button.", required: false, position: null },
      { name: "CancelButtonName", type: "String", description: "Custom text for the Cancel button.", required: false, position: null },
      { name: "ShowHints", type: "SwitchParameter", description: "Show field tooltips when set.", required: false, position: null },
      { name: "Icon", type: "String", description: 'Sitecore icon path (e.g. "Office/32x32/document.png").', required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Create a dialog and add fields",
        code: '$dialog = New-DialogBuilder -Title "Content Editor" -ShowHints\n$dialog | Add-TextField -Name "title" -Title "Title" -Mandatory\n$dialog | Invoke-Dialog',
        description: "Standard fluent flow: create, add fields, invoke.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Invoke-Dialog", "Add-TextField", "Add-Checkbox"],
  },
  {
    name: "Invoke-Dialog",
    synopsis: "Executes a built dialog and returns the result.",
    description:
      "Shows the modal dialog described by the upstream builder and returns a result object with .Result ('ok'|'cancel'), .Title, and .FieldCount. Field variables (declared via -Name on each Add-*) are bound in script scope after a successful dismissal.",
    syntax: ["<DialogBuilder> | Invoke-Dialog [-Validator <ScriptBlock>]"],
    parameters: [
      { name: "Validator", type: "ScriptBlock", description: "Optional validation scriptblock; access $variables.<name>.Value and set .Error.", required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Show the dialog and react to the result",
        code: '$result = $dialog | Invoke-Dialog\nif ($result.Result -eq "ok") { Write-Host "User: $userName" }',
        description: "Branches on the user's OK / Cancel choice.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["New-DialogBuilder", "Add-TextField"],
  },
  {
    name: "Add-DialogField",
    synopsis: "Core DialogBuilder field command with full control over options.",
    description:
      "The base command behind every Add-* field shorthand. Use this when you need a parameter that the convenience commands don't expose (custom -Editor, -Source, -Options, etc.).",
    syntax: ["<DialogBuilder> | Add-DialogField -Name <String> -Title <String> [-Editor <String>] [-Value <Object>] [-Mandatory] [-Tab <String>] [-Columns <Int>] [...]"],
    parameters: [
      { name: "Name", type: "String", description: "Variable name (without `$`). Becomes the bound script variable.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label shown to the user.", required: true, position: null },
      { name: "Editor", type: "String", description: "Editor type (auto-detected if omitted).", required: false, position: null },
      { name: "Mandatory", type: "SwitchParameter", description: "Marks the field as required.", required: false, position: null },
    ],
    examples: [
      {
        title: "Example 1: Custom editor",
        code: '$dialog | Add-DialogField -Name "code" -Title "Code" -Editor "code" -Lines 10',
        description: "Falls through to the underlying Read-Variable parameters table.",
      },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TextField", "Add-Checkbox", "Add-Dropdown"],
  },
  {
    name: "Add-TextField",
    synopsis: "Adds a single-line text input to the dialog.",
    description:
      "The default text field. Use -IsPassword for masked input, -IsEmail for email validation, or -IsNumber to constrain to numeric input.",
    syntax: ["<DialogBuilder> | Add-TextField -Name <String> -Title <String> [-Value <String>] [-Placeholder <String>] [-Mandatory] [-IsPassword] [-IsEmail] [-IsNumber] [-Tab <String>] [-Columns <Int>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Value", type: "String", description: "Initial value.", required: false, position: null },
      { name: "Placeholder", type: "String", description: "Placeholder text shown when empty.", required: false, position: null },
      { name: "Mandatory", type: "SwitchParameter", description: "Marks the field required.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Mandatory user name", code: '$dialog | Add-TextField -Name "userName" -Title "User Name" -Mandatory', description: "Required text field with $userName bound after Invoke-Dialog." },
      { title: "Example 2: Password field", code: '$dialog | Add-TextField -Name "pwd" -Title "Password" -IsPassword', description: "Masks input with bullets." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-MultiLineTextField", "Add-LinkField", "New-DialogBuilder"],
  },
  {
    name: "Add-MultiLineTextField",
    synopsis: "Adds a multi-line text area to the dialog.",
    description: "A textarea control. Use -Lines to set the visible row count.",
    syntax: ["<DialogBuilder> | Add-MultiLineTextField -Name <String> -Title <String> [-Lines <Int>] [-Value <String>] [-Mandatory]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Lines", type: "Int32", description: "Visible rows (default: 4).", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Notes field", code: '$dialog | Add-MultiLineTextField -Name "notes" -Title "Notes" -Lines 6', description: "Six-row text area." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TextField"],
  },
  {
    name: "Add-LinkField",
    synopsis: "Adds a URL input field to the dialog.",
    description: "A single-line text input with URL semantics; bound value is the entered link.",
    syntax: ["<DialogBuilder> | Add-LinkField -Name <String> -Title <String> [-Value <String>] [-Mandatory]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Website URL", code: '$dialog | Add-LinkField -Name "url" -Title "Website"', description: "Captures a URL string into $url." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TextField"],
  },
  {
    name: "Add-Checkbox",
    synopsis: "Adds a true/false checkbox to the dialog.",
    description: "A boolean toggle. Bound variable receives $true or $false based on user selection.",
    syntax: ["<DialogBuilder> | Add-Checkbox -Name <String> -Title <String> [-Value <Bool>] [-Tab <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Checkbox label.", required: true, position: null },
      { name: "Value", type: "Boolean", description: "Initial state (default: $false).", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Publish-after-save toggle", code: '$dialog | Add-Checkbox -Name "publish" -Title "Publish after save"', description: "$publish becomes $true if checked." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TristateCheckbox"],
  },
  {
    name: "Add-TristateCheckbox",
    synopsis: "Adds a three-state checkbox (true / false / indeterminate).",
    description: "Like Add-Checkbox but supports an indeterminate middle state for tri-valued logic.",
    syntax: ["<DialogBuilder> | Add-TristateCheckbox -Name <String> -Title <String> [-Value <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Checkbox label.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Workflow filter", code: '$dialog | Add-TristateCheckbox -Name "approved" -Title "Approved"', description: "Three-way filter: true / false / not specified." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-Checkbox"],
  },
  {
    name: "Add-RadioButtons",
    synopsis: "Adds a radio-button group from an Options hashtable.",
    description: "Single-selection control. Keys in -Options become bound values; values become labels.",
    syntax: ["<DialogBuilder> | Add-RadioButtons -Name <String> -Title <String> -Options <Hashtable> [-Value <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Group label.", required: true, position: null },
      { name: "Options", type: "Hashtable", description: "@{key=label; ...} option pairs.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Color picker", code: '$dialog | Add-RadioButtons -Name "color" -Title "Color" -Options @{red="Red"; blue="Blue"; green="Green"}', description: "$color becomes 'red', 'blue', or 'green'." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-Dropdown", "Add-Checklist"],
  },
  {
    name: "Add-Dropdown",
    synopsis: "Adds a dropdown (combo) selection to the dialog.",
    description: "Single-selection from a list of options. Same -Options shape as Add-RadioButtons.",
    syntax: ["<DialogBuilder> | Add-Dropdown -Name <String> -Title <String> -Options <Hashtable> [-Value <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Options", type: "Hashtable", description: "@{key=label; ...} option pairs.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Language picker", code: '$dialog | Add-Dropdown -Name "language" -Title "Language" -Options @{en="English"; fr="French"}', description: "$language receives the selected key." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-RadioButtons", "Add-Checklist"],
  },
  {
    name: "Add-Checklist",
    synopsis: "Adds a multi-select checklist from an Options hashtable.",
    description: "Returns an array of selected keys. Same -Options shape as Add-Dropdown.",
    syntax: ["<DialogBuilder> | Add-Checklist -Name <String> -Title <String> -Options <Hashtable>"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Options", type: "Hashtable", description: "@{key=label; ...} option pairs.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Multi-select languages", code: '$dialog | Add-Checklist -Name "languages" -Title "Languages" -Options @{en="English"; fr="French"; de="German"}', description: "$languages is a string array of selected keys." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-Dropdown", "Add-RadioButtons"],
  },
  {
    name: "Add-DateTimePicker",
    synopsis: "Adds a date and/or time picker.",
    description: "Bound variable receives a [DateTime]. Use -DateOnly for date-without-time.",
    syntax: ["<DialogBuilder> | Add-DateTimePicker -Name <String> -Title <String> [-DateOnly] [-Value <DateTime>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "DateOnly", type: "SwitchParameter", description: "Hide the time portion.", required: false, position: null },
      { name: "Value", type: "DateTime", description: "Initial value.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Publish date", code: '$dialog | Add-DateTimePicker -Name "publishDate" -Title "Publish Date" -DateOnly', description: "Date-only picker." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TextField"],
  },
  {
    name: "Add-ItemPicker",
    synopsis: "Adds a Sitecore item-picker control to the dialog.",
    description: "Lets the user browse the content tree; bound value is the selected Item.",
    syntax: ["<DialogBuilder> | Add-ItemPicker -Name <String> -Title <String> [-Root <String>] [-Mandatory]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Root", type: "String", description: "Root path for the picker.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Pick a content item", code: '$dialog | Add-ItemPicker -Name "target" -Title "Target item" -Root "/sitecore/content"', description: "Returns a Sitecore Item via $target." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-Droptree", "Add-TreeList"],
  },
  {
    name: "Add-Droplink",
    synopsis: "Adds a dropdown that returns a Sitecore Item.",
    description: "Like Add-ItemPicker but rendered as a dropdown. Use -Source to scope the query.",
    syntax: ["<DialogBuilder> | Add-Droplink -Name <String> -Title <String> [-Source <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Source", type: "String", description: "Sitecore data source query.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Pick a template", code: '$dialog | Add-Droplink -Name "template" -Title "Template" -Source "DataSource=/sitecore/templates"', description: "Returns the selected template Item." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-Droptree", "Add-ItemPicker"],
  },
  {
    name: "Add-Droptree",
    synopsis: "Adds a tree-picker control to the dialog.",
    description: "Tree-style item picker; bound value is the selected Item. Better than Add-Droplink for large hierarchies.",
    syntax: ["<DialogBuilder> | Add-Droptree -Name <String> -Title <String> [-Root <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Root", type: "String", description: "Root path for the tree.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Pick a content branch", code: '$dialog | Add-Droptree -Name "section" -Title "Section" -Root "/sitecore/content"', description: "Tree picker scoped to /sitecore/content." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-ItemPicker", "Add-Droplink"],
  },
  {
    name: "Add-TreeList",
    synopsis: "Adds a multi-select tree list to the dialog.",
    description: "Tree-style multi-select picker; bound value is an Item array. Use -WithSearch to enable filter input.",
    syntax: ["<DialogBuilder> | Add-TreeList -Name <String> -Title <String> [-Root <String>] [-WithSearch]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Root", type: "String", description: "Root path for the tree.", required: false, position: null },
      { name: "WithSearch", type: "SwitchParameter", description: "Adds a search box above the tree.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Multi-select items with search", code: '$dialog | Add-TreeList -Name "items" -Title "Items" -Root "/sitecore/content" -WithSearch', description: "Searchable multi-select tree picker." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-MultiList", "Add-ItemPicker"],
  },
  {
    name: "Add-MultiList",
    synopsis: "Adds a multi-select bucket list to the dialog.",
    description: "Two-pane available/selected list; bound value is an Item array. Use -WithSearch to add a filter input.",
    syntax: ["<DialogBuilder> | Add-MultiList -Name <String> -Title <String> [-Root <String>] [-WithSearch]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Root", type: "String", description: "Source root path.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Pick contributors", code: '$dialog | Add-MultiList -Name "contributors" -Title "Contributors" -Root "/sitecore/content/Contributors"', description: "Two-pane multi-select." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-TreeList"],
  },
  {
    name: "Add-UserPicker",
    synopsis: "Adds a Sitecore user-picker control to the dialog.",
    description: "Returns a Sitecore.Security.Accounts.User via the bound variable.",
    syntax: ["<DialogBuilder> | Add-UserPicker -Name <String> -Title <String> [-Domain <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
      { name: "Domain", type: "String", description: "Optional domain to constrain selection.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Pick a Sitecore user", code: '$dialog | Add-UserPicker -Name "owner" -Title "Owner" -Domain "sitecore"', description: "Sitecore-domain users only." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-RolePicker", "Get-User"],
  },
  {
    name: "Add-RolePicker",
    synopsis: "Adds a Sitecore role-picker control to the dialog.",
    description: "Returns a Sitecore.Security.Accounts.Role via the bound variable.",
    syntax: ["<DialogBuilder> | Add-RolePicker -Name <String> -Title <String> [-Domain <String>]"],
    parameters: [
      { name: "Name", type: "String", description: "Bound variable name.", required: true, position: null },
      { name: "Title", type: "String", description: "Field label.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Pick a role", code: '$dialog | Add-RolePicker -Name "role" -Title "Role"', description: "Returns the selected role." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-UserPicker", "Get-Role"],
  },
  {
    name: "Add-InfoText",
    synopsis: "Adds read-only informational text to the dialog.",
    description: "Static text shown to the user; not bound to a variable. Useful for instructions or section headers.",
    syntax: ["<DialogBuilder> | Add-InfoText -Title <String> [-Tab <String>]"],
    parameters: [
      { name: "Title", type: "String", description: "The text to display.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Section header", code: '$dialog | Add-InfoText -Title "Choose your publishing options:"', description: "Read-only label inside the dialog body." },
    ],
    aliases: [],
    relatedCmdlets: ["New-DialogBuilder"],
  },

  // ---------- SearchBuilder family ----------
  {
    name: "New-SearchBuilder",
    synopsis: "Creates a SearchBuilder for fluent query construction over Find-Item.",
    description:
      "Returns a builder you pipe through Add-* filter commands and finally into Invoke-Search. Wraps the Find-Item -Criteria hashtable model with composable, readable filters.",
    syntax: ["New-SearchBuilder -Index <String> [-Path <String>] [-First <Int>] [-Skip <Int>] [-MaxResults <Int>] [-OrderBy <String>] [-LatestVersion] [-Strict]"],
    parameters: [
      { name: "Index", type: "String", description: "The search index name.", required: true, position: null },
      { name: "Path", type: "String", description: "Root path scope for the search.", required: false, position: null },
      { name: "First", type: "Int32", description: "Page size (default: 25).", required: false, position: null },
      { name: "MaxResults", type: "Int32", description: "Safety cap on total items returned.", required: false, position: null },
      { name: "OrderBy", type: "String", description: "Field to sort by.", required: false, position: null },
      { name: "LatestVersion", type: "SwitchParameter", description: "Filter to latest version of each item.", required: false, position: null },
      { name: "Strict", type: "SwitchParameter", description: "Validate field names against the index schema.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Build and run a search", code: '$search = New-SearchBuilder -Index "sitecore_master_index" -First 25 -LatestVersion\n$search | Add-TemplateFilter -Name "Article"\n$results = $search | Invoke-Search', description: "Standard fluent flow." },
    ],
    aliases: [],
    relatedCmdlets: ["Invoke-Search", "Add-TemplateFilter", "Find-Item"],
  },
  {
    name: "Invoke-Search",
    synopsis: "Executes a SearchBuilder query and returns a result object.",
    description:
      "Runs the accumulated filters via Find-Item and returns a structured result with .Items, .HasMore, .TotalCount, .PageSize, .IndexName, and .Query. Pagination auto-advances on each call so loops can use `do { ... } while ($results.HasMore)`.",
    syntax: ["<SearchBuilder> | Invoke-Search"],
    parameters: [],
    examples: [
      { title: "Example 1: Capture and inspect results", code: '$results = $search | Invoke-Search\n$results.Items | ForEach-Object { $_.Name }', description: "Iterate the bound items." },
      { title: "Example 2: Paginate", code: 'do { $r = $search | Invoke-Search; $all += $r.Items } while ($r.HasMore)', description: "Drains all pages into a single collection." },
    ],
    aliases: [],
    relatedCmdlets: ["New-SearchBuilder", "Reset-SearchBuilder"],
  },
  {
    name: "Reset-SearchBuilder",
    synopsis: "Rewinds a SearchBuilder's pagination to page 1.",
    description: "Resets Skip and PageNumber so the next Invoke-Search starts over from the first page.",
    syntax: ["<SearchBuilder> | Reset-SearchBuilder"],
    parameters: [],
    examples: [
      { title: "Example 1: Re-run from start", code: "$search | Reset-SearchBuilder\n$results = $search | Invoke-Search", description: "Useful when the same query needs to be re-executed." },
    ],
    aliases: [],
    relatedCmdlets: ["Invoke-Search"],
  },
  {
    name: "Add-TemplateFilter",
    synopsis: "Filters search results by template name or ID.",
    description: "Shorthand for `_templatename Equals <name>` (or `_template Equals <id>`). The most common SearchBuilder filter.",
    syntax: ["<SearchBuilder> | Add-TemplateFilter -Name <String>", "<SearchBuilder> | Add-TemplateFilter -Id <Guid>"],
    parameters: [
      { name: "Name", type: "String", description: "Template name to match.", required: false, position: null },
      { name: "Id", type: "Guid", description: "Template ID (GUID) to match.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Articles only", code: '$search | Add-TemplateFilter -Name "Article"', description: "Restricts results to Article-template items." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-FieldEquals", "Add-SearchFilter"],
  },
  {
    name: "Add-FieldContains",
    synopsis: "Adds a Contains substring filter on a field.",
    description: "Shorthand for Add-SearchFilter with the Contains filter type.",
    syntax: ["<SearchBuilder> | Add-FieldContains -Field <String> -Value <String> [-Invert] [-Boost <Double>]"],
    parameters: [
      { name: "Field", type: "String", description: "Field name to match.", required: true, position: null },
      { name: "Value", type: "String", description: "Substring to look for.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Title contains 'Welcome'", code: '$search | Add-FieldContains -Field "Title" -Value "Welcome"', description: "Substring match on the Title field." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-FieldEquals", "Add-SearchFilter"],
  },
  {
    name: "Add-FieldEquals",
    synopsis: "Adds an exact-match filter on a field.",
    description: "Shorthand for Add-SearchFilter with the Equals filter type.",
    syntax: ["<SearchBuilder> | Add-FieldEquals -Field <String> -Value <String> [-Invert] [-Boost <Double>]"],
    parameters: [
      { name: "Field", type: "String", description: "Field name to match.", required: true, position: null },
      { name: "Value", type: "String", description: "Exact value.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Country equals 'US'", code: '$search | Add-FieldEquals -Field "country" -Value "US"', description: "Exact-match filter." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-FieldContains", "Add-SearchFilter"],
  },
  {
    name: "Add-DateRangeFilter",
    synopsis: "Adds a date-range filter using relative or absolute boundaries.",
    description:
      "Use -Last with shorthand (`7d`, `2w`, `3m`, `1y`) for relative ranges, or -From / -To for absolute boundaries.",
    syntax: ["<SearchBuilder> | Add-DateRangeFilter -Field <String> -Last <String>", "<SearchBuilder> | Add-DateRangeFilter -Field <String> -From <DateTime> -To <DateTime>"],
    parameters: [
      { name: "Field", type: "String", description: "Indexed date field (e.g. __Updated).", required: true, position: null },
      { name: "Last", type: "String", description: "Relative range shorthand: NUM + d/w/m/y.", required: false, position: null },
      { name: "From", type: "DateTime", description: "Absolute start.", required: false, position: null },
      { name: "To", type: "DateTime", description: "Absolute end.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Last 30 days", code: '$search | Add-DateRangeFilter -Field "__Updated" -Last "30d"', description: "Relative window." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-SearchFilter"],
  },
  {
    name: "Add-SearchFilter",
    synopsis: "Low-level filter command supporting any filter type.",
    description: "Underlies the Add-Field*/Add-TemplateFilter shortcuts. Supports -Invert (NOT), -Boost (relevance weight), and -CaseSensitive.",
    syntax: ["<SearchBuilder> | Add-SearchFilter -Field <String> -Filter <FilterType> -Value <String> [-Invert] [-Boost <Double>] [-CaseSensitive]"],
    parameters: [
      { name: "Field", type: "String", description: "Field name.", required: true, position: null },
      { name: "Filter", type: "String", description: "Filter type — Equals, Contains, StartsWith, EndsWith, GreaterThan, LessThan, Between, etc.", required: true, position: null },
      { name: "Value", type: "String", description: "Filter value.", required: true, position: null },
      { name: "Invert", type: "SwitchParameter", description: "Negate the match (NOT).", required: false, position: null },
      { name: "Boost", type: "Double", description: "Relevance weight.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: NOT contains, boosted", code: '$search | Add-SearchFilter -Field "_name" -Filter "Contains" -Value "system" -Invert -Boost 5', description: "Weighted negation." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-FieldEquals", "Add-FieldContains", "Get-SearchFilter"],
  },
  {
    name: "Get-SearchFilter",
    synopsis: "Lists the filter type values valid for Add-SearchFilter.",
    description: "Run with no parameters to see every supported filter type with a brief description.",
    syntax: ["Get-SearchFilter"],
    parameters: [],
    examples: [
      { title: "Example 1: Discover available filters", code: "Get-SearchFilter", description: "Prints the full filter-type vocabulary." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-SearchFilter"],
  },

  // ---------- Security family ----------
  {
    name: "Get-User",
    synopsis: "Returns one or more Sitecore users.",
    description:
      "Looks up a user by -Identity, runs a wildcard search via -Filter, or returns the current user with -Current. Identity values without a domain prefix default to `sitecore\\`.",
    syntax: ["Get-User [-Identity] <AccountIdentity>", "Get-User -Filter <String>", "Get-User -Current"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "User identifier; e.g. 'admin' or 'sitecore\\admin'.", required: false, position: 0 },
      { name: "Filter", type: "String", description: "Wildcard pattern; * for all, sitecore\\* for one domain.", required: false, position: null },
      { name: "Current", type: "SwitchParameter", description: "Returns the user under which the script is running.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Look up admin", code: "Get-User -Identity admin", description: "Returns the admin user record." },
      { title: "Example 2: Filter by domain", code: 'Get-User -Filter "sitecore\\*"', description: "All users in the sitecore domain." },
      { title: "Example 3: Current user", code: "Get-User -Current", description: "The user the script is running as." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-Role", "New-User", "Test-Account"],
  },
  {
    name: "Get-Role",
    synopsis: "Returns one or more Sitecore roles.",
    description: "Looks up a role by -Identity or -Filter wildcard.",
    syntax: ["Get-Role [-Identity] <AccountIdentity>", "Get-Role -Filter <String>"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "Role identifier (e.g. 'sitecore\\Developer').", required: false, position: 0 },
      { name: "Filter", type: "String", description: "Wildcard pattern.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Sitecore-domain roles", code: 'Get-Role -Filter "sitecore\\*"', description: "Lists all roles in the sitecore domain." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-RoleMember", "New-Role"],
  },
  {
    name: "Get-RoleMember",
    synopsis: "Returns the users that belong to a role.",
    description: "Lists all members of the given role. Returns user objects.",
    syntax: ["Get-RoleMember -Identity <AccountIdentity>"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "Role identifier.", required: true, position: 0 },
    ],
    examples: [
      { title: "Example 1: Members of Developer role", code: 'Get-RoleMember -Identity "sitecore\\Developer"', description: "User rows for everyone in the role." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-RoleMember", "Get-Role"],
  },
  {
    name: "New-User",
    synopsis: "Creates a new Sitecore user.",
    description: "Adds a user to the membership store. -Identity is required; -Email and -FullName are optional metadata.",
    syntax: ["New-User -Identity <AccountIdentity> [-Email <String>] [-FullName <String>] [-Password <String>] [-Enabled <Bool>]"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "Fully-qualified user name.", required: true, position: null },
      { name: "Email", type: "String", description: "Email address.", required: false, position: null },
      { name: "FullName", type: "String", description: "Display name.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Create a new author", code: 'New-User -Identity "sitecore\\jdoe" -Email "jdoe@example.com" -FullName "Jane Doe"', description: "Adds Jane Doe to the sitecore domain." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-User", "New-Role", "Add-RoleMember"],
  },
  {
    name: "New-Role",
    synopsis: "Creates a new Sitecore role.",
    description: "Adds a role to the membership store. Pair with Add-RoleMember to assign users.",
    syntax: ["New-Role -Identity <AccountIdentity> [-Description <String>]"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "Fully-qualified role name.", required: true, position: null },
      { name: "Description", type: "String", description: "Role description.", required: false, position: null },
    ],
    examples: [
      { title: "Example 1: Create an Editors role", code: 'New-Role -Identity "sitecore\\Editors" -Description "Content editors"', description: "Creates the role; members are added separately." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-Role", "Add-RoleMember", "New-User"],
  },
  {
    name: "Add-RoleMember",
    synopsis: "Adds one or more users to a role.",
    description: "-Members accepts a comma-separated list of user identities. Each member's role membership is updated.",
    syntax: ["Add-RoleMember -Identity <AccountIdentity> -Members <AccountIdentity[]>"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "The role.", required: true, position: null },
      { name: "Members", type: "AccountIdentity[]", description: "User(s) to add.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Add a user", code: 'Add-RoleMember -Identity "sitecore\\Editors" -Members "sitecore\\jdoe"', description: "Single user." },
      { title: "Example 2: Add multiple users", code: 'Add-RoleMember -Identity "sitecore\\Editors" -Members "sitecore\\jdoe", "sitecore\\michael"', description: "Comma-separated list." },
    ],
    aliases: [],
    relatedCmdlets: ["Remove-RoleMember", "Get-RoleMember"],
  },
  {
    name: "Remove-RoleMember",
    synopsis: "Removes one or more users from a role.",
    description: "Inverse of Add-RoleMember. Same -Members shape.",
    syntax: ["Remove-RoleMember -Identity <AccountIdentity> -Members <AccountIdentity[]>"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "The role.", required: true, position: null },
      { name: "Members", type: "AccountIdentity[]", description: "User(s) to remove.", required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Remove a user", code: 'Remove-RoleMember -Identity "sitecore\\Editors" -Members "sitecore\\jdoe"', description: "Revokes membership." },
    ],
    aliases: [],
    relatedCmdlets: ["Add-RoleMember"],
  },
  {
    name: "Test-ItemAcl",
    synopsis: "Tests whether a user has a specific access right on an item.",
    description:
      "Returns True if the named user has the requested access right on the target item (resolved by -Path, -Item, or -Id). Common rights: item:read, item:write, item:rename, item:create, item:delete, item:admin, field:read, field:write, language:read, language:write.",
    syntax: ["Test-ItemAcl -Path <String> -Identity <AccountIdentity> -AccessRight <String>", "Test-ItemAcl -Item <Item> -Identity <AccountIdentity> -AccessRight <String>"],
    parameters: [
      { name: "Path", type: "String", description: "Path of the target item.", required: false, position: null },
      { name: "Item", type: "Item", description: "Target item (pipeline-friendly).", required: false, position: null },
      { name: "Identity", type: "AccountIdentity", description: "User to test against.", required: true, position: null },
      { name: "AccessRight", type: "String", description: 'Access right token (e.g. "item:write").', required: true, position: null },
    ],
    examples: [
      { title: "Example 1: Can jdoe edit Home?", code: 'Test-ItemAcl -Path "master:\\content\\Home" -Identity "sitecore\\jdoe" -AccessRight item:write', description: "Returns True/False." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-User", "Get-Role"],
  },
  {
    name: "Test-Account",
    synopsis: "Tests whether a user or role identity exists.",
    description: "Returns True if the given identity matches an existing user or role; False otherwise.",
    syntax: ["Test-Account -Identity <AccountIdentity>"],
    parameters: [
      { name: "Identity", type: "AccountIdentity", description: "User or role identity to look up.", required: true, position: 0 },
    ],
    examples: [
      { title: "Example 1: Check before creating", code: 'if (-not (Test-Account -Identity "sitecore\\Editors")) { New-Role -Identity "sitecore\\Editors" }', description: "Idempotent role creation." },
    ],
    aliases: [],
    relatedCmdlets: ["Get-User", "Get-Role"],
  },
];

// ============================================================================
// Lookup map (lowercase canonical name → CmdletHelp)
// ============================================================================

const CMDLET_HELP_MAP: Record<string, CmdletHelp> = {};

for (const entry of [...FULL_HELP, ...FULL_HELP_2, ...FULL_HELP_3]) {
  CMDLET_HELP_MAP[entry.name.toLowerCase()] = entry;
}

// Also add Get-Help itself
const GET_HELP_ENTRY: CmdletHelp = {
  name: "Get-Help",
  synopsis: "Displays help information about SPE commands.",
  description:
    "The Get-Help command displays information about commands including synopsis, syntax, parameters, and examples. " +
    "Run Get-Help with no arguments to list all available commands.",
  syntax: [
    "Get-Help [[-Name] <String>] [-Examples] [-Full] [-Parameter <String>]",
  ],
  parameters: [
    {
      name: "Name",
      type: "String",
      description: "The name or alias of the command to get help for.",
      required: false,
      position: 0,
    },
    {
      name: "Examples",
      type: "SwitchParameter",
      description: "Displays only the examples section.",
      required: false,
      position: null,
    },
    {
      name: "Full",
      type: "SwitchParameter",
      description: "Displays the full help article including all sections.",
      required: false,
      position: null,
    },
    {
      name: "Parameter",
      type: "String",
      description: "Displays help for a specific parameter.",
      required: false,
      position: null,
    },
  ],
  examples: [
    {
      title: "Example 1: List all commands",
      code: "Get-Help",
      description: "Shows a list of all available commands with their synopses.",
    },
    {
      title: "Example 2: Get help for a specific command",
      code: "Get-Help Get-ChildItem",
      description: "Displays the help article for Get-ChildItem.",
    },
    {
      title: "Example 3: Show only examples",
      code: "Get-Help Where-Object -Examples",
      description: "Displays only the examples section for Where-Object.",
    },
    {
      title: "Example 4: Get help using an alias",
      code: "Get-Help gci",
      description: "Resolves the alias and shows help for Get-ChildItem.",
    },
  ],
  aliases: ["help"],
  relatedCmdlets: ["Get-Alias"],
};
CMDLET_HELP_MAP["get-help"] = GET_HELP_ENTRY;

// ============================================================================
// Alias → canonical name map (for resolving help lookups by alias)
// ============================================================================

const ALIAS_TO_CANONICAL: Record<string, string> = {};
for (const entry of [...FULL_HELP, ...FULL_HELP_2, GET_HELP_ENTRY]) {
  for (const alias of entry.aliases) {
    ALIAS_TO_CANONICAL[alias.toLowerCase()] = entry.name.toLowerCase();
  }
}

// ============================================================================
// Public API
// ============================================================================

/** Look up help for a cmdlet by name or alias. Returns null if not found. */
export function getCmdletHelp(nameOrAlias: string): CmdletHelp | null {
  const lower = nameOrAlias.toLowerCase();
  // Direct match
  if (CMDLET_HELP_MAP[lower]) return CMDLET_HELP_MAP[lower];
  // Alias resolution
  const canonical = ALIAS_TO_CANONICAL[lower];
  if (canonical && CMDLET_HELP_MAP[canonical]) return CMDLET_HELP_MAP[canonical];
  return null;
}

/** Get the one-line synopsis for a cmdlet (for tooltips, syntax bars). */
export function getSynopsis(nameOrAlias: string): string | null {
  const help = getCmdletHelp(nameOrAlias);
  return help?.synopsis ?? null;
}

/** Get all help entries (for listing all cmdlets). */
export function getAllCmdletHelp(): CmdletHelp[] {
  return [...FULL_HELP, ...FULL_HELP_2, GET_HELP_ENTRY].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Format help as PowerShell-style plain text. */
export function formatHelpText(
  help: CmdletHelp,
  section?: "examples" | "full" | "parameter",
  parameterName?: string
): string {
  const lines: string[] = [];

  if (section === "examples") {
    lines.push("NAME");
    lines.push(`    ${help.name}`);
    lines.push("");
    lines.push("EXAMPLES");
    if (help.examples.length === 0) {
      lines.push("    No examples available for this command.");
    } else {
      for (const ex of help.examples) {
        lines.push(`    ${ex.title}`);
        lines.push("");
        lines.push(`    ${ex.code}`);
        lines.push("");
        lines.push(`    ${ex.description}`);
        lines.push("");
      }
    }
    return lines.join("\n");
  }

  if (section === "parameter") {
    const param = help.parameters.find(
      (p) => p.name.toLowerCase() === (parameterName ?? "").toLowerCase()
    );
    if (!param) {
      return `Get-Help : No parameter named '${parameterName}' found for ${help.name}.`;
    }
    lines.push(`-${param.name} <${param.type}>`);
    lines.push(`    ${param.description}`);
    lines.push("");
    lines.push(`    Required?                    ${param.required}`);
    lines.push(`    Position?                    ${param.position !== null ? param.position : "Named"}`);
    if (param.defaultValue) {
      lines.push(`    Default value                ${param.defaultValue}`);
    }
    return lines.join("\n");
  }

  // Default or "full" — show all sections
  lines.push("NAME");
  lines.push(`    ${help.name}`);
  lines.push("");

  lines.push("SYNOPSIS");
  lines.push(`    ${help.synopsis}`);
  lines.push("");

  if (section === "full") {
    lines.push("DESCRIPTION");
    lines.push(`    ${help.description}`);
    lines.push("");
  }

  lines.push("SYNTAX");
  for (let i = 0; i < help.syntax.length; i++) {
    if (help.syntaxLabels && help.syntaxLabels[i]) {
      lines.push(`    ${help.syntaxLabels[i]}:`);
      lines.push(`        ${help.syntax[i]}`);
    } else if (help.syntax.length > 1) {
      lines.push(`    Set ${i + 1}:`);
      lines.push(`        ${help.syntax[i]}`);
    } else {
      lines.push(`    ${help.syntax[i]}`);
    }
  }
  lines.push("");

  if (help.aliases.length > 0) {
    lines.push("ALIASES");
    lines.push(`    ${help.aliases.join(", ")}`);
    lines.push("");
  }

  if (section === "full" && help.parameters.length > 0) {
    lines.push("PARAMETERS");
    for (const p of help.parameters) {
      lines.push(`    -${p.name} <${p.type}>`);
      lines.push(`        ${p.description}`);
      lines.push(`        Required: ${p.required}  Position: ${p.position !== null ? p.position : "Named"}`);
      lines.push("");
    }
  }

  if (section === "full" && help.examples.length > 0) {
    lines.push("EXAMPLES");
    for (const ex of help.examples) {
      lines.push(`    ${ex.title}`);
      lines.push("");
      lines.push(`    ${ex.code}`);
      lines.push("");
      lines.push(`    ${ex.description}`);
      lines.push("");
    }
  }

  if (help.relatedCmdlets.length > 0) {
    lines.push("RELATED LINKS");
    for (const r of help.relatedCmdlets) {
      lines.push(`    ${r}`);
    }
  }

  return lines.join("\n");
}

/** Format a cmdlet list (for Get-Help with no args). */
export function formatCmdletList(): string {
  const all = getAllCmdletHelp();
  const nameWidth = Math.max(18, ...all.map((h) => h.name.length));
  const header = "Name".padEnd(nameWidth) + " Synopsis";
  const sep = "-".repeat(nameWidth) + " " + "-".repeat(40);
  const rows = all.map(
    (h) => h.name.padEnd(nameWidth) + " " + h.synopsis
  );
  return [
    "Available commands:",
    "",
    header,
    sep,
    ...rows,
    "",
    'Use "Get-Help <cmdlet-name>" for detailed help.',
    'Use "Get-Help <cmdlet-name> -Examples" for examples.',
  ].join("\n");
}

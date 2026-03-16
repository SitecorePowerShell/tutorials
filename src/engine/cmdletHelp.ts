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
      "The Get-Item cmdlet retrieves a Sitecore item from the content tree using a drive-qualified path (e.g. master:\\content\\Home). " +
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
      "The Get-ChildItem cmdlet returns the direct children of a Sitecore item. " +
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
        description: "Uses the built-in alias gci instead of the full cmdlet name.",
      },
    ],
    aliases: ["gci", "ls", "dir"],
    relatedCmdlets: ["Get-Item", "Where-Object", "Select-Object"],
  },
  {
    name: "Where-Object",
    synopsis: "Filters items from the pipeline based on a condition.",
    description:
      "The Where-Object cmdlet selects items from a pipeline based on a script block condition. " +
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
      "The ForEach-Object cmdlet executes a script block against each item in the pipeline. " +
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
      "The Select-Object cmdlet selects specified properties from items, creating objects with only those properties. " +
      "Use -First or -Last to limit the number of items returned.",
    syntax: [
      "... | Select-Object [-Property] <String[]> [-First <Int>] [-Last <Int>]",
    ],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The properties to select. Separate multiple properties with commas.",
        required: false,
        position: 0,
      },
      {
        name: "First",
        type: "Int32",
        description: "Gets only the specified number of items from the beginning.",
        required: false,
        position: null,
      },
      {
        name: "Last",
        type: "Int32",
        description: "Gets only the specified number of items from the end.",
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
    ],
    aliases: ["select"],
    relatedCmdlets: ["Sort-Object", "Where-Object", "Format-Table"],
  },
  {
    name: "Sort-Object",
    synopsis: "Sorts items in the pipeline by property values.",
    description:
      "The Sort-Object cmdlet sorts items by one or more property values. " +
      "By default, sorting is ascending. Use -Descending to reverse the order.",
    syntax: [
      "... | Sort-Object [-Property] <String> [-Descending]",
    ],
    parameters: [
      {
        name: "Property",
        type: "String",
        description: "The property to sort by.",
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
      "The Set-Location cmdlet changes your current working directory in the Sitecore tree. " +
      "After changing location, you can use relative paths with other cmdlets.",
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
      "The New-Item cmdlet creates a new item in the Sitecore content tree. " +
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
      "The Format-Table cmdlet formats the output of a pipeline as a table with specified properties as columns. " +
      "This is useful for creating readable reports with specific fields.",
    syntax: [
      "... | Format-Table [-Property] <String[]>",
    ],
    parameters: [
      {
        name: "Property",
        type: "String[]",
        description: "The properties to display as table columns.",
        required: false,
        position: 0,
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
      "The Write-Host cmdlet writes customized output to the console. " +
      "Unlike Write-Output, it writes directly to the host and does not pass objects through the pipeline.",
    syntax: [
      "Write-Host [-Object] <String> [-ForegroundColor <String>]",
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
      "The Get-Location cmdlet returns the current Sitecore drive path. " +
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
      "The Get-Member cmdlet displays the properties available on Sitecore items in the pipeline. " +
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
      "The Group-Object cmdlet groups pipeline items that share the same value for a specified property. " +
      "Each group includes a Count, Name (the shared value), and the grouped items. " +
      "This is useful for summarizing content by template, field value, or other properties.",
    syntax: ["<input> | Group-Object [-Property] <String>"],
    parameters: [
      {
        name: "Property",
        type: "String",
        description: "The property to group by.",
        required: true,
        position: 0,
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
    synopsis: "Counts items in the pipeline.",
    description:
      "The Measure-Object cmdlet counts the number of items in the pipeline. " +
      "It returns an object with a Count property. " +
      "Use it to quickly determine how many items match your query.",
    syntax: ["<input> | Measure-Object"],
    parameters: [],
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
      "The Remove-Item cmdlet deletes an item from the Sitecore content tree. " +
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
      "The Copy-Item cmdlet creates a duplicate of a Sitecore item at a new destination path. " +
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
      "The Move-Item cmdlet relocates a Sitecore item from its current position to a new parent. " +
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
      "The Rename-Item cmdlet changes the name of an existing Sitecore item. " +
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
      "The Set-ItemProperty cmdlet updates the value of a field on a Sitecore item. " +
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
      "The ConvertTo-Json cmdlet serializes pipeline items into a JSON string representation. " +
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
      "The Write-Output cmdlet sends objects to the success pipeline. " +
      "Unlike Write-Host, the output can be captured in variables or piped to other cmdlets. " +
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
      "The Show-Alert cmdlet displays a modal alert dialog in the Sitecore interface. " +
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
      "The Show-ListView cmdlet presents pipeline items in a Sitecore list view dialog. " +
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
      "The Read-Variable cmdlet displays a Sitecore dialog that prompts the user to enter values for variables. " +
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
      "The Close-Window cmdlet closes any open SPE dialog window. " +
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
      "The Get-Alias cmdlet displays all supported command aliases and the cmdlets they map to. " +
      "This is helpful for discovering shortcuts like gci for Get-ChildItem or % for ForEach-Object.",
    syntax: ["Get-Alias"],
    parameters: [],
    examples: [
      {
        title: "Example 1: List all aliases",
        code: "Get-Alias",
        description: "Displays a table of all available aliases and their target cmdlets.",
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
      "The Find-Item cmdlet uses Sitecore's search index to find items based on field criteria. " +
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
];

// ============================================================================
// Lookup map (lowercase canonical name → CmdletHelp)
// ============================================================================

const CMDLET_HELP_MAP: Record<string, CmdletHelp> = {};

for (const entry of [...FULL_HELP, ...FULL_HELP_2]) {
  CMDLET_HELP_MAP[entry.name.toLowerCase()] = entry;
}

// Also add Get-Help itself
const GET_HELP_ENTRY: CmdletHelp = {
  name: "Get-Help",
  synopsis: "Displays help information about SPE cmdlets.",
  description:
    "The Get-Help cmdlet displays information about cmdlets including synopsis, syntax, parameters, and examples. " +
    "Run Get-Help with no arguments to list all available cmdlets.",
  syntax: [
    "Get-Help [[-Name] <String>] [-Examples] [-Full] [-Parameter <String>]",
  ],
  parameters: [
    {
      name: "Name",
      type: "String",
      description: "The name or alias of the cmdlet to get help for.",
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
      title: "Example 1: List all cmdlets",
      code: "Get-Help",
      description: "Shows a list of all available cmdlets with their synopses.",
    },
    {
      title: "Example 2: Get help for a specific cmdlet",
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
      lines.push("    No examples available for this cmdlet.");
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
  for (const s of help.syntax) {
    lines.push(`    ${s}`);
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
    "Available cmdlets:",
    "",
    header,
    sep,
    ...rows,
    "",
    'Use "Get-Help <cmdlet-name>" for detailed help.',
    'Use "Get-Help <cmdlet-name> -Examples" for examples.',
  ].join("\n");
}

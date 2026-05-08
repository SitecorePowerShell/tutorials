// ============================================================================
// Core Sitecore simulation types
// ============================================================================

export interface SitecoreNodeFields {
  [key: string]: string;
}

export interface SitecoreNode {
  _id: string;
  _template: string;
  _templateFullName: string;
  _version: number;
  _fields: SitecoreNodeFields;
  _children: Record<string, SitecoreNode>;
}

/** A resolved item reference — what pipeline stages operate on */
export interface SitecoreItem {
  name: string;
  node: SitecoreNode;
  path?: string;
  /** True when returned by Find-Item (SearchResultItem), cleared by Initialize-Item */
  _isSearchResult?: boolean;
}

/** A property specifier — either a plain name or a calculated @{} expression */
export interface PlainProperty {
  type: "plain";
  name: string;
}

export interface CalculatedProperty {
  type: "calculated";
  label: string;
  expression: string;
}

export type PropertySpec = PlainProperty | CalculatedProperty;

/** Augmented array with optional Select-Object metadata */
export interface SitecoreItemArray extends Array<SitecoreItem> {
  _selectedProperties?: PropertySpec[];
}

export interface ResolvedPath {
  node: SitecoreNode;
  name: string;
  path: string;
}

// ============================================================================
// Command parser types
// ============================================================================

export interface ParsedStage {
  cmdlet: string;
  params: Record<string, string> & { _positional?: string[] };
  switches: string[];
}

export interface ParsedCommand {
  raw: string[];
  parsed: ParsedStage[];
}

// ============================================================================
// Execution types
// ============================================================================

export interface ExecutionResult {
  output: string;
  error: string | null;
  pipelineData?: SitecoreItemArray | SitecoreItem[] | string | null;
  dialogRequests?: DialogRequest[];
}

export interface DialogField {
  /** Friendly control name — "TextField", "Checkbox", "Dropdown", etc. */
  kind: string;
  /** Variable name (without `$`) that this field would bind to in real SPE */
  name: string;
  /** User-facing label */
  title: string;
  mandatory?: boolean;
}

export interface SearchFilter {
  /** Friendly filter command name — "TemplateFilter", "FieldContains", etc. */
  kind: string;
  /** Field being filtered (or "Template" for TemplateFilter) */
  field: string;
  /** Filter operator — "Equals", "Contains", "DateRange", etc. */
  op: string;
  /** Stringified filter value (or range expression) */
  value: string;
  invert?: boolean;
  boost?: number;
}

export interface DialogRequest {
  type: "alert" | "read-variable" | "listview" | "dialog-builder";
  message?: string;
  title?: string;
  description?: string;
  itemCount?: number;
  columns?: string[];
  rows?: string[][];
  /** Populated for type === "dialog-builder" */
  fields?: DialogField[];
}

export interface ScriptResult {
  output: string;
  error: string | null;
  dialogRequests: DialogRequest[];
}

// ============================================================================
// Validation types
// ============================================================================

export interface StructuralValidation {
  type: "structural";
  cmdlet: string;
  requirePath?: string[];
  requireSwitches?: string[];
  requireParams?: Record<string, string>;
  parameterSet?: string;
  allowSpeParams?: boolean;
}

export interface PipelineValidation {
  type: "pipeline";
  stages: string[];
  requireParams?: Record<string, string>;
  parameterSet?: string;
  allowSpeParams?: boolean;
  outputContains?: string;
  outputNotContains?: string;
}

export interface OutputValidation {
  type: "output";
  outputContains?: string;
  outputNotContains?: string;
}

export interface SideEffectValidation {
  type: "side-effect";
  /** Stages that must appear in the script (like pipeline validation) */
  stages?: string[];
  /** After execution, these paths must exist in the tree */
  requirePaths?: string[];
  /** After execution, these paths must NOT exist */
  forbidPaths?: string[];
  /** After execution, check field values at specific paths */
  requireFields?: Array<{
    path: string;
    field: string;
    value: string;
  }>;
  /** Optional output check */
  outputContains?: string;
}

export type TaskValidation =
  | StructuralValidation
  | PipelineValidation
  | OutputValidation
  | SideEffectValidation;

export interface ValidationResult {
  passed: boolean;
  feedback?: string;
  partial?: string[];
}

// ============================================================================
// Lesson types
// ============================================================================

export interface PrefilledStage {
  cmdlet: string;
  params?: Record<string, string>;
  switches?: string[];
  locked?: boolean;
}

export interface BuilderConfig {
  availableCmdlets?: string[];
  prefilled?: PrefilledStage[];
}

export interface Task {
  instruction: string;
  nudge?: string;
  hint: string;
  starterCode?: string;
  validation: TaskValidation;
  successMessage?: string;
  builderConfig?: BuilderConfig;
}

export interface Lesson {
  id: string;
  module: string;
  order: number;
  title: string;
  difficulty: string;
  mode?: "repl" | "ise" | "builder";
  description: string;
  tasks: Task[];
}

// ============================================================================
// Quiz types
// ============================================================================

export interface MultipleChoiceQuestion {
  type: "multiple-choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface CodeChallengeQuestion {
  type: "code-challenge";
  question: string;
  hint?: string;
  starterCode?: string;
  validation: TaskValidation;
  explanation?: string;
}

export type QuizQuestion = MultipleChoiceQuestion | CodeChallengeQuestion;

export interface Quiz {
  id: string;
  module: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  completed: boolean;
  score: number;
  total: number;
  answers: Record<number, number | string>;
}

// ============================================================================
// UI types
// ============================================================================

interface BaseConsoleEntry {
  type: "command" | "script" | "output" | "error" | "warning" | "verbose" | "debug" | "information" | "success" | "hint" | "partial";
  text: string;
  cwd?: string;
}

interface DialogAlertEntry {
  type: "dialog-alert";
  text: string;
  message: string;
}

interface DialogReadVarEntry {
  type: "dialog-read-variable";
  text: string;
  title: string;
  description: string;
}

interface DialogListViewEntry {
  type: "dialog-listview";
  text: string;
  title: string;
  itemCount: number;
  columns: string[];
  rows: string[][];
}

interface DialogBuilderEntry {
  type: "dialog-builder";
  text: string;
  title: string;
  fields: DialogField[];
}

export type ConsoleEntry =
  | BaseConsoleEntry
  | DialogAlertEntry
  | DialogReadVarEntry
  | DialogListViewEntry
  | DialogBuilderEntry;

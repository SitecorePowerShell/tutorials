import type { Lesson } from "../types";

// Import YAML files — vite-plugin-yaml parses them at build time
import lesson00 from "./00-builder-intro.yaml";
import lesson01 from "./01-welcome.yaml";
import lesson02 from "./02-navigating.yaml";
import lesson03 from "./03-pipeline.yaml";
import lesson04 from "./04-filtering.yaml";
import lesson05 from "./05-provider-paths.yaml";
import lesson06 from "./06-ise-intro.yaml";
import lesson07 from "./07-variables.yaml";
import lesson08 from "./08-foreach.yaml";
import lesson09 from "./09-content-reports.yaml";
import lesson10 from "./10-creating-items.yaml";
import lesson11 from "./11-moving-copying.yaml";
import lesson12 from "./12-compound-filters.yaml";
import lesson13 from "./13-numeric-select.yaml";
import lesson14 from "./14-string-operations.yaml";
import lesson15 from "./15-dotnet-types.yaml";
import lesson16 from "./16-data-export.yaml";
import lesson17 from "./17-conditionals.yaml";
import lesson18 from "./18-bulk-updates.yaml";
import lesson19 from "./19-find-item-intro.yaml";
import lesson20 from "./20-find-item-filters.yaml";
import lesson21 from "./21-find-item-advanced.yaml";
import lesson22 from "./22-find-vs-get.yaml";
import lesson23 from "./23-playground.yaml";
import lesson24 from "./24-template-introspection.yaml";
import lesson25 from "./25-field-deep-dive.yaml";
import lesson26 from "./26-error-handling.yaml";
import lesson27 from "./27-publishing.yaml";
import lesson28 from "./28-real-world-scenarios.yaml";

export const LESSONS: Lesson[] = [
  // Level 0 – Visual Builder
  lesson00,
  // Level 1 – Console Fundamentals
  lesson01, lesson02, lesson03, lesson04, lesson05,
  // Level 2 – Scripting Essentials
  lesson06, lesson07, lesson08,
  // Level 3 – Content Management
  lesson09, lesson10, lesson11, lesson24, lesson25, lesson27,
  // Level 4 – Advanced Techniques
  lesson12, lesson13, lesson14, lesson15, lesson16, lesson17, lesson18, lesson26, lesson28,
  // Level 5 – Content Search
  lesson19, lesson20, lesson21, lesson22,
  // Playground
  lesson23,
] as Lesson[];

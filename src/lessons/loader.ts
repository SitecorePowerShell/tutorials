import yaml from "js-yaml";
import type { Lesson } from "../types";

// Import raw YAML files
import lesson00 from "./00-builder-intro.yaml?raw";
import lesson01 from "./01-welcome.yaml?raw";
import lesson02 from "./02-navigating.yaml?raw";
import lesson03 from "./03-pipeline.yaml?raw";
import lesson04 from "./04-filtering.yaml?raw";
import lesson05 from "./05-provider-paths.yaml?raw";
import lesson06 from "./06-ise-intro.yaml?raw";
import lesson07 from "./07-variables.yaml?raw";
import lesson08 from "./08-foreach.yaml?raw";
import lesson09 from "./09-content-reports.yaml?raw";
import lesson10 from "./10-creating-items.yaml?raw";
import lesson11 from "./11-moving-copying.yaml?raw";
import lesson12 from "./12-compound-filters.yaml?raw";
import lesson13 from "./13-numeric-select.yaml?raw";
import lesson14 from "./14-string-operations.yaml?raw";
import lesson15 from "./15-dotnet-types.yaml?raw";
import lesson16 from "./16-data-export.yaml?raw";
import lesson17 from "./17-conditionals.yaml?raw";
import lesson18 from "./18-bulk-updates.yaml?raw";
import lesson19 from "./19-find-item-intro.yaml?raw";
import lesson20 from "./20-find-item-filters.yaml?raw";
import lesson21 from "./21-find-item-advanced.yaml?raw";
import lesson22 from "./22-find-vs-get.yaml?raw";
import lesson23 from "./23-playground.yaml?raw";
import lesson24 from "./24-template-introspection.yaml?raw";
import lesson25 from "./25-field-deep-dive.yaml?raw";
import lesson26 from "./26-error-handling.yaml?raw";
import lesson27 from "./27-publishing.yaml?raw";
import lesson28 from "./28-real-world-scenarios.yaml?raw";

const rawLessons = [
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
];

export const LESSONS: Lesson[] = rawLessons.map((raw) => yaml.load(raw) as Lesson);

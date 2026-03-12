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

const rawLessons = [
  lesson00, lesson01, lesson02, lesson03, lesson04, lesson05,
  lesson06, lesson07, lesson08, lesson09, lesson10, lesson11,
  lesson12, lesson13, lesson14, lesson15, lesson16, lesson17, lesson18,
];

export const LESSONS: Lesson[] = rawLessons.map((raw) => yaml.load(raw) as Lesson);

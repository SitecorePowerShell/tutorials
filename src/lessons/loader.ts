import yaml from "js-yaml";
import type { Lesson } from "../types";

// Import raw YAML files
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

const rawLessons = [
  lesson01, lesson02, lesson03, lesson04, lesson05,
  lesson06, lesson07, lesson08, lesson09, lesson10, lesson11,
];

export const LESSONS: Lesson[] = rawLessons.map((raw) => yaml.load(raw) as Lesson);

import yaml from "js-yaml";
import type { Quiz } from "../types";

// Import raw YAML files
import quiz0 from "./quiz-level-0.yaml?raw";
import quiz1 from "./quiz-level-1.yaml?raw";
import quiz2 from "./quiz-level-2.yaml?raw";
import quiz3 from "./quiz-level-3.yaml?raw";
import quiz4 from "./quiz-level-4.yaml?raw";
import quiz5 from "./quiz-level-5.yaml?raw";

const rawQuizzes = [quiz0, quiz1, quiz2, quiz3, quiz4, quiz5];

export const QUIZZES: Quiz[] = rawQuizzes.map((raw) => yaml.load(raw) as Quiz);

export function getQuizForModule(moduleName: string): Quiz | undefined {
  return QUIZZES.find((q) => q.module === moduleName);
}

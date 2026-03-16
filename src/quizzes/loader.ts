import type { Quiz } from "../types";

// Import YAML files — vite-plugin-yaml parses them at build time
import quiz0 from "./quiz-level-0.yaml";
import quiz1 from "./quiz-level-1.yaml";
import quiz2 from "./quiz-level-2.yaml";
import quiz3 from "./quiz-level-3.yaml";
import quiz4 from "./quiz-level-4.yaml";
import quiz5 from "./quiz-level-5.yaml";

export const QUIZZES: Quiz[] = [quiz0, quiz1, quiz2, quiz3, quiz4, quiz5] as Quiz[];

export function getQuizForModule(moduleName: string): Quiz | undefined {
  return QUIZZES.find((q) => q.module === moduleName);
}

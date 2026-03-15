import type { QuizQuestion, ValidationResult } from "../types";
import { validateTask } from "./validator";

export function validateQuizAnswer(
  question: QuizQuestion,
  answer: number | string
): ValidationResult {
  if (question.type === "multiple-choice") {
    const passed = answer === question.correctIndex;
    return {
      passed,
      feedback: passed
        ? question.explanation ?? "Correct!"
        : question.explanation ?? "That's not quite right.",
    };
  }

  // code-challenge: delegate to existing task validation
  const task = {
    instruction: question.question,
    hint: question.hint ?? "",
    validation: question.validation,
  };
  return validateTask(String(answer), task);
}

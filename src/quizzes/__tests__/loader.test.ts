import { describe, it, expect } from "vitest";
import { QUIZZES, getQuizForModule } from "../loader";

describe("quiz loader", () => {
  it("loads all 6 quizzes", () => {
    expect(QUIZZES).toHaveLength(6);
  });

  it("each quiz has required fields", () => {
    for (const quiz of QUIZZES) {
      expect(quiz.id).toBeTruthy();
      expect(quiz.module).toBeTruthy();
      expect(quiz.title).toBeTruthy();
      expect(quiz.questions.length).toBeGreaterThan(0);
    }
  });

  it("each question has a valid type", () => {
    for (const quiz of QUIZZES) {
      for (const q of quiz.questions) {
        expect(["multiple-choice", "code-challenge"]).toContain(q.type);
        expect(q.question).toBeTruthy();
      }
    }
  });

  it("multiple-choice questions have options and correctIndex", () => {
    for (const quiz of QUIZZES) {
      for (const q of quiz.questions) {
        if (q.type === "multiple-choice") {
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options.length);
        }
      }
    }
  });

  it("code-challenge questions have validation", () => {
    for (const quiz of QUIZZES) {
      for (const q of quiz.questions) {
        if (q.type === "code-challenge") {
          expect(q.validation).toBeTruthy();
          expect(["structural", "pipeline", "output"]).toContain(q.validation.type);
        }
      }
    }
  });

  it("getQuizForModule returns the correct quiz", () => {
    const quiz = getQuizForModule("Level 1 \u2013 Console Fundamentals");
    expect(quiz).toBeDefined();
    expect(quiz!.id).toBe("quiz-level-1");
  });

  it("getQuizForModule returns undefined for unknown module", () => {
    expect(getQuizForModule("Nonexistent Module")).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { validateQuizAnswer } from "../quizValidator";
import type { MultipleChoiceQuestion, CodeChallengeQuestion } from "../../types";

describe("validateQuizAnswer", () => {
  describe("multiple-choice", () => {
    const question: MultipleChoiceQuestion = {
      type: "multiple-choice",
      question: "Which cmdlet retrieves a single item?",
      options: ["Get-ChildItem", "Get-Item", "Find-Item", "Select-Object"],
      correctIndex: 1,
      explanation: "Get-Item retrieves a single item by path.",
    };

    it("returns passed=true for the correct answer", () => {
      const result = validateQuizAnswer(question, 1);
      expect(result.passed).toBe(true);
    });

    it("returns passed=false for a wrong answer", () => {
      const result = validateQuizAnswer(question, 0);
      expect(result.passed).toBe(false);
    });

    it("includes explanation in feedback", () => {
      const result = validateQuizAnswer(question, 1);
      expect(result.feedback).toContain("Get-Item");
    });
  });

  describe("code-challenge", () => {
    const question: CodeChallengeQuestion = {
      type: "code-challenge",
      question: "Use Get-Item to retrieve Home.",
      validation: {
        type: "structural",
        cmdlet: "get-item",
        requirePath: ["master:\\content\\Home"],
      },
    };

    it("validates correct code", () => {
      const result = validateQuizAnswer(
        question,
        'Get-Item -Path "master:\\content\\Home"'
      );
      expect(result.passed).toBe(true);
    });

    it("rejects wrong cmdlet", () => {
      const result = validateQuizAnswer(
        question,
        'Get-ChildItem -Path "master:\\content\\Home"'
      );
      expect(result.passed).toBe(false);
    });
  });
});

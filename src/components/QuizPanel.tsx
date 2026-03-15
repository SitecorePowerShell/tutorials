import { useState, useCallback } from "react";
import type { Quiz, QuizQuestion, QuizResult } from "../types";
import { validateQuizAnswer } from "../validation/quizValidator";
import { MarkdownLite } from "./MarkdownLite";
import { HighlightedCode } from "./HighlightedCode";
import { colors, gradients, fonts, fontSizes } from "../theme";

interface QuizPanelProps {
  quiz: Quiz;
  existingResult?: QuizResult;
  onComplete: (result: QuizResult) => void;
  onSkip: () => void;
  isMobile?: boolean;
}

export function QuizPanel({
  quiz,
  existingResult,
  onComplete,
  onSkip,
  isMobile,
}: QuizPanelProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>(
    existingResult?.answers ?? {}
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [feedback, setFeedback] = useState<{
    passed: boolean;
    message: string;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSummary, setShowSummary] = useState(
    existingResult?.completed ?? false
  );
  const [questionResults, setQuestionResults] = useState<
    Record<number, boolean>
  >({});

  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  const handleMultipleChoiceSelect = useCallback(
    (optionIndex: number) => {
      if (feedback) return; // already answered
      setSelectedOption(optionIndex);
      const result = validateQuizAnswer(question, optionIndex);
      setFeedback({
        passed: result.passed,
        message: result.feedback ?? "",
      });
      setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIndex }));
      setQuestionResults((prev) => ({
        ...prev,
        [currentQuestion]: result.passed,
      }));
      if (result.passed) setCorrectCount((c) => c + 1);
    },
    [question, currentQuestion, feedback]
  );

  const handleCodeSubmit = useCallback(() => {
    const result = validateQuizAnswer(question, codeInput);
    setFeedback({
      passed: result.passed,
      message: result.feedback ?? (result.passed ? "Correct!" : "Not quite right. Check your syntax and try again."),
    });
    setAnswers((prev) => ({ ...prev, [currentQuestion]: codeInput }));
    setQuestionResults((prev) => ({
      ...prev,
      [currentQuestion]: result.passed,
    }));
    if (result.passed) setCorrectCount((c) => c + 1);
  }, [question, currentQuestion, codeInput]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      const finalResult: QuizResult = {
        completed: true,
        score: correctCount,
        total: quiz.questions.length,
        answers,
      };
      setShowSummary(true);
      onComplete(finalResult);
    } else {
      setCurrentQuestion((q) => q + 1);
      setSelectedOption(null);
      setCodeInput("");
      setFeedback(null);
    }
  }, [isLastQuestion, correctCount, quiz.questions.length, answers, onComplete]);

  const handleRetake = useCallback(() => {
    setCurrentQuestion(0);
    setAnswers({});
    setSelectedOption(null);
    setCodeInput("");
    setFeedback(null);
    setCorrectCount(0);
    setShowSummary(false);
    setQuestionResults({});
  }, []);

  // Summary screen
  if (showSummary) {
    const score = existingResult?.completed
      ? existingResult.score
      : correctCount;
    const total = quiz.questions.length;
    const percentage = Math.round((score / total) * 100);

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? 20 : 40,
          overflow: "auto",
        }}
      >
        <div
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.borderMedium}`,
            borderRadius: 12,
            padding: isMobile ? 24 : 40,
            maxWidth: 520,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 24 : 28,
              fontWeight: 700,
              color: colors.textPrimary,
              marginBottom: 8,
            }}
          >
            Quiz Complete
          </div>
          <div
            style={{
              fontSize: isMobile ? 16 : 18,
              color: colors.textSecondary,
              marginBottom: 24,
            }}
          >
            {quiz.title}
          </div>

          {/* Score circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: `4px solid ${percentage >= 70 ? colors.statusSuccess : colors.statusHint}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: percentage >= 70 ? colors.statusSuccess : colors.statusHint,
              }}
            >
              {score}/{total}
            </div>
            <div style={{ fontSize: fontSizes.xs, color: colors.textMuted }}>
              {percentage}%
            </div>
          </div>

          {/* Per-question review */}
          <div style={{ textAlign: "left", marginBottom: 24 }}>
            {quiz.questions.map((q, i) => {
              const passed = existingResult?.completed
                ? questionResults[i] ?? false
                : questionResults[i] ?? false;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom:
                      i < quiz.questions.length - 1
                        ? `1px solid ${colors.borderLight}`
                        : "none",
                  }}
                >
                  <span
                    style={{
                      color: passed
                        ? colors.statusSuccess
                        : colors.statusError,
                      fontWeight: 700,
                      fontSize: fontSizes.base,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {passed ? "✓" : "✗"}
                  </span>
                  <span
                    style={{
                      fontSize: fontSizes.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    Q{i + 1}: {q.question.slice(0, 80)}
                    {q.question.length > 80 ? "..." : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={handleRetake}
              style={{
                background: "transparent",
                border: `1px solid ${colors.borderMedium}`,
                color: colors.textSecondary,
                padding: isMobile ? "12px 24px" : "8px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: isMobile ? 16 : fontSizes.body,
                fontFamily: "inherit",
              }}
            >
              Retake Quiz
            </button>
            <button
              onClick={onSkip}
              style={{
                background: gradients.accent,
                border: "none",
                color: colors.textWhite,
                padding: isMobile ? "12px 24px" : "8px 20px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: isMobile ? 16 : fontSizes.body,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question view
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        padding: isMobile ? 16 : 32,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: isMobile ? 18 : 20,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            {quiz.title}
          </div>
          <div
            style={{
              fontSize: fontSizes.sm,
              color: colors.textMuted,
              marginTop: 4,
            }}
          >
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
        </div>
        <button
          onClick={onSkip}
          style={{
            background: "transparent",
            border: `1px solid ${colors.borderDim}`,
            color: colors.textMuted,
            padding: isMobile ? "10px 16px" : "6px 14px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: fontSizes.sm,
            fontFamily: "inherit",
          }}
        >
          Skip Quiz
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {quiz.questions.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background:
                questionResults[i] === true
                  ? colors.statusSuccess
                  : questionResults[i] === false
                    ? colors.statusError
                    : i === currentQuestion
                      ? colors.accentPrimary
                      : colors.borderDim,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {/* Question card */}
      <div
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.borderMedium}`,
          borderRadius: 8,
          padding: isMobile ? 20 : 28,
          flex: 1,
        }}
      >
        {/* Question type badge */}
        <div
          style={{
            fontSize: fontSizes.xs,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color:
              question.type === "multiple-choice"
                ? colors.accentPrimary
                : colors.statusHint,
            marginBottom: 12,
          }}
        >
          {question.type === "multiple-choice"
            ? "Multiple Choice"
            : "Code Challenge"}
        </div>

        {/* Question text */}
        <div
          style={{
            fontSize: isMobile ? 16 : fontSizes.lg,
            lineHeight: 1.6,
            color: colors.textPrimary,
            marginBottom: 20,
          }}
        >
          <MarkdownLite text={question.question} />
        </div>

        {/* Multiple choice options */}
        {question.type === "multiple-choice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {question.options.map((option, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = feedback && i === question.correctIndex;
              const isWrong = feedback && isSelected && !feedback.passed;

              let borderColor = colors.borderMedium;
              let bg = colors.bgSurface;
              if (isCorrect) {
                borderColor = colors.statusSuccess;
                bg = colors.bgCardSuccess;
              } else if (isWrong) {
                borderColor = colors.statusError;
                bg = colors.bgCard;
              } else if (isSelected && !feedback) {
                borderColor = colors.accentPrimary;
              }

              return (
                <button
                  key={i}
                  onClick={() => handleMultipleChoiceSelect(i)}
                  disabled={!!feedback}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: isMobile ? "14px 16px" : "12px 16px",
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 6,
                    cursor: feedback ? "default" : "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    fontSize: isMobile ? 15 : fontSizes.body,
                    color: colors.textPrimary,
                    transition: "border-color 0.15s, background 0.15s",
                    minHeight: isMobile ? 48 : undefined,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: `2px solid ${borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: fontSizes.xs,
                      fontWeight: 600,
                      color: isCorrect
                        ? colors.statusSuccess
                        : isWrong
                          ? colors.statusError
                          : colors.textMuted,
                    }}
                  >
                    {isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Code challenge input */}
        {question.type === "code-challenge" && (
          <div>
            <textarea
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              disabled={!!feedback?.passed}
              placeholder="Type your PowerShell command here..."
              style={{
                width: "100%",
                minHeight: 100,
                padding: 12,
                background: colors.bgDeep,
                border: `1px solid ${colors.borderMedium}`,
                borderRadius: 6,
                color: colors.textCode,
                fontFamily: fonts.mono,
                fontSize: isMobile ? 14 : fontSizes.body,
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (!feedback?.passed) handleCodeSubmit();
                }
              }}
            />
            {!feedback?.passed && (
              <button
                onClick={handleCodeSubmit}
                disabled={!codeInput.trim()}
                style={{
                  marginTop: 10,
                  background: codeInput.trim() ? gradients.accent : colors.bgOverlay,
                  border: "none",
                  color: codeInput.trim() ? colors.textWhite : colors.textMuted,
                  padding: isMobile ? "12px 20px" : "8px 16px",
                  borderRadius: 6,
                  cursor: codeInput.trim() ? "pointer" : "not-allowed",
                  fontSize: isMobile ? 15 : fontSizes.body,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Run & Check
              </button>
            )}
            {/* Show hint for code challenges */}
            {question.hint && !feedback?.passed && (
              <details style={{ marginTop: 12 }}>
                <summary
                  style={{
                    fontSize: fontSizes.sm,
                    color: colors.textMuted,
                    cursor: "pointer",
                  }}
                >
                  Show Hint
                </summary>
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    background: colors.bgOverlay,
                    borderRadius: 6,
                    borderLeft: `3px solid ${colors.statusHint}`,
                  }}
                >
                  <HighlightedCode code={question.hint} />
                </div>
              </details>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: feedback.passed
                ? colors.bgCardSuccess
                : colors.bgOverlay,
              border: `1px solid ${feedback.passed ? colors.borderSuccess : colors.borderMedium}`,
              borderRadius: 6,
              fontSize: fontSizes.body,
              color: colors.textPrimary,
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: feedback.passed
                  ? colors.statusSuccess
                  : colors.statusError,
                marginRight: 8,
              }}
            >
              {feedback.passed ? "Correct!" : "Incorrect."}
            </span>
            {feedback.message && <MarkdownLite text={feedback.message} />}
          </div>
        )}

        {/* Next button */}
        {feedback && (
          <button
            onClick={handleNext}
            style={{
              marginTop: 16,
              background: gradients.accent,
              border: "none",
              color: colors.textWhite,
              padding: isMobile ? "12px 24px" : "8px 20px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: isMobile ? 16 : fontSizes.body,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {isLastQuestion ? "View Results" : "Next Question →"}
          </button>
        )}
      </div>
    </div>
  );
}

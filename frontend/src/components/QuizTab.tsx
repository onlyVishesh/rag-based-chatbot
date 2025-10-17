import { useState } from "react";
import type { QuizQuestion } from "../service/api";
import { generateQuiz, submitQuizAnswer } from "../service/api";

export function QuizTab() {
  const [topic, setTopic] = useState("Quadratic Equations");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy"
  );
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setFeedback(null);
    setSelectedAnswer("");
    setShowExplanation(false);

    try {
      const response = await generateQuiz(topic, difficulty);
      setQuestion(response.question);
      setSessionId(response.sessionId);
    } catch (error) {
      console.error("Quiz generation error:", error);
      alert("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !question || !sessionId) return;

    setLoading(true);

    try {
      const response = await submitQuizAnswer(
        sessionId,
        selectedAnswer,
        question.correctAnswer,
        question.question
      );

      setFeedback(
        response.isCorrect
          ? "✅ Correct! Well done!"
          : "❌ Incorrect. See explanation below."
      );
      setShowExplanation(true);
    } catch (error) {
      console.error("Quiz submission error:", error);
      alert("Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuestion = () => {
    setQuestion(null);
    setSelectedAnswer("");
    setFeedback(null);
    setShowExplanation(false);
    setSessionId(undefined);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>🧠 Adaptive Quiz</h2>

      {/* Settings */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label>
            <strong>Topic: </strong>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ padding: "8px", fontSize: "16px" }}
            >
              <option>Quadratic Equations</option>
              <option>Chemical Reactions</option>
              <option>Trigonometry</option>
              <option>Calculus</option>
              <option>Physics</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            <strong>Difficulty: </strong>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as "easy" | "medium" | "hard")
              }
              style={{ padding: "8px", fontSize: "16px" }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Generating..." : "🎲 Generate Question"}
        </button>
      </div>

      {/* Question Display */}
      {question && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3 style={{ color: "#333", marginBottom: "15px" }}>
            {question.question}
          </h3>

          <div style={{ marginBottom: "20px" }}>
            {question.options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
              return (
                <label
                  key={index}
                  style={{
                    display: "block",
                    margin: "10px 0",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor:
                      selectedAnswer === optionLetter ? "#e3f2fd" : "white",
                    color: "#333", // Ensure text is dark
                  }}
                >
                  <input
                    type="radio"
                    name="quiz-option"
                    value={optionLetter}
                    checked={selectedAnswer === optionLetter}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    style={{ marginRight: "10px" }}
                  />
                  <strong style={{ color: "#333" }}>{optionLetter})</strong>{" "}
                  <span style={{ color: "#333" }}>{option}</span>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || loading || feedback !== null}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor:
                  !selectedAnswer || loading || feedback !== null
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading ? "⏳ Checking..." : "✅ Submit Answer"}
            </button>

            {feedback && (
              <button
                onClick={handleNewQuestion}
                style={{
                  padding: "10px 20px",
                  fontSize: "16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                🔄 New Question
              </button>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "6px",
                backgroundColor: feedback.includes("✅")
                  ? "#d4edda"
                  : "#f8d7da",
                color: feedback.includes("✅") ? "#155724" : "#721c24",
                border: `1px solid ${
                  feedback.includes("✅") ? "#c3e6cb" : "#f5c6cb"
                }`,
              }}
            >
              <strong>{feedback}</strong>

              {showExplanation && question.explanation && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Explanation:</strong>
                  <p style={{ margin: "5px 0 0 0" }}>{question.explanation}</p>
                  <p
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "14px",
                      opacity: 0.8,
                    }}
                  >
                    <strong>Correct Answer:</strong> {question.correctAnswer}){" "}
                    {
                      question.options[
                        question.correctAnswer.charCodeAt(0) - 65
                      ]
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!question && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#666",
            border: "2px dashed #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>🎯 Ready to test your knowledge?</h3>
          <p>
            Select a topic and difficulty level, then click "Generate Question"
            to start!
          </p>
        </div>
      )}
    </div>
  );
}

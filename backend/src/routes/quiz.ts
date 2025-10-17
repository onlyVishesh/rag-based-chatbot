import { FastifyInstance } from "fastify";
import { query } from "../db/client";
import {
  generateQuizSystemPrompt,
  getAdaptiveDifficulty,
  getQuizContext,
} from "../services/adaptive";
import { generateResponse } from "../services/ollama";
import { retrieveRelevantContent } from "../services/rag";

export async function quizRoutes(fastify: FastifyInstance) {
  // POST /api/quiz/generate - Generate adaptive quiz question
  fastify.post("/api/quiz/generate", async (request, reply) => {
    const { topic, sessionId } = request.body as {
      topic: string;
      sessionId?: number;
    };

    try {
      // Create quiz session if none exists
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const result = await query(
          "INSERT INTO quiz_sessions (topic, difficulty, total_questions) VALUES ($1, $2, 0) RETURNING id",
          [topic, "medium"]
        );
        currentSessionId = result.rows[0].id;
      }

      // Get quiz context for adaptive difficulty
      const quizContext = await getQuizContext(currentSessionId!, topic);

      // Determine adaptive difficulty
      const adaptiveDifficulty = getAdaptiveDifficulty(
        quizContext.consecutiveCorrect,
        quizContext.consecutiveWrong,
        quizContext.currentDifficulty
      );

      // Update session with new difficulty
      await query("UPDATE quiz_sessions SET difficulty = $1 WHERE id = $2", [
        adaptiveDifficulty,
        currentSessionId,
      ]);

      // Retrieve relevant content for question generation
      const relevantContent = await retrieveRelevantContent(
        `Generate a ${adaptiveDifficulty} question about ${topic}`,
        topic,
        2
      );

      // Generate adaptive system prompt
      const systemPrompt = generateQuizSystemPrompt({
        ...quizContext,
        currentDifficulty: adaptiveDifficulty,
      });

      // Build final prompt with content
      const contentSection =
        relevantContent.length > 0
          ? `CURRICULUM CONTENT:\n${relevantContent
              .map((content, i) => `[Content ${i + 1}]: ${content}`)
              .join("\n\n")}\n\n`
          : "";

      const finalPrompt = `${contentSection}${systemPrompt}\n\nGenerate a ${adaptiveDifficulty} difficulty question now:`;

      // Generate question using LLM
      const response = await generateResponse(finalPrompt);

      // Parse the response into structured format
      const question = parseQuizResponse(response, adaptiveDifficulty);
      console.log()

      return {
        sessionId: currentSessionId,
        question,
        difficulty: adaptiveDifficulty,
        context: {
          mastery: quizContext.mastery,
          consecutiveCorrect: quizContext.consecutiveCorrect,
          consecutiveWrong: quizContext.consecutiveWrong,
        },
      };
    } catch (error) {
      console.error("Adaptive quiz generation error:", error);
      return reply
        .status(500)
        .send({ error: "Failed to generate adaptive quiz" });
    }
  });

  // POST /api/quiz/submit - Submit answer with adaptive tracking
  fastify.post("/api/quiz/submit", async (request, reply) => {
    const { sessionId, userAnswer, correctAnswer, question } = request.body as {
      sessionId: number;
      userAnswer: string;
      correctAnswer: string;
      question: string;
    };

    try {
      const isCorrect =
        userAnswer.toUpperCase() === correctAnswer.toUpperCase();

      // Get current session info
      const sessionResult = await query(
        "SELECT topic, difficulty FROM quiz_sessions WHERE id = $1",
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({ error: "Quiz session not found" });
      }

      const { topic, difficulty } = sessionResult.rows[0];

      // Record the answer in quiz_answers table
      await query(
        `INSERT INTO quiz_answers (session_id, question, user_answer, correct_answer, is_correct, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, question, userAnswer, correctAnswer, isCorrect, difficulty]
      );

      // Update quiz session totals
      await query(
        `UPDATE quiz_sessions 
         SET total_questions = total_questions + 1,
             correct_answers = correct_answers + $1
         WHERE id = $2`,
        [isCorrect ? 1 : 0, sessionId]
      );

      // Get updated performance for feedback
      const performanceResult = await query(
        `SELECT correct_answers, total_questions FROM quiz_sessions WHERE id = $1`,
        [sessionId]
      );

      const { correct_answers, total_questions } = performanceResult.rows[0];
      const currentAccuracy =
        total_questions > 0
          ? Math.round((correct_answers / total_questions) * 100)
          : 0;

      // Generate encouraging feedback
      let feedbackMessage = "";
      if (isCorrect) {
        if (currentAccuracy >= 80) {
          feedbackMessage =
            "Excellent! You're mastering this topic. Ready for a challenge?";
        } else if (currentAccuracy >= 60) {
          feedbackMessage = "Good job! You're building strong understanding.";
        } else {
          feedbackMessage = "Correct! You're on the right track.";
        }
      } else {
        if (currentAccuracy < 40) {
          feedbackMessage =
            "Don't worry! Let's focus on the basics. You're learning!";
        } else if (currentAccuracy < 60) {
          feedbackMessage =
            "Not quite right, but you're making progress. Keep practicing!";
        } else {
          feedbackMessage = "Close! Let's review this concept together.";
        }
      }

      return {
        isCorrect,
        message: feedbackMessage,
        accuracy: currentAccuracy,
        totalQuestions: total_questions,
        correctAnswers: correct_answers,
        nextDifficultyHint: getNextDifficultyHint(isCorrect, difficulty),
      };
    } catch (error) {
      console.error("Quiz submit error:", error);
      return reply.status(500).send({ error: "Failed to submit answer" });
    }
  });
}

/**
 * Parse LLM response into structured quiz question
 */
function parseQuizResponse(response: string, difficulty: string): any {
  const lines = response.split("\n").filter((line) => line.trim());
  console.log(lines)

  const question =
    lines
      .find((l) => l.trim().toUpperCase().startsWith("QUESTION:"))
      ?.replace(/QUESTION:/i, "")
      .trim() || "Sample Question";

  const options = lines
    .filter((l) => /^[A-D]\)/i.test(l.trim()))
    .map((l) => l.substring(l.indexOf(")") + 1).trim());

  const correctAnswer =
    lines
      .find((l) => l.toUpperCase().startsWith("ANSWER:"))
      ?.replace(/ANSWER:/i, "")
      .trim()
      .charAt(0)
      .toUpperCase() || "A";

  const explanation =
    lines
      .find((l) => l.toUpperCase().startsWith("EXPLANATION:"))
      ?.replace(/EXPLANATION:/i, "")
      .trim() || "No explanation provided.";

  return {
    question,
    options:
      options.length === 4
        ? options
        : ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer,
    explanation,
    difficulty,
  };
}

/**
 * Provide hint about next difficulty level
 */
function getNextDifficultyHint(
  isCorrect: boolean,
  currentDifficulty: string
): string {
  if (isCorrect) {
    if (currentDifficulty === "easy")
      return "Keep this up and we'll try medium questions!";
    if (currentDifficulty === "medium")
      return "Great progress! Hard questions coming soon.";
    return "Excellent mastery! You're at the highest level.";
  } else {
    if (currentDifficulty === "hard")
      return "Let's try some medium level questions to build confidence.";
    if (currentDifficulty === "medium")
      return "Let's review basics with easier questions.";
    return "Focus on understanding fundamentals first.";
  }
}

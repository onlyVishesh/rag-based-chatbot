import { generateResponse } from "./ollama";
import { retrieveRelevantContent } from "./rag";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/**
 * Generate a quiz question using RAG + LLM
 */
export async function generateQuizQuestion(
  topic: string,
  difficulty: "easy" | "medium" | "hard"
): Promise<QuizQuestion> {
  // Retrieve relevant content for the topic
  const relevantContent = await retrieveRelevantContent(
    `Generate a ${difficulty} question about ${topic}`,
    topic,
    2
  );

  // Build prompt for LLM
  const prompt = `Create a ${difficulty} level multiple-choice question about ${topic}.

Use this context: ${relevantContent.join(" ")}

Format your response exactly like this:

QUESTION: [Write your question here]
A) [First option]
B) [Second option] 
C) [Third option]
D) [Fourth option]
ANSWER: A
EXPLANATION: [Why A is correct]

Be sure to start each line with the exact labels shown above.`;

  console.log("=== PROMPT SENT TO LLM ===");
  console.log(prompt);
  console.log("=== END PROMPT ===");

  console.log("🔄 Calling Ollama with prompt...");
  const response = await generateResponse(prompt);
  console.log("✅ Ollama response received!");

  // Debug: Log the raw response to understand what we're getting
  console.log("\n=== RAW LLM RESPONSE ===");
  console.log(response);
  console.log("=== END RAW RESPONSE ===\n"); // Parse the response
  return parseQuizResponse(response);
}

/**
 * Parse LLM response into structured quiz question
 */
function parseQuizResponse(response: string): QuizQuestion {
  console.log("Raw LLM response:", response); // Debug log

  const lines = response.split("\n").filter((line) => line.trim());

  // Try multiple patterns for question
  let question = lines
    .find((l) => l.toLowerCase().match(/^question\s*:\s*/))
    ?.replace(/^question\s*:\s*/i, "")
    .trim();

  if (!question) {
    // Look for numbered questions (1. What is...)
    question = lines
      .find((l) => l.match(/^\d+\.\s+/))
      ?.replace(/^\d+\.\s+/, "")
      .trim();
  }

  if (!question) {
    // Look for lines that look like questions (end with ?)
    question = lines.find((l) => l.trim().endsWith("?"))?.trim();
  }

  if (!question) {
    // Look for any line with mathematical content or "solve", "find", etc.
    question = lines
      .find(
        (l) => l.match(/solve|find|calculate|what|which|how/i) && l.length > 10
      )
      ?.trim();
  }

  if (!question) {
    // Fallback: take the first substantial line that's not an option
    question = lines
      .find(
        (l) =>
          l.trim().length > 10 &&
          !l.match(/^[A-D]\)/) &&
          !l.toLowerCase().includes("answer") &&
          !l.toLowerCase().includes("explanation")
      )
      ?.trim();
  }

  // Ensure we have a question
  question = question || "What are the solutions to x² + 5x + 6 = 0?";

  // Extract options more robustly
  const options: string[] = [];
  const optionRegex = /^[A-D]\)\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(optionRegex);
    if (match) {
      options.push(match[1].trim());
    }
  }

  // If we don't have 4 options, look for alternative formats
  if (options.length < 4) {
    console.log("Looking for alternative option formats...");

    // Try to find options in other formats like "A. text" or "A: text"
    for (const line of lines) {
      const altMatch = line.match(/^[A-D][\.\:]\s*(.+)/i);
      if (altMatch && !options.includes(altMatch[1].trim())) {
        options.push(altMatch[1].trim());
      }
    }
  }

  // If still not enough options, provide mathematics-relevant fallback
  if (options.length < 4) {
    console.log("Using fallback options for mathematics question");
    const fallbackOptions = [
      "x = -2, -3",
      "x = -1, -6",
      "x = 2, 3",
      "x = 1, 6",
    ];
    return {
      question: question,
      options: fallbackOptions,
      correctAnswer: "A",
      explanation:
        "Using factoring method: x² + 5x + 6 = (x + 2)(x + 3) = 0, so x = -2 or x = -3",
    };
  }

  // Extract correct answer
  let correctAnswer = "A";
  for (const line of lines) {
    const answerMatch = line.match(/answer\s*:\s*([A-D])/i);
    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase();
      break;
    }
  }

  // Extract explanation
  let explanation = "No explanation provided.";
  for (const line of lines) {
    const expMatch = line.match(/explanation\s*:\s*(.+)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      break;
    }
  }

  console.log("Parsed question:", {
    question,
    options,
    correctAnswer,
    explanation,
  });

  return {
    question,
    options: options.slice(0, 4), // Ensure exactly 4 options
    correctAnswer,
    explanation,
  };
}

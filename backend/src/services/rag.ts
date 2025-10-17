import { query } from "../db/client";
import { generateEmbedding } from "./ollama";

/**
 * Detect if user's question is about a different topic than the session topic
 */
function detectTopicMismatch(userQuery: string, sessionTopic: string): boolean {
  const queryLower = userQuery.toLowerCase();
  const topicLower = sessionTopic.toLowerCase();

  // Define topic keywords
  const topicKeywords: Record<string, string[]> = {
    "quadratic equations": [
      "quadratic",
      "equation",
      "parabola",
      "x²",
      "square",
      "roots",
      "factoring",
    ],
    polynomials: ["polynomial", "degree", "coefficient", "term", "variable"],
    probability: [
      "probability",
      "chance",
      "likelihood",
      "odds",
      "random",
      "sample",
      "event",
    ],
    trigonometry: ["sin", "cos", "tan", "angle", "triangle", "trigonometry"],
    statistics: ["mean", "median", "mode", "data", "statistics", "average"],
    geometry: ["circle", "triangle", "rectangle", "area", "perimeter", "angle"],
    algebra: ["variable", "expression", "solve", "equation", "linear"],
  };

  // Check if query contains keywords from other topics
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (topic !== topicLower) {
      const hasKeywords = keywords.some((keyword) =>
        queryLower.includes(keyword)
      );
      if (hasKeywords) {
        console.log(
          `🔄 Possible topic mismatch detected: Query seems about "${topic}" but session topic is "${sessionTopic}"`
        );
        return true;
      }
    }
  }

  return false;
}

/**
 * Retrieve relevant content using RAG with strict topic matching
 */
export async function retrieveRelevantContent(
  userQuery: string,
  topic: string,
  topK: number = 3
): Promise<string[]> {
  try {
    console.log(`🔍 RAG Search - Query: "${userQuery}", Topic: "${topic}"`);

    // Step 0: Check for topic mismatch
    const isPossibleMismatch = detectTopicMismatch(userQuery, topic);
    if (isPossibleMismatch) {
      console.log(
        `⚠️ Topic mismatch detected - returning empty to let AI handle appropriately`
      );
      return [];
    }

    // Step 1: First try exact topic match
    const exactTopicResult = await query(
      `
      SELECT content, type, difficulty, topic,
             1 - (embedding <=> $1::vector) AS similarity
      FROM content_items
      WHERE LOWER(topic) = LOWER($2)
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      [
        JSON.stringify(await generateEmbedding(userQuery)),
        topic.toLowerCase(),
        topK,
      ]
    );

    if (exactTopicResult.rows.length > 0) {
      console.log(
        `✅ Found ${exactTopicResult.rows.length} results with exact topic match for "${topic}"`
      );

      const relevantResults = exactTopicResult.rows.filter((row, i) => {
        const similarity = row.similarity || 0;
        console.log(
          `📄 Exact Match ${i + 1}: Similarity=${similarity?.toFixed(
            3
          )}, Content="${row.content.substring(0, 100)}..."`
        );

        // IMPORTANT: Even for exact topic matches, check if content is actually relevant to the query
        // If similarity is too low, the student might be asking about something else within this topic
        if (similarity < 0.4) {
          console.log(
            `⚠️ Low similarity (${similarity?.toFixed(
              3
            )}) - content may not match the specific question`
          );
          return false;
        }

        return true;
      });

      if (relevantResults.length === 0) {
        console.log(
          `🔄 Topic "${topic}" matched but content not relevant to question. Checking cross-topic...`
        );
      } else {
        console.log(
          `✅ Found ${relevantResults.length} relevant results for topic "${topic}"`
        );
        return relevantResults.map((row) => row.content);
      }
    }

    // Step 2: If no exact topic match, try cross-topic search with VERY strict threshold
    console.log(
      `❌ No exact topic match found for "${topic}". Checking cross-topic relevance...`
    );

    const crossTopicResult = await query(
      `
      SELECT content, type, difficulty, topic,
             1 - (embedding <=> $1::vector) AS similarity
      FROM content_items
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [JSON.stringify(await generateEmbedding(userQuery)), 10] // Get more to analyze
    );

    console.log(`📊 Found ${crossTopicResult.rows.length} cross-topic results`);

    // Apply VERY strict threshold for cross-topic matches
    const strictThreshold = 0.8; // Much higher threshold - only truly related content
    console.log(strictThreshold);
    const relevantResults = crossTopicResult.rows.filter((row, i) => {
      const similarity = row.similarity || 0;
      console.log(
        `📄 Cross-topic ${i + 1}: Topic="${
          row.topic
        }", Similarity=${similarity?.toFixed(
          3
        )}, Content="${row.content.substring(0, 80)}..."`
      );

      if (similarity > strictThreshold) {
        console.log(
          `✅ HIGHLY relevant cross-topic match (${similarity?.toFixed(
            3
          )} > ${strictThreshold})`
        );
        return true;
      }

      return false;
    });

    if (relevantResults.length === 0) {
      console.log(
        `🚫 No relevant content found for "${topic}". Available topics in DB: Check your content_items table.`
      );
      console.log(
        `💡 Suggestion: Add content for "${topic}" or ask about available topics.`
      );
      return [];
    }

    console.log(
      `🎯 Found ${relevantResults.length} highly relevant cross-topic results`
    );
    return relevantResults.slice(0, topK).map((result) => result.content);
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return []; // Return empty if RAG fails
  }
}

/**
 * Build context for LLM prompt using retrieved content
 */
export function buildContextPrompt(
  userMessage: string,
  retrievedContent: string[]
): string {
  if (retrievedContent.length === 0) {
    return userMessage; // No context available
  }

  const contextSection = retrievedContent
    .map((content, i) => `[Context ${i + 1}]: ${content}`)
    .join("\n\n");

  return `
RELEVANT CURRICULUM CONTENT:
${contextSection}

USER QUESTION:
${userMessage}

Please answer the user's question using the provided curriculum content as reference. Be clear, concise, and educational.
`;
}

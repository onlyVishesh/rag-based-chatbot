import { FastifyInstance } from "fastify";
import { query } from "../db/client";
import { generateChatSystemPrompt, getChatContext } from "../services/adaptive";
import { generateResponse } from "../services/ollama";
import { retrieveRelevantContent } from "../services/rag";

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat - Send message and get AI response
  fastify.post("/api/chat", async (request, reply) => {
    const { message, topic, sessionId } = request.body as {
      message: string;
      topic: string;
      sessionId?: number;
    };

    try {
      // Step 1: Create or use existing session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const result = await query(
          "INSERT INTO chat_sessions (topic) VALUES ($1) RETURNING id",
          [topic]
        );
        currentSessionId = result.rows[0].id;
      }

      // Step 2: Save user message
      await query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [currentSessionId, "user", message]
      );

      // Step 3: Retrieve relevant content using RAG
      const relevantContent = await retrieveRelevantContent(message, topic);

      // Step 4: Get user context for adaptive prompting
      const userContext = await getChatContext(currentSessionId!, topic);

      // Step 5: Generate adaptive system prompt with retrieved content
      const systemPrompt = generateChatSystemPrompt(
        userContext,
        relevantContent
      );

      // Step 6: Build final prompt with system context and user message
      const finalPrompt = `${systemPrompt}\n\nStudent Question: ${message}\n\nTutor Response:`;

      // Step 7: Generate AI response
      const aiResponse = await generateResponse(finalPrompt);

      // Step 6: Save AI response
      await query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [currentSessionId, "assistant", aiResponse]
      );

      // Step 7: Update session message count
      await query(
        "UPDATE chat_sessions SET message_count = message_count + 2 WHERE id = $1",
        [currentSessionId]
      );

      return {
        sessionId: currentSessionId,
        response: aiResponse,
        relevantContentUsed: relevantContent.length > 0,
      };
    } catch (error) {
      console.error("Chat error:", error);
      return reply.status(500).send({ error: "Failed to process message" });
    }
  });

  // GET /api/chat/history/:sessionId - Get chat history
  fastify.get<{ Params: { sessionId: string } }>(
    "/api/chat/history/:sessionId",
    async (request, reply) => {
      const { sessionId } = request.params;

      try {
        const result = await query(
          `SELECT role, content, created_at 
           FROM chat_messages 
           WHERE session_id = $1 
           ORDER BY created_at ASC`,
          [sessionId]
        );

        return { messages: result.rows };
      } catch (error) {
        return reply.status(500).send({ error: "Failed to fetch history" });
      }
    }
  );
}

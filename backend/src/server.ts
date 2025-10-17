import Fastify from "fastify";
import cors from "@fastify/cors";
import { chatRoutes } from "./routes/chat";
import { quizRoutes } from "./routes/quiz";

const fastify = Fastify({
  logger: true,
});

// Enable CORS for frontend
fastify.register(cors, {
  origin: "http://localhost:5173", // Vite default port
});

// Register routes
fastify.register(chatRoutes);
fastify.register(quizRoutes);

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Server running on http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

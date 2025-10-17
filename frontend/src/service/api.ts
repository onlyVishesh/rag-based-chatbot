import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// Chat API
export async function sendChatMessage(
  message: string,
  topic: string,
  sessionId?: number
) {
  const response = await api.post("/api/chat", {
    message,
    topic,
    sessionId,
  });
  return response.data;
}

export async function getChatHistory(sessionId: number) {
  const response = await api.get(`/api/chat/history/${sessionId}`);
  return response.data.messages as ChatMessage[];
}

// Quiz API
export async function generateQuiz(topic: string, difficulty: string) {
  const response = await api.post("/api/quiz/generate", {
    topic,
    difficulty,
  });
  return response.data;
}

export async function submitQuizAnswer(
  sessionId: number,
  userAnswer: string,
  correctAnswer: string,
  question: string
) {
  const response = await api.post("/api/quiz/submit", {
    sessionId,
    userAnswer,
    correctAnswer,
    question,
  });
  return response.data;
}

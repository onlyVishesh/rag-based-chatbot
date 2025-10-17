export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ChatSession {
  id: number;
  topic: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
}

export interface ContentItem {
  id: number;
  topic: string;
  type: "question" | "explanation" | "misconception";
  difficulty: "easy" | "medium" | "hard";
  content: string;
  embedding?: number[];
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface QuizSession {
  id: number;
  topic: string;
  difficulty: string;
  total_questions: number;
  correct_answers: number;
  created_at: string;
}

export interface PDFDocument {
  filename: string;
  content: string;
  chunks: string[];
  metadata: {
    title?: string;
    author?: string;
    pages: number;
    topic?: string;
  };
}

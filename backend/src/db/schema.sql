-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Content items (questions, explanations, etc)
CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'question', 'explanation', 'misconception'
  difficulty VARCHAR(20) NOT NULL, -- 'easy', 'medium', 'hard'
  content TEXT NOT NULL,
  embedding vector(768), -- Ollama embeddings are 768-dimensional
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  message_count INT DEFAULT 0
);

-- Chat messages
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES chat_sessions(id),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz sessions
CREATE TABLE quiz_sessions (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(255),
  difficulty VARCHAR(20),
  total_questions INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON content_items USING ivfflat (embedding vector_cosine_ops);

-- Seed some sample content
INSERT INTO content_items (topic, type, difficulty, content) VALUES
('Quadratic Equations', 'question', 'easy', 'Solve: x² + 5x + 6 = 0'),
('Quadratic Equations', 'explanation', 'easy', 'A quadratic equation is in the form ax² + bx + c = 0. To solve it, you can use factoring, completing the square, or the quadratic formula.'),
('Quadratic Equations', 'misconception', 'easy', 'Common mistake: Students often forget that there are TWO solutions to a quadratic equation, not just one.');
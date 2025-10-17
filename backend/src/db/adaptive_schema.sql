-- Add quiz answers tracking table for adaptive learning
CREATE TABLE IF NOT EXISTS quiz_answers (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES quiz_sessions(id),
  question TEXT NOT NULL,
  user_answer VARCHAR(1) NOT NULL, -- A, B, C, or D
  correct_answer VARCHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add user_identifier column to quiz_sessions
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS user_identifier VARCHAR(255) DEFAULT 'anonymous';

-- Add index for performance queries
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_created ON quiz_answers(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_topic_created ON quiz_answers(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_identifier ON quiz_sessions(user_identifier);
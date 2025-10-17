# 🎓 AI Tutor Prototype

A prototype AI tutoring system with chat functionality and adaptive quiz generation using RAG (Retrieval-Augmented Generation) with local LLM via Ollama.

## ✨ Features

- **💬 Adaptive AI Chat**: Context-aware conversations with Class 10 CBSE focused system prompts
- **🧠 Smart Adaptive Quiz**: Dynamically adjusts difficulty based on student performance
- **📚 RAG-powered**: Answers based on your PDF documents stored in vector database
- **🇮🇳 Indian Context**: Uses local examples (cricket, festivals, familiar references)
- **🎯 Socratic Method**: Guides discovery rather than giving direct answers
- **📈 Performance Tracking**: Monitors mastery level and knowledge gaps
- **🏠 Local AI**: Runs completely locally using Ollama (no external API calls)
- **⚡ Real-time**: Fast responses with PostgreSQL + pgvector for similarity search

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓ HTTP API
Backend (Node.js + Fastify)
    ↓ Queries
PostgreSQL + pgvector (Vector DB)
    ↓ Embeddings & Generation
Ollama (Mistral 7B + Nomic Embed)
```

## 🚀 Quick Start

### Prerequisites

1. **Ollama** - [Install Ollama](https://ollama.ai/)
2. **PostgreSQL** with pgvector extension
3. **Node.js** 18+ and npm/pnpm

### Installation

1. **Clone and install dependencies:**

   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Start Ollama and pull models:**

   ```bash
   # Start Ollama service
   ollama serve

   # In another terminal, pull required models
   ollama pull mistral:7b
   ollama pull nomic-embed-text
   ```

3. **Setup database:**

   ```bash
   cd backend
   ./setup-db.sh
   ```

4. **Start the application:**
   ```bash
   # From project root
   ./start.sh
   ```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📖 Adding Your Educational Content

To add your PDF educational materials:

1. **Place PDF files** in the `backend/sample-pdfs/` directory (or create your own directory)

2. **Process the PDFs** to generate embeddings:

   ```bash
   cd backend
   npm run process-pdfs ./sample-pdfs "Mathematics"
   ```

3. **The system will**:
   - Extract text from PDFs
   - Chunk content for optimal retrieval
   - Generate embeddings using Ollama
   - Store in PostgreSQL with vector search

### Example Usage

```bash
# Process math textbooks
npm run process-pdfs ./pdfs/math "Quadratic Equations"

# Process chemistry materials
npm run process-pdfs ./pdfs/chemistry "Chemical Reactions"

# Process general study materials
npm run process-pdfs ./pdfs/general "General Studies"
```

## 🎯 Usage

### Chat Tab

1. Select a topic from the dropdown
2. Ask questions related to your uploaded content
3. The AI will provide contextual answers using **Class 10 CBSE focused prompts**
4. System adapts based on your performance and knowledge gaps

### Quiz Tab

1. Choose a topic and difficulty level
2. Click "Generate Question" for an AI-created question
3. Select your answer and get immediate feedback
4. **Adaptive difficulty**: System automatically adjusts based on your performance:
   - 2+ wrong answers → easier questions
   - 2+ correct answers → harder questions
5. View explanations with Indian context examples

## 🧠 Adaptive Learning Features

### Smart System Prompts

- **Class 10 CBSE focused**: Tailored for Indian curriculum
- **Performance tracking**: Monitors mastery level and knowledge gaps
- **Socratic method**: Guides discovery rather than giving direct answers
- **Indian context**: Uses cricket, festivals, and local examples

### Adaptive Quiz System

- **Dynamic difficulty**: Adjusts based on recent performance
- **Performance tracking**: Records answer patterns
- **Misconception identification**: Helps identify and correct knowledge gaps
- **Encouraging feedback**: Positive reinforcement for motivation

## 🛠️ API Endpoints

### Chat

- `POST /api/chat` - Send message and get AI response
- `GET /api/chat/history/:sessionId` - Get chat history

### Quiz

- `POST /api/quiz/generate` - Generate new quiz question
- `POST /api/quiz/submit` - Submit answer and get feedback

### Health

- `GET /health` - Service health check

## 📁 Project Structure

```
ai-tutor-prototype/
├── backend/
│   ├── src/
│   │   ├── db/          # Database client and schema
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic (Ollama, RAG, PDF, Quiz)
│   │   ├── scripts/     # Utility scripts (PDF processing)
│   │   └── types/       # TypeScript type definitions
│   ├── sample-pdfs/     # Directory for PDF content
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (ChatTab, QuizTab)
│   │   ├── service/     # API client
│   │   └── assets/      # Static assets
│   └── package.json
└── start.sh            # Quick start script
```

## 🧪 Testing

1. **Test the chat functionality:**

   - Upload some educational PDFs
   - Process them using the script
   - Ask questions related to the content
   - Verify contextual responses

2. **Test quiz generation:**

   - Select different topics and difficulty levels
   - Generate multiple questions
   - Verify question quality and explanations

3. **Test RAG system:**
   - Ask specific questions about uploaded content
   - Verify answers match the source material
   - Test with different topics

## ⚙️ Configuration

Key configuration options:

- **Database**: `backend/src/db/client.ts`
- **Ollama URL**: `backend/src/services/ollama.ts`
- **Frontend API**: `frontend/src/service/api.ts`

## 🔧 Troubleshooting

### Common Issues

1. **"Connection refused" errors**:

   - Ensure Ollama is running: `ollama serve`
   - Check PostgreSQL is running: `sudo systemctl status postgresql`

2. **"Model not found" errors**:

   - Pull required models: `ollama pull mistral:7b` and `ollama pull nomic-embed-text`

3. **Database connection issues**:

   - Run the database setup script: `cd backend && ./setup-db.sh`
   - Verify pgvector extension is installed

4. **Empty responses from chat**:
   - Ensure you've processed PDF content using `npm run process-pdfs`
   - Check that content was stored in database

## 📈 Future Enhancements

This prototype can be extended with:

- **User authentication** and personal learning profiles
- **Progress tracking** and learning analytics
- **Advanced question types** (multi-select, fill-in-blank)
- **Adaptive difficulty** based on user performance
- **Support for more file formats** (Word, PowerPoint, etc.)
- **Multi-language support**
- **Learning path recommendations**

## 📝 License

This project is for educational and prototype purposes. Feel free to modify and extend for your needs.

---

**Happy Learning! 🎓✨**

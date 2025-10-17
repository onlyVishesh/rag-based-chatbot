#!/bin/bash

echo "AI Tutor Prototype Setup & Start Script"
echo "========================================="

# Check if Ollama is running
echo "Checking Ollama service..."
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "Ollama is not running! Please start Ollama first:"
    echo "   ollama serve"
    exit 1
fi

# Check if required models are installed
echo "Checking AI models..."
if ! ollama list | grep -q "mistral"; then
    echo "⚠️  Mistral model not found. Installing..."
    ollama pull mistral:7b
fi

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "⚠️  Embedding model not found. Installing..."
    ollama pull nomic-embed-text
fi

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running! Please start PostgreSQL first"
    exit 1
fi

# Initialize database tables
echo "Setting up database tables..."

# Check if database exists, create if not
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw ai_tutor_dev; then
    echo "Creating database ai_tutor_dev..."
    createdb -U postgres ai_tutor_dev
fi

# Run schema files
echo "Initializing tables..."
cd backend
psql -U postgres -d ai_tutor_dev -f src/db/schema.sql
psql -U postgres -d ai_tutor_dev -f src/db/adaptive_schema.sql

# Process PDF content
echo "Processing PDF content..."
pnpm run process-pdfs ./sample-pdfs/QUADRATIC\ EQUATIONS "quadratic equations"    
pnpm run process-pdfs ./sample-pdfs/POLYNOMIALS "polynomials"  

echo "All prerequisites are ready!"
echo ""
echo "Starting services..."

# Start backend in background
echo "Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend  
npm run dev &
FRONTEND_PID=$!

echo ""
echo "AI Tutor Prototype is starting!"
echo ""
echo "Services:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "To add your PDF content:"
echo "   cd backend"
echo "   npm run process-pdfs ./sample-pdfs 'Your Topic'"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for user to stop
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
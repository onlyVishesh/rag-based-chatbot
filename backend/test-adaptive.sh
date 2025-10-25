#!/bin/bash

echo "🧠 Testing AI Chatbot Adaptive System"
echo "=================================="

# Apply the adaptive schema (if not already done)
echo "📊 Setting up adaptive tracking..."
psql -d ai_tutor_dev -f src/db/adaptive_schema.sql

echo ""
echo "✅ Adaptive AI Chatbot System Ready!"
echo ""
echo "🎯 New Features Added:"
echo "   • Smart system prompts for chat (Class 10 CBSE focused)"
echo "   • Adaptive quiz difficulty based on performance"
echo "   • Performance tracking with Indian context"
echo "   • Socratic teaching method implementation"
echo ""
echo "📚 How it works:"
echo "   📝 Chat: Uses context-aware prompts with student mastery level"
echo "   🧠 Quiz: Automatically adjusts difficulty based on recent answers"
echo "   📈 Adaptive: 2+ wrong = easier questions, 2+ right = harder questions"
echo "   🇮🇳 Context: Uses Indian examples (cricket, festivals, local references)"
echo ""
echo "🚀 Start the servers and test with your polynomial/quadratic equations data!"
echo ""
echo "📋 Topics available:"
npm run db-manage list
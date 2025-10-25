import { query } from "../db/client";

export interface UserContext {
  sessionId: number;
  topic: string;
  subject: string;
  mastery: number;
  gaps: string[];
  correctCount: number;
  totalCount: number;
  currentDifficulty: "easy" | "medium" | "hard";
  recentPerformance: { correct: boolean; question: string; timestamp: Date }[];
  conversationHistory: {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }[];
}

export interface QuizContext extends UserContext {
  consecutiveCorrect: number;
  consecutiveWrong: number;
  lastQuestions: {
    question: string;
    userAnswer: string;
    correct: boolean;
    difficulty: string;
  }[];
}

/**
 * Get or create user context for chat sessions
 */
export async function getChatContext(
  sessionId: number,
  topic: string
): Promise<UserContext> {
  try {
    // Get session info
    const sessionResult = await query(
      "SELECT * FROM chat_sessions WHERE id = $1",
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error("Session not found");
    }

    // Get conversation history
    const historyResult = await query(
      `SELECT role, content, created_at 
       FROM chat_messages 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [sessionId]
    );

    // Get recent quiz performance for mastery calculation
    const quizResult = await query(
      `SELECT correct_answers, total_questions 
       FROM quiz_sessions 
       WHERE topic = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [topic]
    );

    // Calculate mastery and performance
    let totalCorrect = 0;
    let totalQuestions = 0;

    quizResult.rows.forEach((row) => {
      totalCorrect += row.correct_answers || 0;
      totalQuestions += row.total_questions || 0;
    });

    const mastery =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;
    const gaps = identifyKnowledgeGaps(mastery, topic);

    return {
      sessionId,
      topic,
      subject: getSubjectFromTopic(topic),
      mastery,
      gaps,
      correctCount: totalCorrect,
      totalCount: totalQuestions,
      currentDifficulty: getDifficultyFromMastery(mastery),
      recentPerformance: [],
      conversationHistory: historyResult.rows.map((row) => ({
        role: row.role,
        content: row.content,
        timestamp: new Date(row.created_at),
      })),
    };
  } catch (error) {
    console.error("Error getting chat context:", error);
    // Return default context
    return {
      sessionId,
      topic,
      subject: getSubjectFromTopic(topic),
      mastery: 0,
      gaps: ["Basic concepts"],
      correctCount: 0,
      totalCount: 0,
      currentDifficulty: "easy",
      recentPerformance: [],
      conversationHistory: [],
    };
  }
}

/**
 * Get or create quiz context with adaptive difficulty
 */
export async function getQuizContext(
  sessionId: number,
  topic: string
): Promise<QuizContext> {
  try {
    // Create default context for quiz-only sessions
    let baseContext: UserContext = {
      sessionId,
      topic,
      subject: "Mathematics", // Default subject
      mastery: 50, // Default mastery level
      gaps: [],
      correctCount: 0,
      totalCount: 0,
      currentDifficulty: "medium" as const,
      recentPerformance: [],
      conversationHistory: [],
    };

    // Try to get chat context if available, but don't fail if not found
    try {
      baseContext = await getChatContext(sessionId, topic);
    } catch (error) {
      // This is expected when generating quiz without prior chat session
      // Using default context for quiz-only sessions
    }

    // Get recent quiz session performance
    const recentQuizResult = await query(
      `SELECT qs.*, 
              COUNT(CASE WHEN qa.is_correct = true THEN 1 END) as recent_correct,
              COUNT(CASE WHEN qa.is_correct = false THEN 1 END) as recent_wrong
       FROM quiz_sessions qs
       LEFT JOIN quiz_answers qa ON qs.id = qa.session_id
       WHERE qs.topic = $1 
       GROUP BY qs.id, qs.topic, qs.difficulty, qs.total_questions, qs.correct_answers, qs.created_at, qs.user_identifier
       ORDER BY qs.created_at DESC 
       LIMIT 1`,
      [topic]
    );

    let consecutiveCorrect = 0;
    let consecutiveWrong = 0;

    if (recentQuizResult.rows.length > 0) {
      // Get last few answers to check consecutive performance
      const lastAnswersResult = await query(
        `SELECT is_correct, qa.created_at 
         FROM quiz_answers qa
         JOIN quiz_sessions qs ON qa.session_id = qs.id
         WHERE qs.topic = $1 
         ORDER BY qa.created_at DESC 
         LIMIT 5`,
        [topic]
      );

      // Count consecutive correct/wrong from most recent
      let consecutive = 0;
      let isCorrectStreak = null;

      for (const answer of lastAnswersResult.rows) {
        if (isCorrectStreak === null) {
          isCorrectStreak = answer.is_correct;
          consecutive = 1;
        } else if (answer.is_correct === isCorrectStreak) {
          consecutive++;
        } else {
          break;
        }
      }

      if (isCorrectStreak) {
        consecutiveCorrect = consecutive;
      } else {
        consecutiveWrong = consecutive;
      }
    }

    return {
      ...baseContext,
      consecutiveCorrect,
      consecutiveWrong,
      lastQuestions: [],
    };
  } catch (error) {
    console.error("Error getting quiz context:", error);
    const baseContext = await getChatContext(sessionId, topic);
    return {
      ...baseContext,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      lastQuestions: [],
    };
  }
}

/**
 * Calculate adaptive difficulty based on performance
 */
export function getAdaptiveDifficulty(
  consecutiveCorrect: number,
  consecutiveWrong: number,
  currentDifficulty: "easy" | "medium" | "hard"
): "easy" | "medium" | "hard" {
  // If 2+ wrong answers, decrease difficulty
  if (consecutiveWrong >= 2) {
    if (currentDifficulty === "hard") return "medium";
    if (currentDifficulty === "medium") return "easy";
    return "easy"; // already at minimum
  }

  // If 2+ correct answers, increase difficulty
  if (consecutiveCorrect >= 2) {
    if (currentDifficulty === "easy") return "medium";
    if (currentDifficulty === "medium") return "hard";
    return "hard"; // already at maximum
  }

  // No change needed
  return currentDifficulty;
}

/**
 * Generate chat system prompt
 */
export function generateChatSystemPrompt(
  context: UserContext,
  retrievedContent: string[]
): string {
  const contextSection =
    retrievedContent.length > 0
      ? `AVAILABLE CURRICULUM CONTENT:
${retrievedContent
  .map((content, i) => `[Content ${i + 1}]: ${content}`)
  .join("\n\n")}

IMPORTANT: Only use the above content if it's directly relevant to the student's question.

`
      : `CURRICULUM STATUS: No curriculum content found for this question.

IMPORTANT: This likely means the student is asking about a topic different from the selected session topic "${context.topic}". You MUST redirect them appropriately.

`;

  const conversationHistory = context.conversationHistory
    .slice(-6) // Last 3 exchanges
    .map(
      (msg) => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`
    )
    .join("\n");

  console.log(`${contextSection}You are a supportive AI Chatbot helping a Class 10 CBSE student learn ${
    context.topic
  } in ${context.subject}.

STUDENT CONTEXT:
- Mastery level: ${context.mastery}%
- Knowledge gaps: ${context.gaps.join(", ")}
- Recent performance: ${context.correctCount}/${context.totalCount} correct
- Current difficulty level: ${context.currentDifficulty}

TEACHING APPROACH:
1. For struggling students (mastery < 50%): Focus on fundamentals, use simple examples
2. For average students (mastery 50-80%): Provide balanced explanations with practice
3. For advanced students (mastery > 80%): Challenge with complex problems and connections
4. Use Socratic method - guide discovery through questions, don't give direct answers
5. Use Indian context (cricket scores for statistics, festival dates for calculations, local examples)
6. Connect concepts to real-world applications students can relate to
7. If no relevant curriculum content is available, provide general educational guidance based on CBSE Class 10 standards

RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences for simple questions, 4-5 for complex explanations)
- Use encouraging, patient language especially for struggling students
- Adjust complexity based on mastery level
- If student seems confused, break down concepts into smaller steps
- Celebrate progress and correct understanding

CRITICAL RULE - TOPIC BOUNDARIES:
If no curriculum content was found (empty content status above), this indicates the student is asking about a different topic than "${
    context.topic
  }". In this case, you MUST:

1. DO NOT provide a detailed answer about the off-topic question
2. Politely acknowledge their question but explain you're focused on "${
    context.topic
  }"
3. Suggest they either:
   - Change their topic selection to match their question, OR
   - Ask questions related to "${context.topic}" instead

Example response for off-topic questions:
"I see you're asking about [different topic], but our current session is focused on ${
    context.topic
  }. To get help with [different topic], please change your topic selection above, or feel free to ask me anything about ${
    context.topic
  }!"

CONVERSATION HISTORY:
${conversationHistory}

Remember: Your goal is to guide the student to understand concepts deeply, not just memorize formulas. If specific curriculum content isn't available for the topic, provide helpful general educational guidance appropriate for Class 10 CBSE level.`);

  return `${contextSection}You are a supportive AI Chatbot helping a Class 10 CBSE student learn ${
    context.topic
  } in ${context.subject}.

STUDENT CONTEXT:
- Mastery level: ${context.mastery}%
- Knowledge gaps: ${context.gaps.join(", ")}
- Recent performance: ${context.correctCount}/${context.totalCount} correct
- Current difficulty level: ${context.currentDifficulty}

TEACHING APPROACH:
1. For struggling students (mastery < 50%): Focus on fundamentals, use simple examples
2. For average students (mastery 50-80%): Provide balanced explanations with practice
3. For advanced students (mastery > 80%): Challenge with complex problems and connections
4. Use Socratic method - guide discovery through questions, don't give direct answers
5. Use Indian context (cricket scores for statistics, festival dates for calculations, local examples)
6. Connect concepts to real-world applications students can relate to
7. If no relevant curriculum content is available, provide general educational guidance based on CBSE Class 10 standards

RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences for simple questions, 4-5 for complex explanations)
- Use encouraging, patient language especially for struggling students
- Adjust complexity based on mastery level
- If student seems confused, break down concepts into smaller steps
- Celebrate progress and correct understanding

CRITICAL RULE - TOPIC BOUNDARIES:
If no curriculum content was found (empty content status above), this indicates the student is asking about a different topic than "${
    context.topic
  }". In this case, you MUST:

1. DO NOT provide a detailed answer about the off-topic question
2. Politely acknowledge their question but explain you're focused on "${
    context.topic
  }"
3. Suggest they either:
   - Change their topic selection to match their question, OR
   - Ask questions related to "${context.topic}" instead

Example response for off-topic questions:
"I see you're asking about [different topic], but our current session is focused on ${
    context.topic
  }. To get help with [different topic], please change your topic selection above, or feel free to ask me anything about ${
    context.topic
  }!"

CONVERSATION HISTORY:
${conversationHistory}

Remember: Your goal is to guide the student to understand concepts deeply, not just memorize formulas. If specific curriculum content isn't available for the topic, provide helpful general educational guidance appropriate for Class 10 CBSE level.`;
}

/**
 * Generate quiz system prompt with adaptive difficulty
 */
export function generateQuizSystemPrompt(context: QuizContext): string {
  const adaptiveDifficulty = getAdaptiveDifficulty(
    context.consecutiveCorrect,
    context.consecutiveWrong,
    context.currentDifficulty
  );

  const performanceAnalysis = analyzePerformance(context);

  return `You are an adaptive quiz generator for Class 10 CBSE ${
    context.subject
  }, specifically for ${context.topic}.

STUDENT PERFORMANCE ANALYSIS:
- Current mastery: ${context.mastery}%
- Consecutive correct: ${context.consecutiveCorrect}
- Consecutive wrong: ${context.consecutiveWrong}
- Adaptive difficulty: ${adaptiveDifficulty}
- Performance trend: ${performanceAnalysis}

ADAPTIVE DIFFICULTY RULES:
- Current level: ${adaptiveDifficulty}
- 2+ correct answers → increase difficulty (easy→medium→hard)
- 2+ wrong answers → decrease difficulty (hard→medium→easy)
- Questions should match ${adaptiveDifficulty} level complexity

QUESTION GENERATION GUIDELINES:
For ${adaptiveDifficulty} difficulty:
${getDifficultyGuidelines(adaptiveDifficulty, context.topic)}

QUESTION FORMAT:
Generate a multiple-choice question following this EXACT format:

QUESTION: [Clear, specific question about ${context.topic}]
A) [First option]
B) [Second option] 
C) [Third option]
D) [Fourth option]
ANSWER: [A, B, C, or D]
EXPLANATION: [Clear explanation connecting to CBSE curriculum, mentioning why other options are incorrect]

IMPORTANT:
- Ensure question aligns with CBSE Class 10 ${context.subject} syllabus
- Use Indian context in word problems (Indian currency, cricket, festivals)
- Make incorrect options plausible but clearly wrong
- Explanation should reinforce learning, not just state the answer
- For struggling students, include helpful hints in explanation`;
}

/**
 * Helper functions
 */
function getSubjectFromTopic(topic: string): string {
  const mathTopics = [
    "quadratic",
    "polynomial",
    "algebra",
    "geometry",
    "trigonometry",
    "statistics",
  ];
  const scienceTopics = ["chemical", "physics", "biology", "chemistry"];

  const topicLower = topic.toLowerCase();

  if (mathTopics.some((keyword) => topicLower.includes(keyword))) {
    return "Mathematics";
  }
  if (scienceTopics.some((keyword) => topicLower.includes(keyword))) {
    return "Science";
  }
  return "General Studies";
}

function getDifficultyFromMastery(mastery: number): "easy" | "medium" | "hard" {
  if (mastery < 40) return "easy";
  if (mastery < 75) return "medium";
  return "hard";
}

function identifyKnowledgeGaps(mastery: number, topic: string): string[] {
  if (mastery < 30) {
    return ["Basic concepts", "Fundamental formulas", "Simple calculations"];
  }
  if (mastery < 60) {
    return ["Application problems", "Multi-step solutions"];
  }
  if (mastery < 85) {
    return ["Complex problem-solving", "Concept connections"];
  }
  return ["Advanced applications", "Examination techniques"];
}

function analyzePerformance(context: QuizContext): string {
  if (context.consecutiveCorrect >= 2)
    return "Improving - ready for harder questions";
  if (context.consecutiveWrong >= 2)
    return "Struggling - needs concept reinforcement";
  if (context.mastery > 80) return "Strong - maintaining high performance";
  if (context.mastery < 40) return "Developing - building foundational skills";
  return "Steady - consistent learning progress";
}

function getDifficultyGuidelines(
  difficulty: "easy" | "medium" | "hard",
  topic: string
): string {
  switch (difficulty) {
    case "easy":
      return `- Focus on basic definitions and simple calculations
- Use direct application of formulas
- Single-step problems with clear solutions
- Avoid complex multi-part questions`;

    case "medium":
      return `- Include 2-3 step problem solving
- Combine multiple concepts within ${topic}
- Include some application-based word problems
- Require understanding beyond memorization`;

    case "hard":
      return `- Multi-step complex problems
- Integration of multiple concepts
- Real-world application scenarios
- Require deep conceptual understanding and analysis`;

    default:
      return "- Standard CBSE level questions";
  }
}

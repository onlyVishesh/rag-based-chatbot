import { useState } from "react";
import "./App.css";
import { ChatTab } from "./components/ChatTab";
import { QuizTab } from "./components/QuizTab";

type TabType = "chat" | "quiz";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎓 AI Tutor Prototype</h1>
        <p>
          Chat with AI and take adaptive quizzes based on your study materials
        </p>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          💬 Chat
        </button>
        <button
          className={`tab-button ${activeTab === "quiz" ? "active" : ""}`}
          onClick={() => setActiveTab("quiz")}
        >
          🧠 Quiz
        </button>
      </nav>

      <main className="tab-content">
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "quiz" && <QuizTab />}
      </main>
    </div>
  );
}

export default App;

import { useState } from "react";
import type { ChatMessage } from "../service/api";
import { sendChatMessage } from "../service/api";

export function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("Quadratic Equations");
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendChatMessage(input, topic, sessionId);

      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      alert("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>AI Chatbot Chat</h2>

      {/* Topic Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Topic: </strong>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            <option>Quadratic Equations</option>
            <option>Polynomials</option>
            <option>Probability</option>
            <option>Trigonometry</option>
            <option>Chemical Reactions</option>
            <option>Physics</option>
            <option>Biology</option>
            <option>General Math</option>
          </select>
        </label>
        <small style={{ display: "block", color: "#666", marginTop: "5px" }}>
          Note: Currently only Quadratic Equations and Polynomials have
          curriculum content loaded
        </small>
      </div>

      {/* Chat Messages */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "15px",
          height: "400px",
          overflowY: "scroll",
          marginBottom: "15px",
          backgroundColor: "#f9f9f9",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#999", textAlign: "center" }}>
            Start chatting with your AI Chatbot...
          </p>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "12px",
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: msg.role === "user" ? "#007bff" : "#fff",
              color: msg.role === "user" ? "#fff" : "#000",
              maxWidth: "80%",
              marginLeft: msg.role === "user" ? "auto" : "0",
              border: msg.role === "assistant" ? "1px solid #ddd" : "none",
            }}
          >
            <strong>{msg.role === "user" ? "You" : "AI Chatbot"}:</strong>
            <p style={{ margin: "5px 0 0 0" }}>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: "center", color: "#999" }}>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question..."
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            borderRadius: "6px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

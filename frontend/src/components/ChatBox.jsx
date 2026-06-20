import { useEffect, useRef, useState } from "react";
import { ask } from "../api.js";

const SUGGESTIONS = [
  "Who are you?",
  "Show me your projects",
  "What are your skills?",
  "How can I contact you?",
];

export default function ChatBox({ onResponse }) {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'm Geen Malaguena's avatar. Ask me about Geen Malaguena, the projects, skills, or contact info.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(question) {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { from: "user", text: q, sources: [] }]);
    setInput("");
    setLoading(true);

    try {
      const data = await ask(q);
      setMessages((m) => [
        ...m,
        { from: "bot", text: data.answer, sources: data.sources ?? [] },
      ]);
      onResponse?.(data);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: "I couldn't reach my brain (the backend). Make sure the Python server is running on port 8000.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="chatbox">
      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.from}`}>
            <div>{m.text}</div>
            {m.sources?.length > 0 && (
              <div className="source-list" aria-label="Sources">
                {m.sources.map((source, sourceIndex) => (
                  <span
                    className="source-chip"
                    key={`${source.file}-${sourceIndex}`}
                    title={source.snippet}
                  >
                    {formatSource(source)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-msg bot typing">typing...</div>}
      </div>

      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="Ask me anything..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function formatSource(source) {
  const parts = [source.title || source.file];
  if (source.page) parts.push(`p. ${source.page}`);
  if (source.section && source.section !== source.title) parts.push(source.section);
  return parts.join(" / ");
}

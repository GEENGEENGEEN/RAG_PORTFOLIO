import { useEffect, useRef, useState } from "react";
import { ask } from "../api.js";
import { cancelSpeech, isSupported, speak } from "../tts.js";
import storyIcon from "../icons/performing-arts.svg";
import workIcon from "../icons/rocket.svg";
import buildIcon from "../icons/settings.svg";
import collabIcon from "../icons/handshake.svg";

// Conversation starters shown as cards. `query` is what we actually send to
// the backend; `label` is what the user sees.
const STARTERS = [
  { label: "Tell me your story", query: "Tell me your story", icon: storyIcon },
  { label: "Show me your work", query: "Show me your projects", icon: workIcon },
  {
    label: "What are you building?",
    query: "What are you building?",
    icon: buildIcon,
    invert: true,
  },
  {
    label: "Let us collaborate",
    query: "How can I contact you?",
    icon: collabIcon,
  },
];

export default function ChatBox({ onResponse }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Whether responses are read aloud (only relevant if the browser supports it).
  const ttsSupported = isSupported();
  const [speechOn, setSpeechOn] = useState(ttsSupported);
  const logRef = useRef(null);
  // How many action gestures (wave/walk/run) we've performed this session.
  const actionCount = useRef(0);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Stop any in-progress speech when the component unmounts.
  useEffect(() => cancelSpeech, []);

  function toggleSpeech() {
    setSpeechOn((on) => {
      if (on) cancelSpeech();
      return !on;
    });
  }

  async function send(question) {
    const q = question.trim();
    if (!q || loading) return;

    // A new question interrupts whatever is currently being spoken.
    cancelSpeech();

    setMessages((m) => [...m, { from: "user", text: q, sources: [] }]);
    setInput("");
    setLoading(true);

    try {
      let data = await ask(q);

      // After three action gestures in a session, refuse further ones and
      // don't play the animation.
      if (data.gesture) {
        if (actionCount.current >= 3) {
          data = {
            ...data,
            gesture: null,
            answer: "No. I've done enough of that for now!",
          };
        } else {
          actionCount.current += 1;
        }
      }

      setMessages((m) => [
        ...m,
        { from: "bot", text: data.answer, sources: data.sources ?? [] },
      ]);
      // Speak exactly what is shown (after any refusal rewrite above).
      if (speechOn) speak(data.answer);
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

  const hasConversation = messages.length > 0 || loading;

  return (
    <section className="conversation">
      {hasConversation && (
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
      )}

      <div className="conversation-head">
        <span className="section-label">START A CONVERSATION</span>
        {ttsSupported && (
          <button
            type="button"
            className={`speech-toggle${speechOn ? " is-on" : ""}`}
            onClick={toggleSpeech}
            aria-pressed={speechOn}
            title={speechOn ? "Mute responses" : "Read responses aloud"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {speechOn ? (
                <path
                  fill="currentColor"
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"
                />
              ) : (
                <path
                  fill="currentColor"
                  d="M3 9v6h4l5 5V4L7 9H3zm18.29-.71L19.88 6.88 17.7 9.06l-2.18-2.18-1.41 1.41L16.29 10.47l-2.18 2.18 1.41 1.41 2.18-2.18 2.18 2.18 1.41-1.41-2.18-2.18 2.18-2.18z"
                />
              )}
            </svg>
            <span>{speechOn ? "Voice on" : "Voice off"}</span>
          </button>
        )}
      </div>

      <div className="starter-grid">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            className="starter"
            onClick={() => send(s.query)}
            disabled={loading}
          >
            <img
              className={`starter-icon${s.invert ? " is-mono" : ""}`}
              src={s.icon}
              alt=""
              aria-hidden="true"
            />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="What would you like to know..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 11l18-8-8 18-2-7-8-3z" />
          </svg>
          Send
        </button>
      </form>

      <p className="composer-hint">
        Press Enter or click Send to send your message
      </p>
    </section>
  );
}

function formatSource(source) {
  const parts = [source.title || source.file];
  if (source.page) parts.push(`p. ${source.page}`);
  if (source.section && source.section !== source.title)
    parts.push(source.section);
  return parts.join(" / ");
}

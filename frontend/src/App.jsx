import { useCallback, useRef, useState } from "react";
import Scene from "./scene/Scene.jsx";
import ChatBox from "./components/ChatBox.jsx";
import ProjectPaper from "./components/ProjectPaper.jsx";

// How long each action gesture plays before the avatar returns to idle (ms).
// `dance` should match the keyframe routine length in Character.jsx
// (ROUTINE_DURATION, currently ~8s). Bump this if you extend the routine.
const GESTURE_DURATION = { wave: 3500, walk: 5000, run: 5000, dance: 8000 };

export default function App() {
  // "idle" | "handing" | "wave" | "walk" | "run" | "dance" drives the character.
  const [gesture, setGesture] = useState("idle");
  const [projects, setProjects] = useState(null);
  const [paperVisible, setPaperVisible] = useState(false);

  // Used to clear any pending timeout if questions come quickly.
  const handTimer = useRef(null);
  const gestureTimer = useRef(null);

  // Called by ChatBox whenever the backend responds.
  const handleResponse = useCallback((data) => {
    if (data.action === "show_projects" && data.projects?.length) {
      setProjects(data.projects);

      // The hand-off takes priority over any action gesture.
      clearTimeout(gestureTimer.current);

      // Trigger the gesture; reveal the paper slightly after the arm starts
      // moving so the timing feels like a hand-off.
      setGesture("handing");
      clearTimeout(handTimer.current);
      handTimer.current = setTimeout(() => setPaperVisible(true), 600);
      return;
    }

    // Action gestures (wave/walk/run): play for a bit, then return to idle.
    const duration = GESTURE_DURATION[data.gesture];
    if (duration) {
      setGesture(data.gesture);
      clearTimeout(gestureTimer.current);
      gestureTimer.current = setTimeout(() => setGesture("idle"), duration);
    }
  }, []);

  const closePaper = useCallback(() => {
    setPaperVisible(false);
    setGesture("idle");
  }, []);

  return (
    <div className="app">
      <main className="landing">
        <section className="hero-grid">
          <div className="avatar-card">
            <Scene gesture={gesture} />
          </div>

          <div className="intro">
            <span className="eyebrow">
              <svg
                className="eyebrow-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zM5 14l.9 2.5L8.5 17l-2.6.9L5 20.5 4.1 18 1.5 17l2.6-.5L5 14zm13 0l.9 2.5L21.5 17l-2.6.9L18 20.5 17.1 18 14.5 17l2.6-.5L18 14z"
                />
              </svg>
              Meet Geenior
            </span>

            <h1>My Digital Twinny</h1>

            <p className="lede">
              Curious about who I am? Wondering what I&apos;ve created? Want to
              explore possibilities? Ask me anything and discover what we can
              build together.
            </p>

            <div className="stats">
              <div className="stat">
                <span className="stat-num">50+</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat">
                <span className="stat-num">15+</span>
                <span className="stat-label">Technologies</span>
              </div>
              <div className="stat">
                <span className="stat-num">&#8734;</span>
                <span className="stat-label">Ideas</span>
              </div>
            </div>
          </div>
        </section>

        <ChatBox onResponse={handleResponse} />
      </main>

      <ProjectPaper
        projects={projects}
        visible={paperVisible}
        onClose={closePaper}
      />
    </div>
  );
}

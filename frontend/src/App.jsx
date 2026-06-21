import { useCallback, useRef, useState } from "react";
import Scene from "./scene/Scene.jsx";
import ChatBox from "./components/ChatBox.jsx";
import ProjectPaper from "./components/ProjectPaper.jsx";

// How long each action gesture plays before the avatar returns to idle (ms).
const GESTURE_DURATION = { wave: 3500, walk: 5000, run: 5000 };

export default function App() {
  // "idle" | "handing" | "wave" | "walk" | "run" drives the character.
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
      <Scene gesture={gesture} />

      <header className="hero">
        <h1>Geen Malaguena</h1>
        <p>Ask my avatar anything</p>
      </header>

      <ChatBox onResponse={handleResponse} />

      <ProjectPaper
        projects={projects}
        visible={paperVisible}
        onClose={closePaper}
      />
    </div>
  );
}

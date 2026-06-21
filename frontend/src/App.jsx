import { useCallback, useRef, useState } from "react";
import Scene from "./scene/Scene.jsx";
import ChatBox from "./components/ChatBox.jsx";
import ProjectPaper from "./components/ProjectPaper.jsx";

export default function App() {
  // "idle" | "handing" drives the character's arm-extend gesture.
  const [gesture, setGesture] = useState("idle");
  const [projects, setProjects] = useState(null);
  const [paperVisible, setPaperVisible] = useState(false);

  // Used to clear any pending timeout if questions come quickly.
  const handTimer = useRef(null);

  // Called by ChatBox whenever the backend responds.
  const handleResponse = useCallback((data) => {
    if (data.action === "show_projects" && data.projects?.length) {
      setProjects(data.projects);

      // Trigger the gesture; reveal the paper slightly after the arm starts
      // moving so the timing feels like a hand-off.
      setGesture("handing");
      clearTimeout(handTimer.current);
      handTimer.current = setTimeout(() => setPaperVisible(true), 600);
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

// The "paper" the character hands over: a styled card listing projects + links.
export default function ProjectPaper({ projects, visible, onClose }) {
  return (
    <div
      className={`paper-backdrop ${visible ? "visible" : ""}`}
      onClick={onClose}
    >
      <div className="paper" onClick={(e) => e.stopPropagation()}>
        <button className="paper-close" onClick={onClose} aria-label="Close">
          x
        </button>
        <h2>My Projects</h2>
        <p className="paper-sub">A few things I've built - handed to you.</p>

        {projects?.map((p) => (
          <div className="project" key={p.name}>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <a href={p.url} target="_blank" rel="noreferrer">
              View project -&gt;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

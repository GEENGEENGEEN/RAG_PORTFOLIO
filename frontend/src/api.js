// Small wrapper around the Python backend's /ask endpoint.
// Override the base URL at build time with VITE_API_BASE if needed.
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function ask(question) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }

  return res.json(); // { answer, action, projects }
}

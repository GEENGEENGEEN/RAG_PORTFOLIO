# Geen Malaguena RAG Portfolio

An interactive portfolio where a low-poly 3D avatar answers visitor questions
with a Gemini-powered RAG backend. The frontend stays chat-first and playful;
the backend can retrieve from local portfolio documents and return compact
source citations.

```
portfolio/
  backend/
    knowledge.py          # structured profile/project/contact fallback data
    knowledge_base/       # markdown, text, and PDF source docs for RAG
    rag_indexer.py        # builds the local vector index with Gemini embeddings
    rag_engine.py         # retrieves chunks and asks Gemini for grounded answers
    main.py               # FastAPI app with POST /ask
  frontend/
    src/                  # Vite + React + React Three Fiber portfolio UI
```

## How It Works

1. A visitor asks a question in the React chat box.
2. The frontend calls `POST /ask`.
3. The backend tries Gemini RAG:
   - embed the question,
   - retrieve matching chunks from `rag_index.json`,
   - ask Gemini to answer using only that portfolio context.
4. The frontend shows the answer and any returned source chips.
5. Project-related questions still trigger the avatar paper handoff.

If the Gemini key or index is missing, the backend falls back to the original
rule-based answers so local development still works.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A Gemini API key for RAG indexing and generation

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `GEMINI_API_KEY` in your shell or `.env` workflow before indexing/running
RAG. PowerShell example:

```powershell
$env:GEMINI_API_KEY="your_key_here"
python rag_indexer.py
uvicorn main:app --reload
```

Backend runs at http://localhost:8000. Interactive API docs are at `/docs`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open the printed Vite URL, usually http://localhost:5173.

## Updating Portfolio Knowledge

Edit structured fallback content in `backend/knowledge.py`.

Add or update RAG source documents in `backend/knowledge_base/`:

- `.md`
- `.txt`
- `.pdf`

After editing source documents, rebuild the index:

```bash
cd backend
python rag_indexer.py
```

The generated `backend/rag_index.json` is local build output and is ignored by
git.

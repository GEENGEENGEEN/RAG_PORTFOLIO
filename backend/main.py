"""FastAPI backend for the low-poly portfolio.

Exposes a single ``POST /ask`` endpoint that the React frontend calls. The
brain lives in ``qa_engine.py`` and the editable content in ``knowledge.py``.

Run with:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import knowledge
import qa_engine

app = FastAPI(title="Low-Poly Portfolio API", version="1.0.0")

# Allow the Vite dev server (and a couple common local origins) to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


class Project(BaseModel):
    name: str
    description: str
    url: str


class Source(BaseModel):
    title: str
    file: str
    section: str | None = None
    page: int | None = None
    snippet: str | None = None


class AskResponse(BaseModel):
    answer: str
    action: str | None = None
    projects: list[Project] | None = None
    sources: list[Source] = Field(default_factory=list)


@app.get("/")
def root() -> dict:
    return {"status": "ok", "name": knowledge.NAME, "message": "POST to /ask"}


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest) -> dict:
    return qa_engine.answer(payload.question)

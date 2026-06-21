"""Gemini-powered retrieval and answer generation for the portfolio."""

from __future__ import annotations

import json
import math
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - exercised before deps are installed
    genai = None
    types = None

import knowledge
from rag_indexer import EMBEDDING_MODEL, INDEX_PATH, Source


load_dotenv(Path(__file__).resolve().parent / ".env")

GENERATION_MODEL = os.getenv("GEMINI_GENERATION_MODEL", "gemini-3.5-flash")
TOP_K = int(os.getenv("RAG_TOP_K", "5"))
MIN_SIMILARITY = float(os.getenv("RAG_MIN_SIMILARITY", "0.25"))


class RagUnavailable(RuntimeError):
    """Raised when RAG cannot run and the caller should use a fallback."""


def _require_client():
    if genai is None or types is None:
        raise RagUnavailable("google-genai is not installed.")
    if not os.getenv("GEMINI_API_KEY"):
        raise RagUnavailable("GEMINI_API_KEY is not set.")
    return genai.Client()


@lru_cache(maxsize=1)
def _load_index(index_path: str = str(INDEX_PATH)) -> dict[str, Any]:
    path = Path(index_path)
    if not path.exists():
        raise RagUnavailable(
            "RAG index is missing. Run `python rag_indexer.py` from backend."
        )
    with path.open("r", encoding="utf-8") as index_file:
        payload = json.load(index_file)
    if not payload.get("chunks"):
        raise RagUnavailable("RAG index has no chunks.")
    return payload


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_mag = math.sqrt(sum(a * a for a in left))
    right_mag = math.sqrt(sum(b * b for b in right))
    if left_mag == 0 or right_mag == 0:
        return 0.0
    return dot / (left_mag * right_mag)


def _embed_query(question: str) -> list[float]:
    client = _require_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=[question],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return result.embeddings[0].values


def _retrieve(question: str) -> list[dict[str, Any]]:
    index = _load_index()
    query_embedding = _embed_query(question)

    scored_chunks = []
    for chunk in index["chunks"]:
        similarity = _cosine_similarity(query_embedding, chunk["embedding"])
        scored_chunks.append((similarity, chunk))

    scored_chunks.sort(key=lambda item: item[0], reverse=True)
    return [
        {**chunk, "similarity": similarity}
        for similarity, chunk in scored_chunks[:TOP_K]
        if similarity >= MIN_SIMILARITY
    ]


def _source_from_chunk(chunk: dict[str, Any]) -> dict[str, Any]:
    source = Source(**chunk["source"])
    return {
        "title": source.title,
        "file": source.file,
        "section": source.section,
        "page": source.page,
        "snippet": source.snippet,
    }


def _format_context(chunks: list[dict[str, Any]]) -> str:
    blocks = []
    for index, chunk in enumerate(chunks, start=1):
        source = chunk["source"]
        location = source["file"]
        if source.get("page"):
            location += f", page {source['page']}"
        if source.get("section"):
            location += f", {source['section']}"
        blocks.append(
            f"[Source {index}: {source['title']} | {location}]\n{chunk['text']}"
        )
    return "\n\n".join(blocks)


def _detect_action(question: str) -> str | None:
    normalized = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", question.lower()))
    project_words = {
        "project",
        "projects",
        "portfolio",
        "work",
        "built",
        "build",
        "created",
        "demo",
        "abay",
    }
    if any(re.search(rf"\b{re.escape(word)}\b", normalized) for word in project_words):
        return "show_projects"
    return None


def _generate_answer(question: str, chunks: list[dict[str, Any]]) -> str:
    client = _require_client()
    prompt = f"""
You are Geen Malaguena's low-poly portfolio avatar.

Answer the visitor using only the portfolio context below. Be concise, friendly,
and professional. Do not invent projects, links, work history, credentials, or
contact details. If the context does not contain enough information, say you do
not know and suggest asking about Geen's projects, skills, experience, or
contact info.

Portfolio context:
{_format_context(chunks)}

Visitor question:
{question}
""".strip()

    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=prompt,
    )
    return (response.text or "").strip()


def answer(question: str) -> dict[str, Any]:
    chunks = _retrieve(question)
    if not chunks:
        raise RagUnavailable("No relevant portfolio context was retrieved.")

    answer_text = _generate_answer(question, chunks)
    if not answer_text:
        raise RagUnavailable("Gemini returned an empty answer.")

    action = _detect_action(question)
    return {
        "answer": answer_text,
        "action": action,
        "gesture": knowledge.detect_gesture(question),
        "projects": knowledge.PROJECTS if action == "show_projects" else None,
        "sources": [_source_from_chunk(chunk) for chunk in chunks],
    }

"""Build a local vector index for the portfolio RAG assistant.

Run from the backend folder:
    python rag_indexer.py

Requires GEMINI_API_KEY in the environment. Source documents live in
``knowledge_base/`` and the generated index is written to ``rag_index.json``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - exercised before deps are installed
    genai = None
    types = None


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"
INDEX_PATH = BASE_DIR / "rag_index.json"
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf"}


@dataclass
class Source:
    title: str
    file: str
    section: str | None = None
    page: int | None = None
    snippet: str | None = None


@dataclass
class Chunk:
    id: str
    text: str
    source: Source
    embedding: list[float] | None = None


def _normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _title_from_text(path: Path, text: str) -> str:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+)$", line.strip())
        if match:
            return match.group(1).strip()
    return path.stem.replace("-", " ").replace("_", " ").title()


def _section_for_text(text: str) -> str | None:
    for line in text.splitlines():
        match = re.match(r"^#{1,3}\s+(.+)$", line.strip())
        if match:
            return match.group(1).strip()
    return None


def _read_pdf(path: Path) -> list[tuple[str, int | None]]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - depends on optional package
        raise RuntimeError("Install pypdf before indexing PDF files.") from exc

    reader = PdfReader(str(path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((text, index))
    return pages


def _read_document(path: Path) -> list[tuple[str, int | None]]:
    if path.suffix.lower() == ".pdf":
        return _read_pdf(path)
    return [(path.read_text(encoding="utf-8-sig"), None)]


def _chunk_text(text: str, max_words: int = 180, overlap_words: int = 35) -> list[str]:
    words = _normalize_space(text).split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(end - overlap_words, start + 1)
    return chunks


def load_chunks(knowledge_dir: Path = KNOWLEDGE_DIR) -> list[Chunk]:
    chunks: list[Chunk] = []
    files = sorted(
        path
        for path in knowledge_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    for path in files:
        documents = _read_document(path)
        raw_for_title = "\n".join(text for text, _page in documents)
        title = _title_from_text(path, raw_for_title)
        relative_file = path.relative_to(knowledge_dir).as_posix()

        for text, page in documents:
            section = _section_for_text(text)
            for ordinal, chunk_text in enumerate(_chunk_text(text), start=1):
                chunk_id = hashlib.sha256(
                    f"{relative_file}:{page}:{ordinal}:{chunk_text}".encode("utf-8")
                ).hexdigest()[:16]
                chunks.append(
                    Chunk(
                        id=chunk_id,
                        text=chunk_text,
                        source=Source(
                            title=title,
                            file=relative_file,
                            section=section,
                            page=page,
                            snippet=chunk_text[:240],
                        ),
                    )
                )

    return chunks


def _require_client():
    if genai is None or types is None:
        raise RuntimeError(
            "google-genai is not installed. Run: pip install -r requirements.txt"
        )
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY is required to build the RAG index.")
    return genai.Client()


def _embed_texts(texts: Iterable[str], task_type: str) -> list[list[float]]:
    client = _require_client()
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=list(texts),
        config=types.EmbedContentConfig(task_type=task_type),
    )
    return [embedding.values for embedding in result.embeddings]


def prepare_document_for_embedding(chunk: Chunk) -> str:
    title = chunk.source.title or "none"
    return f"title: {title} | text: {chunk.text}"


def build_index(
    knowledge_dir: Path = KNOWLEDGE_DIR,
    index_path: Path = INDEX_PATH,
) -> dict:
    chunks = load_chunks(knowledge_dir)
    if not chunks:
        raise RuntimeError(f"No supported documents found in {knowledge_dir}.")

    embeddings = _embed_texts(
        (prepare_document_for_embedding(chunk) for chunk in chunks),
        task_type="RETRIEVAL_DOCUMENT",
    )

    for chunk, embedding in zip(chunks, embeddings, strict=True):
        chunk.embedding = embedding

    payload = {
        "version": 1,
        "embedding_model": EMBEDDING_MODEL,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "knowledge_dir": str(knowledge_dir),
        "chunks": [asdict(chunk) for chunk in chunks],
    }
    index_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the portfolio RAG index.")
    parser.add_argument("--knowledge-dir", type=Path, default=KNOWLEDGE_DIR)
    parser.add_argument("--index-path", type=Path, default=INDEX_PATH)
    args = parser.parse_args()

    payload = build_index(args.knowledge_dir, args.index_path)
    print(
        f"Indexed {len(payload['chunks'])} chunks from {args.knowledge_dir} "
        f"into {args.index_path}."
    )


if __name__ == "__main__":
    main()

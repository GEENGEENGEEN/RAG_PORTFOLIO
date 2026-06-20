"""Portfolio Q&A engine.

The primary path is Gemini RAG. If the RAG index or API key is not available,
this module falls back to the original rule-based answers so local development
still works.
"""

import re

import knowledge


def _rule_based_answer(question: str) -> dict:
    """Return the original deterministic answer shape."""
    normalized = _tokenize(question or "")

    best_intent = None
    best_score = 0

    # Iterate in declared order so earlier intents win ties (priority).
    for intent in knowledge.INTENTS:
        score = _score_intent(normalized, intent["keywords"])
        if score > best_score:
            best_score = score
            best_intent = intent

    if best_intent is None or best_score == 0:
        return {
            "answer": knowledge.FALLBACK_RESPONSE,
            "action": None,
            "projects": None,
            "sources": [],
        }

    response = {
        "answer": best_intent["response"],
        "action": best_intent.get("action"),
        "projects": None,
        "sources": [],
    }

    if best_intent.get("action") == "show_projects":
        response["projects"] = knowledge.PROJECTS

    return response


def _tokenize(text: str) -> str:
    """Lowercase and normalize whitespace/punctuation for matching."""
    text = text.lower()
    # Keep letters, numbers and spaces; collapse everything else to spaces.
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _score_intent(normalized: str, keywords: list[str]) -> int:
    """Count how many keywords appear in the question.

    Multi-word keywords are matched as substrings; single words are matched on
    word boundaries so "hi" doesn't match "this".
    """
    score = 0
    for keyword in keywords:
        kw = keyword.lower().strip()
        if not kw:
            continue
        if " " in kw:
            if kw in normalized:
                score += 2  # phrase matches weigh more
        else:
            if re.search(rf"\b{re.escape(kw)}\b", normalized):
                score += 1
    return score


def answer(question: str) -> dict:
    """Return a structured response for a user's question.

    Shape: ``{"answer": str, "action": str | None, "projects": list | None,
    "sources": list}``
    """
    try:
        import rag_engine

        return rag_engine.answer(question)
    except Exception:
        return _rule_based_answer(question)

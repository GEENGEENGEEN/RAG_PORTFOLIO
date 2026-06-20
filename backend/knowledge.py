"""Editable portfolio content.

This is the ONLY file you need to edit to make the portfolio your own.
Swap in your real bio, tweak the intent keywords/responses, and list your
real projects. Everything else (the Q&A engine and the 3D frontend) reads
from here.
"""

# ---------------------------------------------------------------------------
# Your name (shown in greetings and the project paper header).
# ---------------------------------------------------------------------------
NAME = "Geen Malaguena"

# ---------------------------------------------------------------------------
# A short bio, returned when someone asks "who are you / about you".
# ---------------------------------------------------------------------------
BIO = (
    "Hi, I'm Geen Malaguena, a creative full-stack developer who loves blending "
    "engineering with design. I build playful, interactive web experiences and "
    "tools that make people smile. When I'm not coding, you'll find me sketching, "
    "playing guitar, or over-engineering my coffee setup."
)

# ---------------------------------------------------------------------------
# Your projects. Each one shows up on the "paper" the character hands over.
# Add, remove, or edit freely.
# ---------------------------------------------------------------------------
PROJECTS = [
    {
        "name": "Project ABAY",
        "description": (
            "A real-time sign language translator made for non-speaking Filipinos "
            "built to be fully offline. Built with Python and QWEN 3"
        ),
        "url": "https://project-abay.vercel.app/",
    },
    {
        "name": "PixelForge",
        "description": (
            "A browser-based pixel-art editor with animation timelines and "
            "one-click sprite-sheet export. Canvas + TypeScript."
        ),
        "url": "https://github.com/GEENGEENGEEN",
    },
    {
        "name": "TrailMix",
        "description": (
            "A hiking companion that generates routes from your fitness level "
            "and turns them into shareable maps. Python, FastAPI, and Mapbox."
        ),
        "url": "https://github.com/GEENGEENGEEN",
    },
]

# ---------------------------------------------------------------------------
# Skills (returned when someone asks what you can do / your stack).
# ---------------------------------------------------------------------------
SKILLS = [
    "JavaScript / TypeScript",
    "React & Three.js",
    "Python (FastAPI, Flask)",
    "Node.js",
    "UI / UX design",
    "PostgreSQL & Redis",
]

# ---------------------------------------------------------------------------
# Contact links (returned when someone asks how to reach you).
# ---------------------------------------------------------------------------
CONTACT = {
    "email": "geencaille2@gmail.com",
    "github": "https://github.com/GEENGEENGEEN",
    "linkedin": "Draft LinkedIn profile link",
}

# ---------------------------------------------------------------------------
# Intents drive the rule-based engine. Each intent has:
#   - keywords: words/phrases that, if present, score a match
#   - response: the text the character replies with
#   - action  : optional special behavior the frontend reacts to
#
# Higher in the list == higher priority on ties. The "about" and "projects"
# intents trigger the "show_projects" action (the paper hand-off).
# ---------------------------------------------------------------------------
INTENTS = [
    {
        "name": "projects",
        "keywords": [
            "project", "projects", "work", "portfolio", "built", "build",
            "made", "showcase", "app", "apps", "made", "created", "demo",
        ],
        "response": "Glad you asked! Let me hand you a quick rundown of my projects.",
        "action": "show_projects",
    },
    {
        "name": "about",
        "keywords": [
            "about", "who", "yourself", "introduce", "introduction",
            "bio", "tell me about", "your story", "background", "geen",
        ],
        "response": BIO + " Want to see what I've built? Just ask about my projects!",
        "action": "show_projects",
    },
    {
        "name": "skills",
        "keywords": [
            "skill", "skills", "stack", "tech", "technology", "technologies",
            "languages", "language", "tools", "good at", "expertise", "know",
        ],
        "response": "Here's my toolkit: " + ", ".join(SKILLS) + ".",
        "action": None,
    },
    {
        "name": "contact",
        "keywords": [
            "contact", "reach", "email", "hire", "connect", "linkedin",
            "github", "social", "message", "get in touch",
        ],
        "response": (
            "Let's connect! Email me at {email}, find my code at {github}, "
            "or say hi on LinkedIn: {linkedin}."
        ).format(**CONTACT),
        "action": None,
    },
    {
        "name": "greeting",
        "keywords": [
            "hi", "hello", "hey", "yo", "greetings", "howdy", "sup",
            "good morning", "good evening", "good afternoon",
        ],
        "response": (
            "Hey there! I'm {name}'s low-poly avatar. Ask me about Geen, "
            "their projects, skills, or how to get in touch."
        ).format(name=NAME),
        "action": None,
    },
    {
        "name": "thanks",
        "keywords": ["thanks", "thank you", "thx", "appreciate", "cheers"],
        "response": "Anytime! Feel free to ask me anything else.",
        "action": None,
    },
    {
        "name": "fun",
        "keywords": [
            "joke", "funny", "fun", "hobby", "hobbies", "music", "guitar",
            "coffee", "fun fact",
        ],
        "response": (
            "Fun fact: I once tuned my coffee grinder with the same care I tune "
            "guitars. The espresso was great; the neighbors, less thrilled."
        ),
        "action": None,
    },
]

# Reply when nothing matches.
FALLBACK_RESPONSE = (
    "Hmm, I'm just a simple avatar so I might not have caught that. Try asking "
    "about Geen, the projects, skills, or contact info!"
)

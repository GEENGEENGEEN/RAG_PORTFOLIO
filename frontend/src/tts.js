// Thin wrapper around the browser's built-in Web Speech API (speechSynthesis).
// Runs entirely on the user's machine/OS: offline, free, no install. Isolating
// it here means a future swap to a server-side engine only touches this file.

export function isSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Voices load asynchronously; getVoices() is frequently empty on first call, so
// we cache the resolved voice and also listen for the `voiceschanged` event.
let cachedVoice = null;
let cachedFromVoices = null;

// Most "natural"/neural voices first, then any English voice, then default.
const NAME_PREFERENCE = ["Natural", "Online", "Google", "Microsoft"];

function pickVoice(voices) {
  if (!voices || voices.length === 0) return null;

  const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  for (const name of NAME_PREFERENCE) {
    const match = pool.find((v) => v.name && v.name.includes(name));
    if (match) return match;
  }

  return pool[0] ?? null;
}

export function getPreferredVoice() {
  if (!isSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  // Re-pick if the available voice list changed since we last cached.
  if (!cachedVoice || cachedFromVoices !== voices.length) {
    cachedVoice = pickVoice(voices);
    cachedFromVoices = voices.length;
  }
  return cachedVoice;
}

// Warm the voice cache as soon as the list is ready.
if (isSupported()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = null;
    getPreferredVoice();
  });
  getPreferredVoice();
}

export function speak(text) {
  if (!isSupported()) return;

  const trimmed = (text ?? "").trim();
  if (!trimmed) return;

  // Interrupt anything currently being spoken so answers don't queue up.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voice = getPreferredVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
}

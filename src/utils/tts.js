let voicesReadyPromise = null;
let currentToken = 0;

// Voices are async on Safari/iOS — getVoices() returns [] until voiceschanged fires.
// Capacitor WebViews on iOS share the same behavior.
function waitForVoices() {
  if (voicesReadyPromise) return voicesReadyPromise;
  if (!window.speechSynthesis) {
    voicesReadyPromise = Promise.resolve([]);
    return voicesReadyPromise;
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    voicesReadyPromise = Promise.resolve(existing);
    return voicesReadyPromise;
  }
  voicesReadyPromise = new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    // Fallback: voiceschanged sometimes never fires in iOS WebViews — speak anyway after a delay.
    setTimeout(done, 1500);
  });
  return voicesReadyPromise;
}

export function speak(text, onEnd, onStart) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const token = ++currentToken;
  waitForVoices().then((voices) => {
    if (token !== currentToken) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    const preferred = voices.find(
      (v) => v.name.includes("Google US English") || v.name.includes("Samantha") || v.lang === "en-US"
    );
    if (preferred) utterance.voice = preferred;
    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeech() {
  currentToken++;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

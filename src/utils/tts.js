export function speak(text, onEnd) {
  stopSpeech();
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.name.includes("Google US English") || v.name.includes("Samantha") || v.lang === "en-US"
  );
  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

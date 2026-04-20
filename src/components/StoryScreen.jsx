import React, { useState, useEffect, useRef } from "react";
import { speak, stopSpeech } from "../utils/tts.js";
import LoadingDots from "./LoadingDots.jsx";

export default function StoryScreen({ story, ttsOn, audioUnlocked, onUnlockAudio, onStartQuiz, loading }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Tracks the story string we have already started speaking, so a re-render
  // with identical content does not cancel and restart speech.
  const lastSpokenRef = useRef(null);

  useEffect(() => {
    const canSpeak = ttsOn && story && !loading && audioUnlocked;

    if (!canSpeak) {
      if (lastSpokenRef.current) {
        stopSpeech();
        lastSpokenRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    if (lastSpokenRef.current === story) return;

    lastSpokenRef.current = story;
    setIsSpeaking(true);
    speak(story, () => setIsSpeaking(false));
  }, [story, ttsOn, loading, audioUnlocked]);

  // Stop any in-flight speech on unmount only.
  useEffect(() => () => {
    stopSpeech();
    lastSpokenRef.current = null;
  }, []);

  function handleStartQuiz() {
    stopSpeech();
    setIsSpeaking(false);
    onStartQuiz();
  }

  function handleTapToStart() {
    if (onUnlockAudio) onUnlockAudio();
  }

  const showUnlockHint = ttsOn && story && !loading && !audioUnlocked;

  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#E81828", marginBottom: 14, fontFamily: "'Barlow Condensed', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
        Game Recap
        {isSpeaking && (
          <span role="img" aria-label="Speaking" style={{ fontSize: 14, display: "inline-block", animation: "speakPulse 1s ease infinite" }}>🔊</span>
        )}
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: isSpeaking ? "1px solid rgba(240,192,64,0.3)" : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "24px 22px",
        marginBottom: 24,
        minHeight: 120,
        display: "flex",
        alignItems: loading ? "center" : "flex-start",
        justifyContent: loading ? "center" : "flex-start",
        transition: "border-color 0.3s ease",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <LoadingDots />
            <div style={{ fontSize: 13, color: "#a09a90", marginTop: 10, fontWeight: 600 }}>Generating recap...</div>
          </div>
        ) : (
          <p style={{ fontSize: 24, lineHeight: 1.75, color: "#c8c0b4", fontStyle: "italic", margin: 0 }}>"{story}"</p>
        )}
      </div>
      {showUnlockHint && (
        <button
          onClick={handleTapToStart}
          aria-label="Tap to start audio narration"
          style={{
            width: "100%",
            background: "rgba(240,192,64,0.08)",
            border: "1px solid rgba(240,192,64,0.35)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#F0C040",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 14,
            touchAction: "manipulation",
          }}
        >
          🔊 Tap to start audio
        </button>
      )}
      {!loading && (
        <button
          onClick={handleStartQuiz}
          aria-label="Start the quiz"
          style={{
            width: "100%",
            background: isSpeaking ? "rgba(232,24,40,0.5)" : "#E81828",
            border: "none",
            borderRadius: 14,
            padding: "16px 24px",
            color: "#fff",
            fontSize: 22,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
            boxShadow: "0 4px 24px rgba(232,24,40,0.3)",
            minHeight: 72,
            touchAction: "manipulation",
            transition: "background 0.3s ease",
          }}
        >
          {isSpeaking ? "🔊 Tap to Skip & Start Quiz" : "Take the Quiz"}
        </button>
      )}
    </div>
  );
}

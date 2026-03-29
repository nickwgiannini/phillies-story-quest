import React, { useEffect } from "react";
import { speak, stopSpeech } from "../utils/tts.js";
import LoadingDots from "./LoadingDots.jsx";

export default function StoryScreen({ story, ttsOn, onStartQuiz, loading }) {
  useEffect(() => {
    if (ttsOn && story && !loading) speak(story);
    return () => stopSpeech();
  }, [story, ttsOn, loading]);

  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#E81828", marginBottom: 14, fontFamily: "'Barlow Condensed', sans-serif" }}>
        Game Recap
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 22px", marginBottom: 24, minHeight: 120, display: "flex", alignItems: loading ? "center" : "flex-start", justifyContent: loading ? "center" : "flex-start" }}>
        {loading ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <LoadingDots />
            <div style={{ fontSize: 13, color: "#a09a90", marginTop: 10, fontWeight: 600 }}>Generating recap...</div>
          </div>
        ) : (
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "#c8c0b4", fontStyle: "italic", margin: 0 }}>"{story}"</p>
        )}
      </div>
      {!loading && (
        <button onClick={onStartQuiz} aria-label="Start the quiz" style={{ width: "100%", background: "linear-gradient(135deg,#E81828,#a01020)", border: "none", borderRadius: 14, padding: "16px 24px", color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", boxShadow: "0 4px 24px rgba(232,24,40,0.3)" }}>
          Take the Quiz
        </button>
      )}
    </div>
  );
}

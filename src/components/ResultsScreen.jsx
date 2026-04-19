import React, { useEffect } from "react";
import { speak, stopSpeech } from "../utils/tts.js";

export default function ResultsScreen({ answers, questions, ttsOn, onPlayAgain, onHistory }) {
  const correct = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const score = Math.round((correct / total) * 100);
  const grade = score >= 90 ? { label: "Phanatic Level", emoji: "🏆", color: "#F0C040" }
    : score >= 70 ? { label: "Season Ticket Holder", emoji: "⚾", color: "#4ade80" }
    : score >= 50 ? { label: "Casual Fan", emoji: "👋", color: "#60a5fa" }
    : { label: "Fair Weather Fan", emoji: "☁️", color: "#f87171" };

  useEffect(() => {
    if (ttsOn) speak(`Quiz complete! You got ${correct} out of ${total} correct — ${score} percent. Rating: ${grade.label}.`);
    return () => stopSpeech();
  }, [ttsOn]);

  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      <div style={{ background: "linear-gradient(135deg,rgba(232,24,40,0.1),rgba(0,45,98,0.15))", border: "1px solid rgba(232,24,40,0.2)", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 20 }}>
        <div aria-hidden="true" style={{ fontSize: 56, marginBottom: 8 }}>{grade.emoji}</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: grade.color, lineHeight: 1, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: -1 }}>{score}%</div>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: grade.color, fontFamily: "'Barlow Condensed', sans-serif", marginTop: 6, marginBottom: 4 }}>{grade.label}</div>
        <div style={{ fontSize: 14, color: "#a09a90", fontWeight: 500 }}>{correct} / {total} correct</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>Breakdown</div>
      {/* Fixed-height scrollable list so action buttons are never pushed off screen on tablet */}
      <div style={{ maxHeight: "40vh", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {answers.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: a.correct ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)", border: `1px solid ${a.correct ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`, borderRadius: 10, padding: "10px 14px" }}>
            <span role="img" aria-label={a.correct ? "Correct" : "Wrong"} style={{ fontSize: 14, marginTop: 1 }}>{a.correct ? "✅" : "❌"}</span>
            <span style={{ fontSize: 13, color: "#c8c0b4", lineHeight: 1.5, flex: 1 }}>{questions[i]?.q}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onPlayAgain} aria-label="Play again" style={{ flex: 1, background: "linear-gradient(135deg,#E81828,#a01020)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", minHeight: 64, touchAction: "manipulation" }}>Play Again</button>
        <button onClick={onHistory} aria-label="View history" style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px", color: "#a09a90", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", minHeight: 64, touchAction: "manipulation" }}>History</button>
      </div>
    </div>
  );
}

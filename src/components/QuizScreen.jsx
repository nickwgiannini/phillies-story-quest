import React, { useState, useEffect } from "react";
import { speak, stopSpeech } from "../utils/tts.js";

export default function QuizScreen({ questions, ttsOn, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const q = questions[current];

  useEffect(() => {
    if (ttsOn && q) speak(q.q);
    return () => stopSpeech();
  }, [current, ttsOn]);

  function handleSelect(idx) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (ttsOn) speak(idx === q.correct ? "Correct! " + q.a[idx] : "Not quite. " + q.a[q.correct]);
  }

  function handleNext() {
    const newAnswers = [...answers, { correct: selected === q.correct }];
    setAnswers(newAnswers);
    stopSpeech();
    if (current + 1 >= questions.length) {
      onFinish(newAnswers);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  }

  const progress = (current / questions.length) * 100;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", fontFamily: "'Barlow Condensed', sans-serif" }}>Question {current + 1} of {questions.length}</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif" }}>{answers.filter((a) => a.correct).length} correct</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#E81828,#F0C040)", width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#FAEBD7", lineHeight: 1.5, marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>{q.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {q.a.map((answer, idx) => {
          let bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.08)", color = "#c8c0b4", label = null;
          if (revealed) {
            if (idx === q.correct) { bg = "rgba(74,222,128,0.1)"; border = "rgba(74,222,128,0.35)"; color = "#4ade80"; label = "Correct"; }
            else if (idx === selected) { bg = "rgba(248,113,113,0.1)"; border = "rgba(248,113,113,0.35)"; color = "#f87171"; label = "Wrong"; }
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} aria-label={`Option ${idx + 1}: ${answer}`} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", textAlign: "left", cursor: revealed ? "default" : "pointer", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontSize: 14, color, lineHeight: 1.6, flex: 1, margin: 0 }}>{answer}</p>
                {label && <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap", marginTop: 2 }}>{label}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {revealed && (
        <button onClick={handleNext} aria-label={current + 1 >= questions.length ? "See results" : "Next question"} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px", color: "#FAEBD7", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          {current + 1 >= questions.length ? "See Results" : "Next Question"}
        </button>
      )}
    </div>
  );
}

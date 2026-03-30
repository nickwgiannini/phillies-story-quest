import React, { useState, useEffect, useRef } from "react";
import { speak, stopSpeech } from "../utils/tts.js";

export default function QuizScreen({ questions, ttsOn, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedLength, setTypedLength] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [firstAttemptWrong, setFirstAttemptWrong] = useState(false);
  const [wrongAnswerMsg, setWrongAnswerMsg] = useState(false);
  const [wrongOptionIdx, setWrongOptionIdx] = useState(null);

  const inputRef = useRef(null);
  const wrongFlashTimer = useRef(null);
  const q = questions[current];
  const targetText = selectedOption !== null ? q.a[selectedOption] : "";
  const isComplete = targetText.length > 0 && typedLength === targetText.length;

  useEffect(() => {
    if (ttsOn && q) speak(q.q);
    return () => stopSpeech();
  }, [current, ttsOn]);

  useEffect(() => {
    if (selectedOption !== null) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedOption]);

  useEffect(() => () => clearTimeout(wrongFlashTimer.current), []);

  function flashWrong() {
    if (wrongFlash) return;
    setWrongFlash(true);
    clearTimeout(wrongFlashTimer.current);
    wrongFlashTimer.current = setTimeout(() => setWrongFlash(false), 2000);
  }

  function handleOptionSelect(idx) {
    if (wrongOptionIdx === idx) return;
    setSelectedOption(idx);
    setTypedLength(0);
    setWrongFlash(false);
    setWrongAnswerMsg(false);
    clearTimeout(wrongFlashTimer.current);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleInputChange(e) {
    if (selectedOption === null) return;
    const target = q.a[selectedOption];
    const newVal = e.target.value;
    let correctLen = 0;
    for (let i = 0; i < newVal.length; i++) {
      if (i >= target.length) break;
      if (newVal[i].toLowerCase() === target[i].toLowerCase()) { correctLen++; } else { break; }
    }
    if (correctLen === newVal.length) {
      setTypedLength(correctLen);
    } else {
      e.target.value = target.slice(0, correctLen);
      setTypedLength(correctLen);
      flashWrong();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isComplete) { e.preventDefault(); handleSubmit(); }
  }

  function handlePaste(e) { e.preventDefault(); }

  function handleSubmit() {
    const isCorrect = selectedOption === q.correct;
    if (isCorrect) {
      const newAnswer = { correct: !firstAttemptWrong };
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      stopSpeech();
      if (ttsOn) speak(firstAttemptWrong ? "Got it. " + q.a[q.correct] : "Correct! " + q.a[q.correct]);
      if (current + 1 >= questions.length) {
        onFinish(newAnswers);
      } else {
        setCurrent((c) => c + 1);
        setSelectedOption(null); setTypedLength(0); setWrongFlash(false);
        setFirstAttemptWrong(false); setWrongAnswerMsg(false); setWrongOptionIdx(null);
        clearTimeout(wrongFlashTimer.current);
        if (inputRef.current) inputRef.current.value = "";
      }
    } else {
      if (ttsOn) speak("Not quite. Try the other answer.");
      setFirstAttemptWrong(true); setWrongAnswerMsg(true); setWrongOptionIdx(selectedOption);
      setSelectedOption(null); setTypedLength(0); setWrongFlash(false);
      clearTimeout(wrongFlashTimer.current);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const progress = (current / questions.length) * 100;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", fontFamily: "'Barlow Condensed', sans-serif" }}>
            Question {current + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {answers.filter((a) => a.correct).length} correct
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#E81828,#F0C040)", width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: "#FAEBD7", lineHeight: 1.5, marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {q.q}
      </div>

      {wrongAnswerMsg && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>✗</span>
          <span style={{ fontSize: 14, color: "#f87171", fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5 }}>
            Wrong answer — try the other option!
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {q.a.map((answer, idx) => {
          const isSelected = selectedOption === idx;
          const isWrongPrev = wrongOptionIdx === idx;
          let bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.08)", color = "#c8c0b4", cursor = "pointer";
          if (isSelected) { bg = "rgba(240,192,64,0.1)"; border = "rgba(240,192,64,0.4)"; color = "#F0C040"; }
          else if (isWrongPrev) { bg = "rgba(248,113,113,0.06)"; border = "rgba(248,113,113,0.2)"; color = "#f87171"; cursor = "default"; }
          return (
            <button key={idx} onClick={() => handleOptionSelect(idx)} disabled={isWrongPrev}
              aria-label={`Option ${idx + 1}: ${answer}`}
              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", textAlign: "left", cursor, width: "100%", opacity: isWrongPrev ? 0.45 : 1, transition: "all 0.15s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontSize: 14, color, lineHeight: 1.6, flex: 1, margin: 0 }}>{answer}</p>
                {isWrongPrev && <span style={{ fontSize: 11, fontWeight: 800, color: "#f87171", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap", marginTop: 2 }}>Wrong</span>}
                {isSelected && <span style={{ fontSize: 11, fontWeight: 800, color: "#F0C040", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap", marginTop: 2 }}>Selected ↓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedOption !== null && (
        <div onClick={() => inputRef.current?.focus()}
          style={{
            background: wrongFlash ? "rgba(248,113,113,0.07)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${wrongFlash ? "rgba(248,113,113,0.45)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 14, cursor: "text",
            position: "relative", transition: "background 0.15s ease, border-color 0.15s ease",
          }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
            Type the answer:
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1.5, lineHeight: 2, fontFamily: "'Barlow Condensed', sans-serif", paddingRight: 32 }}>
            {targetText.split("").map((char, i) => {
              const typed = i < typedLength, isCursor = i === typedLength;
              return (
                <span key={i} style={{
                  color: typed ? "#4ade80" : isCursor ? "#FAEBD7" : "#444",
                  background: isCursor ? "rgba(255,255,255,0.08)" : "transparent",
                  borderBottom: isCursor ? "2px solid #FAEBD7" : "2px solid transparent",
                  padding: "0 1px", transition: "color 0.08s ease",
                }}>{char}</span>
              );
            })}
            {isComplete && <span style={{ color: "#4ade80", marginLeft: 6, fontSize: 16 }}>✓</span>}
          </div>
          {wrongFlash && (
            <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#f87171", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>✗</div>
          )}
          {wrongFlash && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", marginTop: 6, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
              Wrong letter — try again
            </div>
          )}
          <input ref={inputRef} type="text" autoCapitalize="none" autoCorrect="off" autoComplete="off"
            spellCheck="false" inputMode="text" onChange={handleInputChange} onKeyDown={handleKeyDown}
            onPaste={handlePaste} aria-label="Type your answer here"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", fontSize: 16, border: "none", background: "transparent" }} />
        </div>
      )}

      {isComplete && (
        <button onClick={handleSubmit} aria-label={current + 1 >= questions.length ? "See results" : "Submit answer"}
          style={{ width: "100%", background: "linear-gradient(135deg,#E81828,#a01020)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", animation: "fadeUp 0.25s ease both" }}>
          {current + 1 >= questions.length ? "See Results" : "Submit Answer →"}
        </button>
      )}

      {selectedOption === null && !wrongAnswerMsg && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#555", fontWeight: 600, marginTop: 4 }}>
          Select an answer above to start typing
        </div>
      )}
    </div>
  );
}

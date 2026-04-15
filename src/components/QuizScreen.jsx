import React, { useState, useEffect, useRef } from "react";
import { speak, stopSpeech } from "../utils/tts.js";

// Map characters to spoken labels; spaces explicitly announced
function getCharLabel(char) {
  if (char === " ") return "space";
  const labels = {
    ".": "period",
    ",": "comma",
    "'": "apostrophe",
    "-": "dash",
    "!": "exclamation mark",
    "?": "question mark",
  };
  return labels[char] ?? char;
}

// Graceful fallback for questions cached before the 'labels' field was added.
function getLabel(q, idx) {
  const label = q.labels?.[idx];
  if (label && label.trim().length > 0) return label;
  return idx === 0 ? "Option A" : "Option B";
}

export default function QuizScreen({ questions, ttsOn, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedLength, setTypedLength] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [firstAttemptWrong, setFirstAttemptWrong] = useState(false);
  const [wrongAnswerMsg, setWrongAnswerMsg] = useState(false);
  const [wrongOptionIdx, setWrongOptionIdx] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [lastCorrectIdx, setLastCorrectIdx] = useState(-1);
  const [shakingIdx, setShakingIdx] = useState(null);

  const inputRef = useRef(null);
  const typingAreaRef = useRef(null);
  const wrongFlashTimer = useRef(null);
  const lastCorrectTimer = useRef(null);
  const shakingTimer = useRef(null);
  // Guards against stale onEnd / setTimeout callbacks when user switches options or questions
  const ttsActive = useRef(false);

  const q = questions[current];
  const targetText = selectedOption !== null ? q.a[selectedOption] : "";
  const isComplete = targetText.length > 0 && typedLength === targetText.length;

  // Current char — every character including spaces must be typed
  const currentCharIdx =
    isComplete || selectedOption === null || typedLength >= targetText.length
      ? -1
      : typedLength;

  // Read question + SHORT option labels when question changes or TTS is toggled on
  useEffect(() => {
    ttsActive.current = false;
    stopSpeech();
    setIsSpeaking(false);
    if (ttsOn && q) {
      const labelA = getLabel(q, 0);
      const labelB = getLabel(q, 1);
      ttsActive.current = true;
      setIsSpeaking(true);
      speak(q.q, () => {
        if (!ttsActive.current) { setIsSpeaking(false); return; }
        speak(`Option A: ${labelA}`, () => {
          if (!ttsActive.current) { setIsSpeaking(false); return; }
          speak(`Option B: ${labelB}`, () => {
            setIsSpeaking(false);
          });
        });
      });
    }
    return () => {
      ttsActive.current = false;
      stopSpeech();
      setIsSpeaking(false);
    };
  }, [current, ttsOn]);

  // Scroll typing area into view after option selection.
  // 350ms delay lets the tablet keyboard finish opening before scrolling.
  useEffect(() => {
    if (selectedOption !== null) {
      setTimeout(() => {
        typingAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        inputRef.current?.focus();
      }, 350);
    }
  }, [selectedOption]);

  useEffect(() => () => {
    clearTimeout(wrongFlashTimer.current);
    clearTimeout(lastCorrectTimer.current);
    clearTimeout(shakingTimer.current);
  }, []);

  function flashWrong() {
    setWrongFlash(true);
    clearTimeout(wrongFlashTimer.current);
    wrongFlashTimer.current = setTimeout(() => setWrongFlash(false), 2000);
  }

  function handleOptionSelect(idx) {
    if (wrongOptionIdx === idx) return;

    ttsActive.current = false;
    stopSpeech();
    setIsSpeaking(false);

    setSelectedOption(idx);
    setTypedLength(0);
    setWrongFlash(false);
    setWrongAnswerMsg(false);
    clearTimeout(wrongFlashTimer.current);
    if (inputRef.current) inputRef.current.value = "";

    if (ttsOn) {
      const label = getLabel(q, idx);
      const fullAnswer = q.a[idx];
      // Read the SHORT label aloud, then after 300 ms call out the first character to type
      ttsActive.current = true;
      speak(label, () => {
        if (!ttsActive.current) return;
        setTimeout(() => {
          if (!ttsActive.current) return;
          speak(getCharLabel(fullAnswer[0]));
        }, 300);
      });
    }
  }

  function handleInputChange(e) {
    if (selectedOption === null) return;
    const val = e.target.value;
    if (!val) return;

    const typedChar = val[val.length - 1];
    e.target.value = "";

    const answer = q.a[selectedOption];
    const expectedIdx = typedLength;

    if (expectedIdx >= answer.length) return;

    if (typedChar.toLowerCase() === answer[expectedIdx].toLowerCase()) {
      const newLen = expectedIdx + 1;

      // Brief green flash animation on the just-typed character
      setLastCorrectIdx(expectedIdx);
      clearTimeout(lastCorrectTimer.current);
      lastCorrectTimer.current = setTimeout(() => setLastCorrectIdx((prev) => prev === expectedIdx ? -1 : prev), 200);

      ttsActive.current = false;

      if (ttsOn) {
        if (newLen >= answer.length) {
          // Typing complete — nothing more to announce
        } else {
          const nextChar = answer[newLen];

          if (nextChar === " ") {
            // Just finished a word — read it, then after 300 ms say "space"
            const wordStart = answer.lastIndexOf(" ", expectedIdx - 1) + 1;
            const word = answer.slice(wordStart, expectedIdx + 1);
            ttsActive.current = true;
            speak(word, () => {
              if (!ttsActive.current) return;
              setTimeout(() => {
                if (!ttsActive.current) return;
                speak("space");
              }, 300);
            });
          } else {
            // Mid-word or just-typed a space — read next character
            ttsActive.current = true;
            speak(getCharLabel(nextChar));
          }
        }
      }

      setTypedLength(newLen);
      setWrongFlash(false);
    } else {
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
      ttsActive.current = false;
      setIsSpeaking(false);
      const newAnswer = { correct: !firstAttemptWrong };
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      stopSpeech();

      function advanceQuestion() {
        setTimeout(() => {
          if (current + 1 >= questions.length) {
            onFinish(newAnswers);
          } else {
            setCurrent((c) => c + 1);
            setSelectedOption(null); setTypedLength(0); setWrongFlash(false);
            setFirstAttemptWrong(false); setWrongAnswerMsg(false); setWrongOptionIdx(null);
            clearTimeout(wrongFlashTimer.current);
            if (inputRef.current) inputRef.current.value = "";
          }
        }, 500);
      }

      if (ttsOn) {
        setIsSpeaking(true);
        speak(firstAttemptWrong ? "Got it." : "Correct!", () => {
          setIsSpeaking(false);
          advanceQuestion();
        });
      } else {
        advanceQuestion();
      }
    } else {
      ttsActive.current = false;
      setIsSpeaking(false);
      stopSpeech();

      // Shake animation on the wrong button
      const wrongIdx = selectedOption;
      setShakingIdx(wrongIdx);
      clearTimeout(shakingTimer.current);
      shakingTimer.current = setTimeout(() => setShakingIdx(null), 400);

      if (ttsOn) {
        setIsSpeaking(true);
        speak("Not quite, try the other option", () => setIsSpeaking(false));
      }

      setFirstAttemptWrong(true); setWrongAnswerMsg(true); setWrongOptionIdx(selectedOption);
      setSelectedOption(null); setTypedLength(0); setWrongFlash(false);
      clearTimeout(wrongFlashTimer.current);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const progress = (current / questions.length) * 100;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both", paddingBottom: keyboardOpen ? "40vh" : 0, transition: "padding-bottom 0.3s ease" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", fontFamily: "'Barlow Condensed', sans-serif" }}>
            Question {current + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            {answers.filter((a) => a.correct).length} correct
            {isSpeaking && <span style={{ display: "inline-block", animation: "speakPulse 1s ease infinite", fontSize: 12 }}>🔊</span>}
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#E81828,#F0C040)", width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize: 22, fontWeight: 700, color: "#FAEBD7", lineHeight: 1.5, marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {q.q}
      </div>

      {wrongAnswerMsg && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>✗</span>
          <span style={{ fontSize: 15, color: "#f87171", fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>
            Wrong answer — try the other option!
          </span>
        </div>
      )}

      {/* A/B option buttons — show SHORT labels only */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {q.a.map((_, idx) => {
          const label = getLabel(q, idx);
          const isSelected = selectedOption === idx;
          const isWrongPrev = wrongOptionIdx === idx;
          const isShaking = shakingIdx === idx;
          const letter = String.fromCharCode(65 + idx); // "A" or "B"

          let cardBg = "rgba(255,255,255,0.04)";
          let cardBorder = "rgba(255,255,255,0.1)";
          let labelColor = "#c8c0b4";
          let badgeBg = "rgba(255,255,255,0.08)";
          let badgeColor = "#666";
          let cursor = "pointer";

          if (isSelected) {
            cardBg = "rgba(240,192,64,0.08)";
            cardBorder = "rgba(240,192,64,0.5)";
            labelColor = "#F0C040";
            badgeBg = "rgba(240,192,64,0.2)";
            badgeColor = "#F0C040";
          } else if (isWrongPrev) {
            cardBg = "rgba(248,113,113,0.06)";
            cardBorder = "rgba(248,113,113,0.2)";
            labelColor = "#f87171";
            badgeBg = "rgba(248,113,113,0.15)";
            badgeColor = "#f87171";
            cursor = "default";
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              disabled={isWrongPrev}
              aria-label={`Option ${letter}: ${label}`}
              style={{
                background: cardBg,
                border: `2px solid ${cardBorder}`,
                borderRadius: 16,
                padding: "16px 18px",
                textAlign: "left",
                cursor,
                width: "100%",
                opacity: isWrongPrev ? 0.5 : 1,
                transition: "all 0.15s ease",
                minHeight: 88,
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                gap: 16,
                animation: isShaking ? "shake 0.3s ease" : undefined,
              }}
            >
              {/* Prominent letter badge */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: badgeBg,
                border: `2px solid ${cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 900,
                color: badgeColor,
                fontFamily: "'Barlow Condensed', sans-serif",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}>
                {letter}
              </div>

              {/* Short label text */}
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: labelColor,
                  lineHeight: 1.35,
                  margin: 0,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  transition: "color 0.15s ease",
                }}>
                  {label}
                </p>
              </div>

              {/* Status chip */}
              {isWrongPrev && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#f87171", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap" }}>
                  Wrong
                </span>
              )}
              {isSelected && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#F0C040", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap" }}>
                  Selected ↓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Typing area — shown after option is selected, displays the FULL answer to type */}
      {selectedOption !== null && (
        <div
          ref={typingAreaRef}
          onClick={() => inputRef.current?.focus()}
          style={{
            background: wrongFlash ? "rgba(248,113,113,0.07)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${wrongFlash ? "rgba(248,113,113,0.45)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 14,
            cursor: "text",
            position: "relative",
            transition: "background 0.15s ease, border-color 0.15s ease",
            overflow: "hidden",
            maxWidth: "100%",
            touchAction: "manipulation",
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
            Type the answer:
          </div>
          {/* Full answer text — no letter-spacing, break-word so long answers wrap cleanly */}
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.9,
            fontFamily: "'Barlow Condensed', sans-serif",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            overflow: "hidden",
            maxWidth: "100%",
          }}>
            {targetText.split("").map((char, i) => {
              const typed = i < typedLength;
              const isCurrentChar = i === currentCharIdx;
              const isJustTyped = i === lastCorrectIdx;
              return (
                <span key={i} style={{
                  color: typed ? "#4ade80" : isCurrentChar ? "#000" : "#444",
                  background: isCurrentChar ? "#F0C040" : "transparent",
                  borderRadius: isCurrentChar ? "3px" : "0",
                  padding: "0 2px",
                  display: "inline-block",
                  transition: "color 0.08s ease, background 0.08s ease",
                  animation: isJustTyped ? "correctFlash 0.15s ease" : undefined,
                }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
            {isComplete && <span style={{ color: "#4ade80", marginLeft: 6, fontSize: 16 }}>✓</span>}
          </div>
          {wrongFlash && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", marginTop: 8, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
              ✗ Wrong letter — try again
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            data-form-type="other"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setKeyboardOpen(true)}
            onBlur={() => setKeyboardOpen(false)}
            aria-label="Type your answer here"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", fontSize: 16, border: "none", background: "transparent" }}
          />
        </div>
      )}

      {isComplete && (
        <button
          onClick={handleSubmit}
          aria-label={current + 1 >= questions.length ? "See results" : "Submit answer"}
          style={{ width: "100%", background: "linear-gradient(135deg,#E81828,#a01020)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", animation: "fadeUp 0.25s ease both", minHeight: 64, touchAction: "manipulation" }}
        >
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

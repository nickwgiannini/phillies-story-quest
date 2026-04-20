import React, { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { speak, stopSpeech } from "../utils/tts.js";

// Suppress iOS long-press context menus (define/share) and accent pickers on non-input elements.
const noCallout = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

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

const INACTIVITY_MS = 60000;

export default function QuizScreen({ questions, ttsOn, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedLength, setTypedLength] = useState(0);
  const [firstAttemptWrong, setFirstAttemptWrong] = useState(false);
  const [correctRevealed, setCorrectRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [lastCorrectIdx, setLastCorrectIdx] = useState(-1);
  const [shakingIdx, setShakingIdx] = useState(null);
  const [typingMode, setTypingMode] = useState("type");

  const inputRef = useRef(null);
  const typingAreaRef = useRef(null);
  const lastCorrectTimer = useRef(null);
  const shakingTimer = useRef(null);
  const inactivityTimer = useRef(null);
  // Guards against stale onEnd / setTimeout callbacks when user switches options or questions
  const ttsActive = useRef(false);

  const q = questions[current];
  const targetText = correctRevealed
    ? q.a[q.correct]
    : (selectedOption !== null ? q.a[selectedOption] : "");
  const isComplete = targetText.length > 0 && typedLength === targetText.length;
  const submitEnabled = isComplete || (typingMode === "tap" && selectedOption !== null && !correctRevealed);

  // Current char — every character including spaces must be typed
  const currentCharIdx =
    isComplete || (selectedOption === null && !correctRevealed) || typedLength >= targetText.length
      ? -1
      : typedLength;

  // Read question + SHORT option labels when question changes or TTS is toggled on
  useEffect(() => {
    ttsActive.current = false;
    stopSpeech();
    setIsSpeaking(false);
    clearTimeout(inactivityTimer.current);
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
      clearTimeout(inactivityTimer.current);
    };
  }, [current, ttsOn]);

  // Focus the hidden input after option selection or correct-answer reveal.
  // Keyboard event listeners (below) handle scrolling once we know the real keyboard height.
  useEffect(() => {
    if (selectedOption !== null || correctRevealed) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        // If keyboard is already open (e.g., switching options), event won't re-fire — scroll now.
        if (keyboardHeight > 0) {
          scrollTypingAreaIntoView(keyboardHeight);
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [selectedOption, correctRevealed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll so the typing area's bottom sits above the keyboard with a small gap.
  function scrollTypingAreaIntoView(height) {
    const el = typingAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const visibleBottom = window.innerHeight - height;
    const gap = 24;
    if (rect.bottom > visibleBottom - gap) {
      window.scrollBy({ top: rect.bottom - visibleBottom + gap, behavior: "smooth" });
    } else if (rect.top < 0) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Track real keyboard height via Capacitor plugin (native) or visualViewport (web).
  // This replaces the prior 350ms-guess scroll and the 40vh paddingBottom guess.
  useEffect(() => {
    const onShow = (height) => {
      setKeyboardHeight(height);
      requestAnimationFrame(() => scrollTypingAreaIntoView(height));
    };
    const onHide = () => setKeyboardHeight(0);

    if (Capacitor.isNativePlatform()) {
      const subs = [];
      Keyboard.addListener("keyboardDidShow", (info) => onShow(info.keyboardHeight))
        .then((sub) => subs.push(sub));
      Keyboard.addListener("keyboardWillHide", onHide).then((sub) => subs.push(sub));
      return () => subs.forEach((s) => s.remove());
    }

    if (typeof window !== "undefined" && window.visualViewport) {
      const vv = window.visualViewport;
      const onResize = () => {
        const diff = window.innerHeight - vv.height;
        if (diff > 150) onShow(diff);
        else onHide();
      };
      vv.addEventListener("resize", onResize);
      return () => vv.removeEventListener("resize", onResize);
    }
  }, []);

  useEffect(() => () => {
    clearTimeout(lastCorrectTimer.current);
    clearTimeout(shakingTimer.current);
    clearTimeout(inactivityTimer.current);
  }, []);

  // After 60s without typing, re-speak the expected char so idle users can pick back up.
  function scheduleInactivity(answer, position) {
    clearTimeout(inactivityTimer.current);
    if (position >= answer.length) return;
    inactivityTimer.current = setTimeout(() => {
      if (!ttsOn) return;
      ttsActive.current = true;
      speak(getCharLabel(answer[position]));
    }, INACTIVITY_MS);
  }

  function handleOptionSelect(idx) {
    ttsActive.current = false;
    stopSpeech();
    setIsSpeaking(false);
    clearTimeout(inactivityTimer.current);

    setSelectedOption(idx);
    setTypedLength(0);
    setCorrectRevealed(false);
    if (inputRef.current) inputRef.current.value = "";

    const fullAnswer = q.a[idx];

    if (ttsOn) {
      const label = getLabel(q, idx);
      // Read the SHORT label aloud, then after 300 ms call out the first character to type
      ttsActive.current = true;
      speak(label, () => {
        if (!ttsActive.current) return;
        if (typingMode === "tap") return;
        setTimeout(() => {
          if (!ttsActive.current) return;
          speak(getCharLabel(fullAnswer[0]));
        }, 300);
      });
    }

    if (typingMode === "type") scheduleInactivity(fullAnswer, 0);
  }

  function handleInputChange(e) {
    if (selectedOption === null && !correctRevealed) return;
    const val = e.target.value;
    if (!val) return;

    const typedChar = val[val.length - 1];
    e.target.value = "";

    const answer = targetText;
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

      if (newLen < answer.length) {
        scheduleInactivity(answer, newLen);
      } else {
        clearTimeout(inactivityTimer.current);
      }
    } else {
      // Wrong letter: re-speak the expected char and reset the idle timer.
      // Don't advance typedLength or show any visual feedback.
      ttsActive.current = false;
      if (ttsOn) {
        ttsActive.current = true;
        speak(getCharLabel(answer[expectedIdx]));
      }
      scheduleInactivity(answer, expectedIdx);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isComplete) { e.preventDefault(); handleSubmit(); }
  }

  function handlePaste(e) { e.preventDefault(); }

  function advanceQuestion(newAnswers) {
    clearTimeout(inactivityTimer.current);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        onFinish(newAnswers);
      } else {
        setCurrent((c) => c + 1);
        setSelectedOption(null);
        setTypedLength(0);
        setFirstAttemptWrong(false);
        setCorrectRevealed(false);
        setTypingMode("type");
        if (inputRef.current) inputRef.current.value = "";
      }
    }, 500);
  }

  function handleSubmit() {
    clearTimeout(inactivityTimer.current);

    if (correctRevealed) {
      // Already marked wrong on first attempt; they've now typed the correct answer.
      ttsActive.current = false;
      const newAnswers = [...answers, { correct: false }];
      setAnswers(newAnswers);
      stopSpeech();

      if (ttsOn) {
        setIsSpeaking(true);
        ttsActive.current = true;
        speak("Got it.", () => {
          setIsSpeaking(false);
          advanceQuestion(newAnswers);
        });
      } else {
        advanceQuestion(newAnswers);
      }
      return;
    }

    const isCorrect = selectedOption === q.correct;
    if (isCorrect) {
      ttsActive.current = false;
      setIsSpeaking(false);
      const newAnswers = [...answers, { correct: !firstAttemptWrong }];
      setAnswers(newAnswers);
      stopSpeech();

      if (ttsOn) {
        setIsSpeaking(true);
        ttsActive.current = true;
        speak(firstAttemptWrong ? "Got it." : "Correct!", () => {
          setIsSpeaking(false);
          advanceQuestion(newAnswers);
        });
      } else {
        advanceQuestion(newAnswers);
      }
    } else {
      // Wrong option: mark the attempt wrong, reveal the correct answer as the
      // new typing target. The user types the correct answer to proceed; scoring
      // stays hidden until results.
      ttsActive.current = false;
      setIsSpeaking(false);
      stopSpeech();

      // Shake animation on the wrong button
      const wrongIdx = selectedOption;
      setShakingIdx(wrongIdx);
      clearTimeout(shakingTimer.current);
      shakingTimer.current = setTimeout(() => setShakingIdx(null), 400);

      setFirstAttemptWrong(true);
      setCorrectRevealed(true);
      setTypedLength(0);
      setTypingMode("type");
      if (inputRef.current) inputRef.current.value = "";

      const correctLabel = getLabel(q, q.correct);
      const correctAnswer = q.a[q.correct];

      if (ttsOn) {
        setIsSpeaking(true);
        ttsActive.current = true;
        speak(`The correct answer is: ${correctLabel}`, () => {
          if (!ttsActive.current) { setIsSpeaking(false); return; }
          setTimeout(() => {
            if (!ttsActive.current) { setIsSpeaking(false); return; }
            speak(getCharLabel(correctAnswer[0]), () => {
              setIsSpeaking(false);
            });
          }, 300);
        });
      }

      scheduleInactivity(correctAnswer, 0);
    }
  }

  const progress = (current / questions.length) * 100;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both", paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 0, transition: "padding-bottom 0.3s ease" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", fontFamily: "'Barlow Condensed', sans-serif" }}>
            Question {current + 1} of {questions.length}
          </span>
          <span aria-live="polite" style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            {answers.filter((a) => a.correct).length} correct
            {isSpeaking && <span aria-hidden="true" style={{ display: "inline-block", animation: "speakPulse 1s ease infinite", fontSize: 12 }}>🔊</span>}
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#E81828,#F0C040)", width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize: 26, fontWeight: 700, color: "#FAEBD7", lineHeight: 1.5, marginBottom: 14, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {q.q}
      </div>

      {/* Typing-mode toggle — bypass the per-character typing step for this question */}
      {!isComplete && !correctRevealed && (
        <button
          onClick={() => setTypingMode((m) => (m === "type" ? "tap" : "type"))}
          aria-label={typingMode === "type" ? "Switch to tap-only answering" : "Switch to type-the-answer mode"}
          style={{
            background: typingMode === "tap" ? "rgba(240,192,64,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${typingMode === "tap" ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: 99,
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: "'Barlow Condensed', sans-serif",
            color: typingMode === "tap" ? "#F0C040" : "#c8c0b4",
            cursor: "pointer",
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            touchAction: "manipulation",
            transition: "all 0.15s ease",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: typingMode === "tap" ? "#F0C040" : "#c8c0b4",
              display: "inline-block",
              transition: "background 0.15s ease",
            }}
          />
          {typingMode === "tap" ? "Tap to answer" : "Type to answer"}
        </button>
      )}

      {/* A/B option buttons — show SHORT labels only */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {q.a.map((_, idx) => {
          const label = getLabel(q, idx);
          const isSelected = selectedOption === idx;
          const isShaking = shakingIdx === idx;
          const letter = String.fromCharCode(65 + idx); // "A" or "B"

          let cardBg = "rgba(255,255,255,0.04)";
          let cardBorder = "rgba(255,255,255,0.1)";
          let labelColor = "#c8c0b4";
          let badgeBg = "rgba(255,255,255,0.08)";
          let badgeColor = "#666";

          if (isSelected) {
            cardBg = "rgba(240,192,64,0.08)";
            cardBorder = "rgba(240,192,64,0.5)";
            labelColor = "#F0C040";
            badgeBg = "rgba(240,192,64,0.2)";
            badgeColor = "#F0C040";
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              aria-label={`Option ${letter}: ${label}`}
              style={{
                background: cardBg,
                border: `2px solid ${cardBorder}`,
                borderRadius: 16,
                padding: "16px 18px",
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                transition: "all 0.15s ease",
                minHeight: 88,
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                gap: 16,
                animation: isShaking ? "shake 0.3s ease" : undefined,
                ...noCallout,
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
                  fontSize: 22,
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
              {isSelected && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#F0C040", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, whiteSpace: "nowrap" }}>
                  Selected ↓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Typing area — shown after option is selected, displays the FULL answer to type.
          Also shown when the user got the option wrong and the correct answer is revealed. */}
      {(correctRevealed || (selectedOption !== null && typingMode === "type")) && (
        <div
          ref={typingAreaRef}
          onClick={() => inputRef.current?.focus()}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 14,
            cursor: "text",
            position: "relative",
            overflow: "hidden",
            maxWidth: "100%",
            touchAction: "manipulation",
            ...noCallout,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: correctRevealed ? "#f87171" : "#a09a90", marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {correctRevealed ? "Correct answer — type it:" : "Type the answer:"}
          </div>
          {/* Full answer text — no letter-spacing, break-word so long answers wrap cleanly */}
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.9,
            fontFamily: "'Barlow Condensed', sans-serif",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            overflow: "hidden",
            maxWidth: "100%",
            ...noCallout,
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
            {isComplete && <span role="img" aria-label="Answer complete" style={{ color: "#4ade80", marginLeft: 6, fontSize: 22 }}>✓</span>}
          </div>
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
            aria-label="Type your answer here"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", fontSize: 16, border: "none", background: "transparent" }}
          />
        </div>
      )}

      {submitEnabled && (
        <button
          onClick={handleSubmit}
          aria-label={current + 1 >= questions.length ? "See results" : "Submit answer"}
          style={{ width: "100%", background: "linear-gradient(135deg,#E81828,#a01020)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase", animation: "fadeUp 0.25s ease both", minHeight: 64, touchAction: "manipulation" }}
        >
          {current + 1 >= questions.length ? "See Results" : "Submit Answer →"}
        </button>
      )}

      {selectedOption === null && !correctRevealed && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#555", fontWeight: 600, marginTop: 4 }}>
          Select an answer above to start typing
        </div>
      )}
    </div>
  );
}

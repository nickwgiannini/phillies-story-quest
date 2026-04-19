import React, { useState, useEffect, useRef } from "react";
import { loadDB, saveDB } from "./utils/storage.js";
import { fetchLatestPhilliesGame } from "./utils/gameData.js";
import { requestNotificationPermission, sendLocalNotification } from "./utils/notifications.js";
import { stopSpeech } from "./utils/tts.js";
import TopBar from "./components/TopBar.jsx";
import GameHeader from "./components/GameHeader.jsx";
import StoryScreen from "./components/StoryScreen.jsx";
import QuizScreen from "./components/QuizScreen.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import HistoryScreen from "./components/HistoryScreen.jsx";
import LoadingDots from "./components/LoadingDots.jsx";

const SCREENS = { LOADING: "loading", STORY: "story", QUIZ: "quiz", RESULTS: "results", HISTORY: "history" };
const POLL_MS = 30 * 60 * 1000;

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOADING);
  const [db, setDb] = useState(loadDB);
  const [game, setGame] = useState(null);
  const [content, setContent] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [ttsOn, setTtsOn] = useState(true);
  const [notifStatus, setNotifStatus] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  // Unlock Web Speech API on first user interaction (browsers block autoplay until then)
  useEffect(() => {
    const unlockAudio = () => {
      if (window.speechSynthesis) {
        const utt = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(utt);
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('click', unlockAudio);
    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, []);

  useEffect(() => { loadGame(); }, []);

  useEffect(() => {
    pollRef.current = setInterval(() => checkForNewGame(), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadGame(forceRefresh = false) {
    setScreen(SCREENS.LOADING);
    setError(null);
    try {
      if (forceRefresh) {
        // Clear localStorage cache so generateContentFromBoxScore re-generates
        try {
          const currentDb = dbRef.current;
          if (currentDb.lastGameId) localStorage.removeItem(`phillies_content_v3_${currentDb.lastGameId}`);
        } catch {}
      }
      const latestGame = await fetchLatestPhilliesGame();
      if (!latestGame) throw new Error("Could not fetch game data.");
      const { story, questions, ...gameData } = latestGame;
      setGame(gameData);
      setContent({ story, questions });
      setScreen(SCREENS.STORY);
      if (questions?.length > 0) {
        setDb((prevDb) => {
          const newDb = { ...prevDb, lastGameId: latestGame.id };
          saveDB(newDb);
          return newDb;
        });
      }
    } catch (err) {
      setError(err.message);
      setScreen(SCREENS.LOADING);
    }
  }

  async function checkForNewGame() {
    try {
      const latestGame = await fetchLatestPhilliesGame();
      if (!latestGame || latestGame.id === dbRef.current.lastGameId) return;
      sendLocalNotification(
        "Phillies Story Quest",
        `Game over! PHI ${latestGame.philliesScore} - ${latestGame.opponentAbbr} ${latestGame.opponentScore}. New quiz ready - tap to play!`
      );
      await loadGame(true);
    } catch {}
  }

  async function handleEnableNotifs() {
    const result = await requestNotificationPermission();
    setNotifStatus(result);
  }

  function handleQuizFinish(finalAnswers) {
    const correct = finalAnswers.filter((a) => a.correct).length;
    const total = finalAnswers.length;
    const score = Math.round((correct / total) * 100);
    const session = {
      id: Date.now(),
      game: "PHI vs " + (game?.opponentAbbr ?? "???"),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      score, correct, total,
    };
    setDb((prevDb) => {
      const newDb = { ...prevDb, sessions: [...prevDb.sessions, session] };
      saveDB(newDb);
      return newDb;
    });
    setAnswers(finalAnswers);
    setScreen(SCREENS.RESULTS);
  }

  function handlePlayAgain() { stopSpeech(); setAnswers([]); setScreen(SCREENS.STORY); }
  const overallAvg = db.sessions.length > 0 ? Math.round(db.sessions.reduce((s, x) => s + x.score, 0) / db.sessions.length) : null;
  const outer = { minHeight: "100vh", background: "radial-gradient(ellipse at 20% 0%,rgba(0,45,98,0.25) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(232,24,40,0.1) 0%,transparent 50%),#0a0f14" };
  // paddingBottom 200px ensures content is always reachable above the tablet keyboard
  const inner = { maxWidth: 560, margin: "0 auto", padding: "16px 18px 200px" };

  if (screen === SCREENS.LOADING) {
    return (
      <div style={outer}>
        <div style={{ ...inner, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <span aria-hidden="true" style={{ fontSize: 48, marginBottom: 16 }}>⚾</span>
          <LoadingDots />
          <div style={{ fontSize: 13, color: "#a09a90", marginTop: 12, fontWeight: 600 }}>{error ? "Error: " + error : "Loading latest Phillies game..."}</div>
          {error && <button onClick={() => loadGame()} style={{ marginTop: 16, background: "rgba(232,24,40,0.15)", border: "1px solid rgba(232,24,40,0.3)", borderRadius: 10, padding: "10px 20px", color: "#E81828", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Retry</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={outer}>
      <div style={inner}>
        <TopBar ttsOn={ttsOn} setTtsOn={setTtsOn} overallAvg={overallAvg} onHistory={() => { stopSpeech(); setScreen(SCREENS.HISTORY); }} notifStatus={notifStatus} onEnableNotifs={handleEnableNotifs} />
        {/* Sticky wrapper gives the score banner a solid background so it covers scrolled content */}
        {game && (
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0f14", marginLeft: -18, marginRight: -18, padding: "0 18px 4px" }}>
            <GameHeader game={game} />
          </div>
        )}
        {screen === SCREENS.STORY && <StoryScreen story={content?.story} ttsOn={ttsOn} onStartQuiz={() => { stopSpeech(); setScreen(SCREENS.QUIZ); }} />}
        {screen === SCREENS.QUIZ && content?.questions?.length > 0 && <QuizScreen questions={content.questions} ttsOn={ttsOn} onFinish={handleQuizFinish} />}
        {screen === SCREENS.QUIZ && !(content?.questions?.length > 0) && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 12 }}>⚾</div>
            <div style={{ color: "#f87171", fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>Quiz not available yet — check back soon!</div>
            <button onClick={() => setScreen(SCREENS.STORY)} style={{ background: "rgba(232,24,40,0.15)", border: "1px solid rgba(232,24,40,0.3)", borderRadius: 10, padding: "10px 20px", color: "#E81828", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Back to Story</button>
          </div>
        )}
        {screen === SCREENS.RESULTS && <ResultsScreen answers={answers} questions={content?.questions ?? []} ttsOn={ttsOn} onPlayAgain={handlePlayAgain} onHistory={() => { stopSpeech(); setScreen(SCREENS.HISTORY); }} />}
        {screen === SCREENS.HISTORY && <HistoryScreen db={db} setDb={setDb} onBack={() => setScreen(SCREENS.STORY)} />}
      </div>
    </div>
  );
}

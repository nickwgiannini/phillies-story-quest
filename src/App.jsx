import React, { useState, useEffect, useRef } from "react";
import { loadDB, saveDB } from "./utils/storage.js";
import { fetchLatestPhilliesGame } from "./utils/gameData.js";
import { generateGameContent } from "./utils/aiGenerate.js";
import { registerServiceWorker, requestNotificationPermission, sendLocalNotification } from "./utils/notifications.js";
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
  const [ttsOn, setTtsOn] = useState(false);
  const [notifStatus, setNotifStatus] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => { registerServiceWorker(); loadGame(); }, []);
  useEffect(() => {
    pollRef.current = setInterval(() => checkForNewGame(), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [db.lastGameId]);

  async function loadGame(forceRefresh = false) {
    setScreen(SCREENS.LOADING);
    setError(null);
    try {
      const latestGame = await fetchLatestPhilliesGame();
      if (!latestGame) throw new Error("Could not fetch game data.");
      const cached = db["content_" + latestGame.id];
      if (cached && !forceRefresh) { setGame(latestGame); setContent(cached); setScreen(SCREENS.STORY); return; }
      setGame(latestGame);
      setLoadingContent(true);
      setScreen(SCREENS.STORY);
      const generated = await generateGameContent(latestGame);
      setContent(generated);
      setLoadingContent(false);
      const newDb = { ...db, ["content_" + latestGame.id]: generated, lastGameId: latestGame.id };
      setDb(newDb);
      saveDB(newDb);
    } catch (err) {
      setError(err.message);
      setScreen(SCREENS.LOADING);
      setLoadingContent(false);
    }
  }

  async function checkForNewGame() {
    try {
      const latestGame = await fetchLatestPhilliesGame();
      if (!latestGame || latestGame.id === db.lastGameId) return;
      sendLocalNotification("Phillies Story Quest", `New game: PHI ${latestGame.philliesScore} - ${latestGame.opponentAbbr} ${latestGame.opponentScore}. Tap to play!`);
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
    const session = { id: Date.now(), game: "PHI vs " + (game?.opponentAbbr ?? "???"), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), score, correct, total };
    const newDb = { ...db, sessions: [...db.sessions, session] };
    setDb(newDb); saveDB(newDb);
    setAnswers(finalAnswers);
    setScreen(SCREENS.RESULTS);
  }

  function handlePlayAgain() { stopSpeech(); setAnswers([]); setScreen(SCREENS.STORY); }
  const overallAvg = db.sessions.length > 0 ? Math.round(db.sessions.reduce((s, x) => s + x.score, 0) / db.sessions.length) : null;
  const outer = { minHeight: "100vh", background: "radial-gradient(ellipse at 20% 0%,rgba(0,45,98,0.25) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(232,24,40,0.1) 0%,transparent 50%),#0a0f14" };
  const inner = { maxWidth: 560, margin: "0 auto", padding: "16px 18px 48px" };

  if (screen === SCREENS.LOADING) {
    return (
      <div style={outer}>
        <div style={{ ...inner, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>?</span>
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
        {game && <GameHeader game={game} />}
        {screen === SCREENS.STORY && <StoryScreen story={content?.story} ttsOn={ttsOn} onStartQuiz={() => { stopSpeech(); setScreen(SCREENS.QUIZ); }} loading={loadingContent} />}
        {screen === SCREENS.QUIZ && content?.questions && <QuizScreen questions={content.questions} ttsOn={ttsOn} onFinish={handleQuizFinish} />}
        {screen === SCREENS.RESULTS && <ResultsScreen answers={answers} questions={content?.questions ?? []} ttsOn={ttsOn} onPlayAgain={handlePlayAgain} onHistory={() => { stopSpeech(); setScreen(SCREENS.HISTORY); }} />}
        {screen === SCREENS.HISTORY && <HistoryScreen db={db} setDb={setDb} onBack={() => setScreen(SCREENS.STORY)} />}
      </div>
    </div>
  );
}

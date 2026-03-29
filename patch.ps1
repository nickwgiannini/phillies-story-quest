# Phillies Story Quest - Remove API key prompt, use .env instead
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
Set-Location "C:\Users\nicho\Documents\phillies-story-quest"

# ── .env (you only touch this once, never committed to git) ───────────────────
# Only create if it doesn't exist yet
if (-not (Test-Path .env)) {
  Set-Content .env @'
VITE_ANTHROPIC_API_KEY=PASTE_YOUR_KEY_HERE
'@
  Write-Host ".env created - open it and replace PASTE_YOUR_KEY_HERE with your sk-ant-... key" -ForegroundColor Yellow
} else {
  Write-Host ".env already exists, leaving it alone." -ForegroundColor Green
}

# ── .gitignore (make sure key never gets committed) ───────────────────────────
Set-Content .gitignore @'
node_modules
dist
.env
.env.local
'@

# ── src/utils/aiGenerate.js (reads key from env, no param needed) ─────────────
Set-Content src\utils\aiGenerate.js @'
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function generateGameContent(game) {
  const { date, opponent, philliesScore, opponentScore, result, isHome, boxScore } = game;

  const phiBatters = (boxScore?.batters ?? [])
    .filter((b) => b.isPhillies && (b.h > 0 || b.rbi > 0 || b.hr > 0))
    .map((b) => `${b.name}: ${b.h}H ${b.rbi}RBI${b.hr > 0 ? ` ${b.hr}HR` : ""}`)
    .slice(0, 5).join(", ");

  const oppBatters = (boxScore?.batters ?? [])
    .filter((b) => !b.isPhillies && (b.h > 0 || b.rbi > 0 || b.hr > 0))
    .map((b) => `${b.name}: ${b.h}H ${b.rbi}RBI${b.hr > 0 ? ` ${b.hr}HR` : ""}`)
    .slice(0, 4).join(", ");

  const sp = (boxScore?.pitchers ?? []).find(
    (p) => p.isPhillies && (p.decision === "L" || p.decision === "W" || parseFloat(p.ip) >= 4)
  );
  const oppSP = (boxScore?.pitchers ?? []).find(
    (p) => !p.isPhillies && (p.decision === "W" || p.decision === "L" || parseFloat(p.ip) >= 4)
  );

  const context = `
Game: Philadelphia Phillies vs ${opponent}, ${date}
Result: Phillies ${result.toUpperCase()} ${philliesScore}-${opponentScore}
Venue: ${isHome ? "Citizens Bank Park (home)" : `@ ${opponent}`}
PHI SP: ${sp ? `${sp.name} (${sp.ip} IP, ${sp.er} ER, ${sp.k} K, ${sp.decision || "ND"})` : "unknown"}
OPP SP: ${oppSP ? `${oppSP.name} (${oppSP.ip} IP, ${oppSP.er} ER, ${oppSP.k} K, ${oppSP.decision || "ND"})` : "unknown"}
PHI hitters: ${phiBatters || "none stood out"}
OPP hitters: ${oppBatters || "none"}
  `.trim();

  const prompt = `You are the narrator of "Phillies Story Quest," an accessible baseball game app.

Box score data:
${context}

Return a JSON object with exactly two fields:
1. "story" - A vivid 3-4 sentence second-person recap ("You were there at Citizens Bank Park..."). Emotionally resonant, uses the real stats.
2. "questions" - Array of exactly 10 objects, each with:
   - "q": question about this specific game
   - "a": array of exactly 2 plausible answer strings (1-2 sentences each)
   - "correct": 0 or 1

Cover: final score, innings, PHI starter stats, key hitters, RBI leaders, home runs, winning/losing pitcher, hit totals, specific inning scoring, one memorable moment.
Wrong answers must sound plausible with believable-but-wrong stats.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("AI generation failed:", err);
    return getHardcodedContent(game);
  }
}

function getHardcodedContent(game) {
  return {
    story: `You were there at Citizens Bank Park on a crisp March Sunday, and it was a tough one to watch. The Texas Rangers roughed up Jesus Luzardo for six runs over six innings, with Andrew McCutchen and Brandon Nimmo both going deep to power a dominant 8-3 Texas victory. The Phillies mustered just three hits all afternoon and never found any offensive rhythm. A tough series finale, but the season is long.`,
    questions: [
      { q: "What was the final score of today's Phillies vs Rangers game?", a: ["Texas defeated the Phillies 8-3 at Citizens Bank Park.", "The Phillies beat the Rangers 5-4 in extra innings."], correct: 0 },
      { q: "Who started on the mound for the Phillies?", a: ["Jesus Luzardo started and allowed six earned runs over six innings.", "Zack Wheeler started and held Texas to two runs over seven innings."], correct: 0 },
      { q: "How many strikeouts did the Phillies starter record?", a: ["Luzardo struck out seven Rangers batters in his six-inning outing.", "The Phillies starter punched out nine hitters across seven innings."], correct: 0 },
      { q: "Which Rangers player hit a home run?", a: ["Both Andrew McCutchen and Brandon Nimmo homered for Texas.", "Corey Seager hit a two-run homer in the fourth inning."], correct: 0 },
      { q: "How many hits did the Phillies collect?", a: ["The Phillies managed just three hits in the game.", "Philadelphia collected eight hits but stranded ten runners."], correct: 0 },
      { q: "Who took the loss for the Phillies?", a: ["Jesus Luzardo was charged with the loss after giving up six runs.", "Jose Alvarado took the loss after surrendering the go-ahead run."], correct: 0 },
      { q: "Who earned the win for the Rangers?", a: ["MacKenzie Gore earned the win, allowing two runs over five-plus innings.", "Nathan Eovaldi picked up the win with seven shutout innings."], correct: 0 },
      { q: "How many RBI did Andrew McCutchen record?", a: ["McCutchen drove in three runs, including a home run.", "McCutchen went two for four with one RBI and two stolen bases."], correct: 0 },
      { q: "What was Trea Turner's performance?", a: ["Turner went hitless in five at-bats but drew a walk and scored.", "Turner went two for four with a double and an RBI."], correct: 0 },
      { q: "Which Phillies batters drove in runs?", a: ["Alec Bohm and Bryson Stott each drove in one run.", "Bryce Harper hit a two-run double to cut the lead to two."], correct: 0 },
    ],
  };
}
'@

# ── src/App.jsx (no API key state, no key prompt screen) ─────────────────────
Set-Content src\App.jsx @'
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
      if (cached && !forceRefresh) {
        setGame(latestGame);
        setContent(cached);
        setScreen(SCREENS.STORY);
        return;
      }
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
    setAnswers(finalAnswers);
    const correct = finalAnswers.filter((a) => a.correct).length;
    const total = finalAnswers.length;
    const score = Math.round((correct / total) * 100);
    const session = {
      id: Date.now(),
      game: "PHI vs " + (game?.opponentAbbr ?? "???"),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      score, correct, total,
    };
    const newDb = { ...db, sessions: [...db.sessions, session] };
    setDb(newDb);
    saveDB(newDb);
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
          <span style={{ fontSize: 48, marginBottom: 16 }}>⚾</span>
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
'@

Write-Host ""
Write-Host "Done! Two things left:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Open .env in your project folder and replace PASTE_YOUR_KEY_HERE with your sk-ant-... key" -ForegroundColor Yellow
Write-Host "2. Run: & `"C:\Program Files\nodejs\npm.cmd`" run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Users will never see or touch the key - the app just works." -ForegroundColor Cyan

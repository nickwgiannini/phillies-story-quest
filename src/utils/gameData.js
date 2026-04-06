const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const ESPN_SCHEDULE_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/phi/schedule";
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function fetchLatestPhilliesGame() {
  try {
    const game = (await findRecentCompletedGame()) ?? (await fetchFromSchedule());
    return game ?? getFallbackGame();
  } catch (err) {
    console.error("fetchLatestPhilliesGame failed:", err);
    return getFallbackGame();
  }
}

// Check the last 14 days of scoreboards to find the most recently completed Phillies game
async function findRecentCompletedGame() {
  const now = new Date();
  for (let d = 0; d <= 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr =
      `${date.getFullYear()}` +
      `${String(date.getMonth() + 1).padStart(2, "0")}` +
      `${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(`${ESPN_SCOREBOARD_URL}?dates=${dateStr}`);
      const data = await res.json();
      const phiGame = (data?.events ?? []).find((e) => {
        const comp = e.competitions?.[0];
        return (
          comp?.status?.type?.completed &&
          comp.competitors.some((c) => c.team?.abbreviation === "PHI")
        );
      });
      if (phiGame) return parseGameEvent(phiGame);
    } catch {}
  }
  return null;
}

// Fallback: use the team schedule endpoint
async function fetchFromSchedule() {
  const res = await fetch(ESPN_SCHEDULE_URL);
  const data = await res.json();
  const completed = (data?.events ?? [])
    .filter((e) => e.competitions?.[0]?.status?.type?.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return completed.length ? parseGameEvent(completed[0]) : null;
}

async function parseGameEvent(game) {
  const comp = game.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  const phi = [home, away].find((t) => t.team.abbreviation === "PHI");
  const opp = [home, away].find((t) => t.team.abbreviation !== "PHI");
  const philliesScore = parseInt(phi?.score) || 0;
  const opponentScore = parseInt(opp?.score) || 0;
  const boxScore = await fetchBoxScore(game.id);
  const gameInfo = {
    date: new Date(game.date).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }),
    opponent: opp?.team?.displayName ?? "Unknown",
    philliesScore,
    opponentScore,
    result: philliesScore > opponentScore ? "win" : "loss",
    isHome: phi?.homeAway === "home",
  };
  const { story, questions } = await generateContentFromBoxScore(game.id, boxScore, gameInfo);
  return {
    id: game.id,
    ...gameInfo,
    opponentAbbr: opp?.team?.abbreviation ?? "???",
    boxScore,
    story,
    questions,
  };
}

async function generateContentFromBoxScore(gameId, boxScore, gameInfo) {
  const cacheKey = `phillies_content_${gameId}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.questions?.length > 0) return parsed;
    }
  } catch {}

  const { date, opponent, philliesScore, opponentScore, result, isHome } = gameInfo;
  const prompt = `You are the narrator of "Phillies Story Quest," an accessible baseball app.

Game context:
- Date: ${date}
- Phillies ${result.toUpperCase()} ${philliesScore}-${opponentScore} vs ${opponent}
- Venue: ${isHome ? "Citizens Bank Park (home)" : `@ ${opponent}`}

Full box score (JSON):
${JSON.stringify(boxScore, null, 2)}

Return a single JSON object with this exact shape:
{
  "story": "2-3 sentence recap of the game",
  "questions": [
    {
      "q": "Question text?",
      "a": [
        "Correct answer — approximately 200 characters long...",
        "Wrong but plausible answer — approximately 200 characters long..."
      ],
      "correct": 0
    }
  ]
}

Rules:
- Generate exactly 10 questions based on real stats from the box score
- Each answer (both correct AND incorrect) must be approximately 200 characters long
- correct is always 0 (the correct answer is always a[0])
- Questions must cover: final score, key hitters, pitcher performance, home runs, RBIs, innings pitched, winning/losing pitcher, notable plays
- Return ONLY the raw JSON object — no markdown, no backticks, no extra text`;

  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Claude API error:", res.status, data);
      throw new Error(`API ${res.status}`);
    }
    const text = data.content?.[0]?.text ?? "";
    console.log("Claude raw response:", text.slice(0, 200));
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const result = JSON.parse(cleaned);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}
    return result;
  } catch (err) {
    console.error("AI content generation failed:", err);
    return { story: "Questions loading...", questions: [] };
  }
}

async function fetchBoxScore(gameId) {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`
    );
    const data = await res.json();
    const batters = [];
    const pitchers = [];
    for (const team of data?.boxscore?.players ?? []) {
      const isPHI = team.team?.abbreviation === "PHI";
      for (const group of team.statistics ?? []) {
        for (const athlete of group.athletes ?? []) {
          const s = Object.fromEntries((group.labels ?? []).map((l, i) => [l, athlete.stats?.[i] ?? "0"]));
          if (group.name === "batting") {
            batters.push({
              name: athlete.athlete?.displayName ?? "",
              isPhillies: isPHI,
              ab: parseInt(s.AB ?? 0), h: parseInt(s.H ?? 0),
              hr: parseInt(s.HR ?? 0), rbi: parseInt(s.RBI ?? 0),
              r: parseInt(s.R ?? 0), bb: parseInt(s.BB ?? 0),
            });
          }
          if (group.name === "pitching") {
            pitchers.push({
              name: athlete.athlete?.displayName ?? "",
              isPhillies: isPHI,
              ip: s.IP ?? "0", h: parseInt(s.H ?? 0),
              er: parseInt(s.ER ?? 0), bb: parseInt(s.BB ?? 0),
              k: parseInt(s.K ?? 0), decision: s.DEC ?? "",
            });
          }
        }
      }
    }
    return { batters, pitchers };
  } catch {
    return { batters: [], pitchers: [] };
  }
}

export function getFallbackGame() {
  return {
    id: "phi-tex-20260329",
    date: "Sunday, March 29, 2026",
    opponent: "Texas Rangers",
    opponentAbbr: "TEX",
    philliesScore: 3,
    opponentScore: 8,
    result: "loss",
    isHome: true,
    boxScore: {
      batters: [
        { name: "Trea Turner", isPhillies: true, ab: 5, h: 0, hr: 0, rbi: 0, r: 1, bb: 1 },
        { name: "Bryce Harper", isPhillies: true, ab: 4, h: 0, hr: 0, rbi: 0, r: 1, bb: 2 },
        { name: "Kyle Schwarber", isPhillies: true, ab: 4, h: 1, hr: 0, rbi: 0, r: 0, bb: 0 },
        { name: "Alec Bohm", isPhillies: true, ab: 4, h: 0, hr: 0, rbi: 1, r: 0, bb: 1 },
        { name: "Bryson Stott", isPhillies: true, ab: 2, h: 1, hr: 0, rbi: 1, r: 0, bb: 0 },
        { name: "Justin Crawford", isPhillies: true, ab: 3, h: 1, hr: 0, rbi: 0, r: 1, bb: 0 },
        { name: "J.T. Realmuto", isPhillies: true, ab: 4, h: 0, hr: 0, rbi: 0, r: 0, bb: 2 },
        { name: "Andrew McCutchen", isPhillies: false, ab: 4, h: 2, hr: 1, rbi: 3, r: 2, bb: 0 },
        { name: "Brandon Nimmo", isPhillies: false, ab: 5, h: 2, hr: 1, rbi: 2, r: 1, bb: 0 },
      ],
      pitchers: [
        { name: "Jesus Luzardo", isPhillies: true, ip: "6.0", h: 6, er: 6, bb: 1, k: 7, decision: "L" },
        { name: "MacKenzie Gore", isPhillies: false, ip: "5.1", h: 2, er: 2, bb: 3, k: 7, decision: "W" },
      ],
    },
  };
}

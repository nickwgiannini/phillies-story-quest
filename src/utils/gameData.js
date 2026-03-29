const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/phi/schedule";

export async function fetchLatestPhilliesGame() {
  try {
    const res = await fetch(ESPN_URL);
    const data = await res.json();
    const events = data?.events ?? [];
    const completed = events
      .filter((e) => e.competitions?.[0]?.status?.type?.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!completed.length) return getFallbackGame();

    const game = completed[0];
    const comp = game.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const phi = [home, away].find((t) => t.team.abbreviation === "PHI");
    const opp = [home, away].find((t) => t.team.abbreviation !== "PHI");
    const philliesScore = parseInt(phi?.score ?? 0);
    const opponentScore = parseInt(opp?.score ?? 0);

    const boxScore = await fetchBoxScore(game.id);

    return {
      id: game.id,
      date: new Date(game.date).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }),
      opponent: opp?.team?.displayName ?? "Unknown",
      opponentAbbr: opp?.team?.abbreviation ?? "???",
      philliesScore,
      opponentScore,
      result: philliesScore > opponentScore ? "win" : "loss",
      isHome: phi?.homeAway === "home",
      boxScore,
    };
  } catch (err) {
    console.error("fetchLatestPhilliesGame failed:", err);
    return getFallbackGame();
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

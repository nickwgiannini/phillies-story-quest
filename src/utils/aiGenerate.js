const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function generateGameContent(game) {
  const { date, opponent, philliesScore, opponentScore, result, isHome, boxScore } = game;
  const phiBatters = (boxScore?.batters ?? []).filter((b) => b.isPhillies && (b.h > 0 || b.rbi > 0 || b.hr > 0)).map((b) => b.name + ": " + b.h + "H " + b.rbi + "RBI" + (b.hr > 0 ? " " + b.hr + "HR" : "")).slice(0, 5).join(", ");
  const oppBatters = (boxScore?.batters ?? []).filter((b) => !b.isPhillies && (b.h > 0 || b.rbi > 0 || b.hr > 0)).map((b) => b.name + ": " + b.h + "H " + b.rbi + "RBI" + (b.hr > 0 ? " " + b.hr + "HR" : "")).slice(0, 4).join(", ");
  const sp = (boxScore?.pitchers ?? []).find((p) => p.isPhillies && (p.decision === "L" || p.decision === "W" || parseFloat(p.ip) >= 4));
  const oppSP = (boxScore?.pitchers ?? []).find((p) => !p.isPhillies && (p.decision === "W" || p.decision === "L" || parseFloat(p.ip) >= 4));
  const venue = isHome ? "Citizens Bank Park (home)" : "@ " + opponent;
  const phiSP = sp ? (sp.name + " (" + sp.ip + " IP, " + sp.er + " ER, " + sp.k + " K, " + (sp.decision || "ND") + ")") : "unknown";
  const oppSPStr = oppSP ? (oppSP.name + " (" + oppSP.ip + " IP, " + oppSP.er + " ER, " + oppSP.k + " K, " + (oppSP.decision || "ND") + ")") : "unknown";
  const context = "Game: Philadelphia Phillies vs " + opponent + ", " + date + "\nResult: Phillies " + result.toUpperCase() + " " + philliesScore + "-" + opponentScore + "\nVenue: " + venue + "\nPHI SP: " + phiSP + "\nOPP SP: " + oppSPStr + "\nPHI hitters: " + (phiBatters || "none stood out") + "\nOPP hitters: " + (oppBatters || "none");
  const prompt = "You are the narrator of \"Phillies Story Quest,\" an accessible baseball game app.\n\nBox score data:\n" + context + "\n\nReturn a JSON object with exactly two fields:\n1. \"story\" - A vivid 3-4 sentence second-person recap (\"You were there at Citizens Bank Park...\"). Emotionally resonant, uses the real stats.\n2. \"questions\" - Array of exactly 10 objects, each with:\n   - \"q\": question about this specific game\n   - \"a\": array of exactly 2 plausible answer strings (1-2 sentences each)\n   - \"correct\": 0 or 1\n\nRespond ONLY with valid JSON. No markdown, no backticks, no explanation.";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("AI generation failed:", err);
    return { story: "The Phillies played today. Check back soon for the full recap.", questions: [] };
  }
}

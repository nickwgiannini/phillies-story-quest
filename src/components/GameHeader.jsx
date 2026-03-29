import React from "react";

function TeamRow({ abbr, name, score, isWinner, highlight }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: highlight ? "rgba(232,24,40,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${highlight ? "rgba(232,24,40,0.3)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: highlight ? "#E81828" : "#888", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
        {abbr}
      </div>
      <div style={{ fontSize: 14, fontWeight: highlight ? 600 : 400, color: highlight ? "#FAEBD7" : "#a09a90", minWidth: 160 }}>{name}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: isWinner ? (highlight ? "#4ade80" : "#FAEBD7") : "#a09a90", fontFamily: "'Barlow Condensed', sans-serif", minWidth: 32, textAlign: "right" }}>{score}</div>
    </div>
  );
}

export default function GameHeader({ game }) {
  const { date, opponent, opponentAbbr, philliesScore, opponentScore, result, isHome } = game;
  const isWin = result === "win";
  return (
    <div style={{ background: isWin ? "linear-gradient(135deg,rgba(74,222,128,0.08),rgba(0,45,98,0.2))" : "linear-gradient(135deg,rgba(232,24,40,0.1),rgba(0,45,98,0.15))", border: `1px solid ${isWin ? "rgba(74,222,128,0.2)" : "rgba(232,24,40,0.2)"}`, borderRadius: 16, padding: "18px 22px", marginBottom: 20, animation: "fadeUp 0.4s ease both" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#a09a90", marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {date} · {isHome ? "Citizens Bank Park" : `@ ${opponent}`}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <TeamRow abbr="PHI" name="Philadelphia Phillies" score={philliesScore} isWinner={isWin} highlight={true} />
          <TeamRow abbr={opponentAbbr} name={opponent} score={opponentScore} isWinner={!isWin} highlight={false} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif", color: isWin ? "#4ade80" : "#f87171", background: isWin ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${isWin ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`, borderRadius: 8, padding: "6px 14px" }}>
          {isWin ? "W - Phillies Win!" : "L - Tough Loss"}
        </div>
      </div>
    </div>
  );
}

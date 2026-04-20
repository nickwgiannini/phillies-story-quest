import React from "react";
import { saveDB } from "../utils/storage.js";

export default function HistoryScreen({ db, setDb, onBack }) {
  const avg = db.sessions.length > 0
    ? Math.round(db.sessions.reduce((s, x) => s + x.score, 0) / db.sessions.length)
    : null;

  function clearHistory() {
    const empty = { ...db, sessions: [] };
    setDb(empty);
    saveDB(empty);
  }

  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#FAEBD7", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>Score History</div>
        <button onClick={onBack} aria-label="Go back" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "6px 14px", color: "#a09a90", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif" }}>Back</button>
      </div>
      {avg !== null && (
        <div style={{ background: "rgba(232,24,40,0.08)", border: "1px solid rgba(232,24,40,0.2)", borderRadius: 16, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", minWidth: 70 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#E81828", lineHeight: 1, fontFamily: "'Barlow Condensed', sans-serif" }}>{avg}%</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a09a90", letterSpacing: 2, textTransform: "uppercase", marginTop: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>Overall Avg</div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, color: "#a09a90", fontWeight: 600, marginBottom: 8 }}>{db.sessions.length} session{db.sessions.length !== 1 ? "s" : ""}</div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#E81828,#F0C040)", width: `${avg}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        </div>
      )}
      {db.sessions.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "32px 24px", textAlign: "center", color: "#a09a90", fontSize: 14, fontWeight: 600 }}>
          No sessions yet — take a quiz to see your scores!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {[...db.sessions].reverse().map((s) => (
            <div key={s.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span aria-hidden="true" style={{ fontSize: 22 }}>⚾</span>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#FAEBD7", marginBottom: 2 }}>{s.game || "Phillies Game"}</div>
                <div style={{ fontSize: 13, color: "#a09a90", fontWeight: 600 }}>{s.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: s.score >= 70 ? "#4ade80" : s.score >= 50 ? "#F0C040" : "#f87171", lineHeight: 1 }}>{s.score}%</div>
                <div style={{ fontSize: 11, color: "#a09a90", fontWeight: 700 }}>{s.correct}/{s.total}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {db.sessions.length > 0 && (
        <button onClick={clearHistory} aria-label="Clear history" style={{ background: "none", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 18px", color: "#f87171", fontWeight: 700, fontSize: 12, width: "100%", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          Clear History
        </button>
      )}
    </div>
  );
}

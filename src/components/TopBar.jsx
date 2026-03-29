import React from "react";
import { stopSpeech } from "../utils/tts.js";

function Btn({ onClick, bg, border, color, children, ariaLabel }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 99,
      padding: "5px 13px", color, fontSize: 12, fontWeight: 700, cursor: "pointer",
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
    }}>
      {children}
    </button>
  );
}

export default function TopBar({ ttsOn, setTtsOn, overallAvg, onHistory, notifStatus, onEnableNotifs }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 20px", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 30 }}>⚾</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif" }}>
            Citizens Bank Park
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#FAEBD7", lineHeight: 1.1, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
            Phillies Story Quest
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {overallAvg !== null && (
          <span style={{ background: "rgba(232,24,40,0.12)", border: "1px solid rgba(232,24,40,0.3)", borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#E81828", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
            AVG {overallAvg}%
          </span>
        )}
        {notifStatus === "default" && (
          <Btn onClick={onEnableNotifs} bg="rgba(0,45,98,0.3)" border="rgba(0,45,98,0.6)" color="#7EB3FF" ariaLabel="Enable notifications">
            Notify
          </Btn>
        )}
        <Btn
          onClick={() => { stopSpeech(); setTtsOn((e) => !e); }}
          bg={ttsOn ? "rgba(240,192,64,0.12)" : "rgba(255,255,255,0.05)"}
          border={ttsOn ? "rgba(240,192,64,0.4)" : "rgba(255,255,255,0.1)"}
          color={ttsOn ? "#F0C040" : "#888"}
          ariaLabel="Toggle audio"
        >
          {ttsOn ? "Audio On" : "Audio Off"}
        </Btn>
        <Btn onClick={onHistory} bg="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.1)" color="#a09a90" ariaLabel="View history">
          History
        </Btn>
      </div>
    </div>
  );
}

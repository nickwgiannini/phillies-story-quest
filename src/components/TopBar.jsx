import React from "react";
import { stopSpeech } from "../utils/tts.js";

function Btn({ onClick, bg, border, color, children, ariaLabel }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 99,
      padding: "12px 20px", color, fontSize: 14, fontWeight: 700, cursor: "pointer",
      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
      minHeight: 52, touchAction: "manipulation", display: "flex", alignItems: "center",
    }}>
      {children}
    </button>
  );
}

export default function TopBar({ ttsOn, setTtsOn, overallAvg, onHistory, notifStatus, onEnableNotifs }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 20px", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>⚾</span>
          {overallAvg !== null && (
            <span style={{
              position: "absolute", bottom: -4, right: -14,
              background: "#E81828", border: "1.5px solid #0a0f14", borderRadius: 99,
              padding: "2px 6px", fontSize: 9, fontWeight: 900, color: "#fff",
              lineHeight: 1, whiteSpace: "nowrap",
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
            }}>
              {overallAvg}%
            </span>
          )}
        </div>
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

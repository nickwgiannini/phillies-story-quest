import React from "react";

export default function LoadingDots({ color = "#E81828", size = 10 }) {
  return (
    <div style={{ display: "inline-flex", gap: 7, alignItems: "center", padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: "50%", background: color,
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

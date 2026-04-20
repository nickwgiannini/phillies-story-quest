import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import './index.css';

// SW cleanup is handled by VitePWA's selfDestroying:true (see vite.config.js).
// Don't unregister here — that would race with VitePWA's auto-register and
// leave behavior unpredictable on first load after a deploy.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

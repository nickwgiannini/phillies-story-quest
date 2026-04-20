// Vercel serverless function — proxies Claude API calls server-side so
// the API key is never exposed to the browser.

const ALLOWED_ORIGINS = [
  "https://phillies-story-quest.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
];

// In-memory rate limiter. Vercel warm instances share this map across
// requests; cold starts reset it. Good enough for basic abuse prevention.
const rateLimitMap = new Map(); // ip -> { count, resetAt }
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

export default async function handler(req, res) {
  // Origin check
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Each request is for a unique gameId/prompt and is non-idempotent from the
  // client's POV — never let WebView/intermediary caches reuse a response.
  res.setHeader("Cache-Control", "no-store");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting — use the real IP from Vercel's forwarded header
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const limit = checkRateLimit(ip);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", limit.remaining);

  if (!limit.allowed) {
    const retryAfterSecs = Math.ceil((limit.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", retryAfterSecs);
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.VITE_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Claude proxy error:", err);
    return res.status(500).json({ error: "API call failed" });
  }
}

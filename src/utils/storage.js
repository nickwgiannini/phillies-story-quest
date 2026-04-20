// Bump the _vN suffix any time the persisted shape (sessions[] entries,
// top-level fields) changes incompatibly — the old key stays in localStorage
// and is ignored, so users start from a clean slate rather than crashing on
// stale data. Keep in sync with CONTENT_CACHE_VERSION in gameData.js if a
// schema change there also affects what we save here.
const DB_KEY = "philliesQuestData_v2";

export function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { sessions: [], lastGameId: null };
  } catch {
    return { sessions: [], lastGameId: null };
  }
}

export function saveDB(data) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch {
    console.warn("Could not save to localStorage.");
  }
}

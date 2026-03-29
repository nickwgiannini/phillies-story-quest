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

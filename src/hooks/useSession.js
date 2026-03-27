// Persists game session to localStorage so teams can resume after refresh
const KEY = 'mystic_vault_session';

export function saveSession(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch(e) { console.warn('Session save failed:', e); }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 4 hours
    if (Date.now() - data.savedAt > 4 * 60 * 60 * 1000) {
      clearSession(); return null;
    }
    return data;
  } catch(e) { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch(e) {}
}

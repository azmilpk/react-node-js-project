const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Page data cache (sessionStorage) ────────────────────────────────────────
// Clears when browser is closed — page data should always be fresh next session

export const saveCache = (key, data, filters = {}) => {
  try {
    const payload = {
      data,
      filters,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
};

export const loadCache = (key, ttl = DEFAULT_TTL) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (Date.now() - parsed.savedAt > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const clearCache = (key) => {
  sessionStorage.removeItem(key);
};

export const clearAllPageCaches = () => {
  const keys = [
    'validatePage_cache',
    'ulPurePage_cache',
    'auditorUlPurePage_cache',
    'auditorValidatePage_cache',
  ];
  keys.forEach((key) => sessionStorage.removeItem(key));
};

// ─── Persistent cache (sessionStorage) ───────────────────────────────────────
// Also uses sessionStorage now — clears when browser closes
export const savePersistentCache = (key, data) => {
  try {
    const payload = {
      data,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload)); // ← sessionStorage
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
};

export const loadPersistentCache = (key, ttl = 24 * 60 * 60 * 1000) => {
  try {
    const raw = sessionStorage.getItem(key); // ← sessionStorage
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (Date.now() - parsed.savedAt > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const clearPersistentCache = (key) => {
  sessionStorage.removeItem(key); // ← sessionStorage
};
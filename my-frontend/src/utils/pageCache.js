const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const saveCache = (key, data, filters = {}) => {
  try {
    const payload = {
      data,
      filters,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // localStorage full or unavailable — ignore
    console.warn('Cache save failed:', e);
  }
};

export const loadCache = (key, ttl = DEFAULT_TTL) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Check if expired
    if (Date.now() - parsed.savedAt > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const clearCache = (key) => {
  localStorage.removeItem(key);
};

export const clearAllPageCaches = () => {
  const keys = [
    'validatePage_cache',
    'ulPurePage_cache',
    'auditorUlPurePage_cache',
    'auditorValidatePage_cache',
    'siteOwnerPage_cache',
  ];
  keys.forEach((key) => localStorage.removeItem(key));
};
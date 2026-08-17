export const getCurrentUserName = () => {
  try {
    const stored = localStorage.getItem('authUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.name || parsed?.userId || 'Unknown User';
    }
  } catch (e) {
    // ignore parse errors
  }
  return 'Unknown User';
};

export const getCurrentUserRole = () => {
  try {
    const stored = localStorage.getItem('authUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.role || 'SiteOwner';
    }
  } catch (e) {
    // ignore parse errors
  }
  return 'SiteOwner';
};

export const getCurrentUserEmail = () => {
  try {
    const stored = localStorage.getItem('authUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.email || parsed?.userId || 'unknown';
    }
  } catch (e) {
    // ignore parse errors
  }
  return 'unknown';
};
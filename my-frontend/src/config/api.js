export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const getToken = () => localStorage.getItem('authToken');

// fetch wrapper that attaches the auth token to every request. On a 401 the
// token is stale/invalid, so we clear the session and bounce to the login page.
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.clear();
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }

  return response;
};
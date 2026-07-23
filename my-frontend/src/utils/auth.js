export const loginUser = (userData) => {
  localStorage.setItem('authUser', JSON.stringify(userData));
};

export const logoutUser = () => {
  localStorage.removeItem('authUser');
  localStorage.removeItem('authToken');
};

export const getAuthUser = () => {
  const user = localStorage.getItem('authUser');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!getAuthUser();
};

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};
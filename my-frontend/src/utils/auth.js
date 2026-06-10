export const loginUser = (userData) => {
  localStorage.setItem('authUser', JSON.stringify(userData));
};

export const logoutUser = () => {
  localStorage.removeItem('authUser');
};

export const getAuthUser = () => {
  const user = localStorage.getItem('authUser');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!getAuthUser();
};
export const storage = {
  setToken: (token) => {
    localStorage.setItem("token", token);
    // Dispatch event to notify app of login
    window.dispatchEvent(new Event("auth:change"));
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  removeToken: () => {
    localStorage.removeItem("token");
  },

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  removeUser: () => {
    localStorage.removeItem("user");
  },

  clearAll: () => {
    localStorage.clear();
    // Dispatch event to notify app of logout/clear
    window.dispatchEvent(new Event("auth:change"));
  },
};

import api from "./axios";

export const userAPI = {
  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },
  getHistory: async () => {
    const response = await api.get("/user/history");
    return response.data;
  },
  getActiveSessions: async () => {
    const response = await api.get(
      "/user/active-sessions"
    );
    return response.data;
  },
};

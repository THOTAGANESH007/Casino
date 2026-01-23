import api from "./axios";

export const rgAPI = {
  getLimits: async () => {
    const response = await api.get("/responsible-gaming/limits");
    return response.data;
  },

  // Admin: Get specific user limits
  getAdminUserLimits: async (userId) => {
    const response = await api.get(
      `/responsible-gaming/admin/limits/${userId}`
    );
    return response.data;
  },

  // Admin: Set specific user limits
  setAdminUserLimits: async (userId, data) => {
    const response = await api.post(
      `/responsible-gaming/admin/limits/${userId}`,
      data
    );
    return response.data;
  },
};

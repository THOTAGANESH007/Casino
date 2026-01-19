import api from "./axios";

export const authAPI = {
  signup: async (userData) => {
    const response = await api.post("/auth/signup", userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  selectRegion: async (regionId) => {
    const response = await api.post("/auth/select-region", {
      region_id: regionId,
    });
    return response.data;
  },

  submitKYC: async (kycData) => {
    const response = await api.post("/auth/submit-kyc", kycData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

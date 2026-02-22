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

  selectRegion: async (data) => {
    const response = await api.post("/auth/select-region", data);
    return response.data;
  },

  submitKYC: async (kycData) => {
    const response = await api.post("/auth/submit-kyc", kycData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (data) => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },

  // Fetch all casinos available in the user's fixed region
  getAvailableTenants: async () => {
    const response = await api.get("/auth/available-tenants");
    return response.data;
  },

  // Switch to a new casino and get a new token
  switchTenant: async (tenantId) => {
    const response = await api.post(`/auth/switch-tenant/${tenantId}`, {});
    return response.data;
  },
};

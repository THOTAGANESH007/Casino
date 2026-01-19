import api from "./axios";

export const adminAPI = {
  // Tenants
  createTenant: async (tenantData) => {
    const response = await api.post("/admin/tenants", tenantData);
    return response.data;
  },

  getTenants: async () => {
    const response = await api.get("/admin/tenants");
    return response.data;
  },

  getTenant: async (tenantId) => {
    const response = await api.get(`/admin/tenants/${tenantId}`);
    return response.data;
  },

  updateTenantStatus: async (tenantId, status) => {
    const response = await api.patch(
      `/admin/tenants/${tenantId}/status`,
      null,
      {
        params: { status },
      },
    );
    return response.data;
  },

  // Regions
  createRegion: async (regionData) => {
    const response = await api.post("/admin/regions", regionData);
    return response.data;
  },

  getRegions: async (tenantId = null) => {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await api.get("/admin/regions", { params });
    return response.data;
  },

  // Users for Admin
  getUsers: async (filters = {}) => {
    const response = await api.get("/admin/users", { params: filters });
    return response.data;
  },

  getUsersForAdmin: async (filters = {}) => {
    const response = await api.get("/admin/users-admin", { params: filters });
    return response.data;
  },

  activateUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/activate`);
    return response.data;
  },

  deactivateUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  // KYC
  getPendingKYC: async () => {
    const response = await api.get("/admin/kyc/pending");
    return response.data;
  },

  approveKYC: async (kycId) => {
    const response = await api.post(`/admin/kyc/${kycId}/approve`);
    return response.data;
  },

  rejectKYC: async (kycId, reason = null) => {
    const params = reason ? { reason } : {};
    const response = await api.post(`/admin/kyc/${kycId}/reject`, null, {
      params,
    });
    return response.data;
  },
};

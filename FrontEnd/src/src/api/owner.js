import api from "./axios";

export const ownerAPI = {
  // Tenants
  getTenants: async () => {
    const response = await api.get("/admin/tenants");
    return response.data;
  },

  createTenant: async (data) => {
    const response = await api.post("/admin/tenants", data);
    return response.data;
  },

  // Regions
  getRegions: async () => {
    const response = await api.get("/admin/regions");
    return response.data;
  },

  createRegion: async (data) => {
    const response = await api.post("/admin/regions", data);
    return response.data;
  },

  updateRegionTax: async (regionId, taxRate) => {
    // Fixed: Use backticks `` for template literals
    const response = await api.patch(`/admin/regions/${regionId}/tax`, {
      tax_rate: taxRate,
    });
    return response.data;
  },

  // Game Providers
  getProviders: async () => {
    const response = await api.get("/admin/providers");
    return response.data;
  },

  addProvider: async (data) => {
    const response = await api.post("/admin/providers", data);
    return response.data;
  },

  updateProviderStatus: async (providerId, isActive) => {
    // Fixed: Use backticks and clean params handling
    const response = await api.patch(`/admin/providers/${providerId}/status`, null, {
      params: { is_active: isActive },
    });
    return response.data;
  },

  // Create Admin
  createTenantAdmin: async (data) => {
    const response = await api.post("/admin/create_admin_user_for_tenant", data);
    return response.data;
  },

  getTenantAdmins: async () => {
    const response = await api.get("/admin/tenant-admins");
    return response.data;
  },

  updateTenantAdminStatus: async (userId, isActive) => {
    const response = await api.patch(`/admin/tenant-admins/${userId}/status`, null, {
      params: { is_active: isActive },
    });
    return response.data;
  },

  updateTenantStatus: async (tenantId, isActive) => {
    const response = await api.patch(`/admin/tenants/${tenantId}/status`, null, {
      params: { status: isActive },
    });
    return response.data;
  },


  // Games Management
  getBaseGames: async () => {
    const response = await api.get("/admin/games");
    return response.data;
  },

  initBaseGames: async () => {
    const response = await api.post("/admin/games/init", {});
    return response.data;
  },

  getCatalog: async () => {
    const response = await api.get("/admin/catalog");
    return response.data;
  },

  addToCatalog: async (data) => {
    const response = await api.post("/admin/catalog/add", data);
    return response.data;
  },
};
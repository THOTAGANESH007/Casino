import axios from "axios";
import { storage } from "../utils/storage";

const API_URL = "http://localhost:8000/admin";

const getHeaders = () => {
  const token = storage.getToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export const ownerAPI = {
  // Tenants
  getTenants: async () => {
    const response = await axios.get(`${API_URL}/tenants`, getHeaders());
    return response.data;
  },
  createTenant: async (data) => {
    const response = await axios.post(`${API_URL}/tenants`, data, getHeaders());
    return response.data;
  },

  // Regions
  getRegions: async () => {
    const response = await axios.get(`${API_URL}/regions`, getHeaders());
    return response.data;
  },

  createRegion: async (data) => {
    const response = await axios.post(`${API_URL}/regions`, data, getHeaders());
    return response.data;
  },

  updateRegionTax: async (regionId, taxRate) => {
    const response = await axios.patch(
      `${API_URL}/regions/${regionId}/tax`,
      { tax_rate: taxRate },
      getHeaders(),
    );
    return response.data;
  },

  // Game Providers
  getProviders: async () => {
    const response = await axios.get(`${API_URL}/providers`, getHeaders());
    return response.data;
  },
  addProvider: async (data) => {
    const response = await axios.post(
      `${API_URL}/providers`,
      data,
      getHeaders(),
    );
    return response.data;
  },
  updateProviderStatus: async (providerId, isActive) => {
    const response = await axios.patch(
      `${API_URL}/providers/${providerId}/status`,
      null,
      {
        ...getHeaders(),
        params: { is_active: isActive },
      },
    );
    return response.data;
  },

  // Create Admin
  createTenantAdmin: async (data) => {
    const response = await axios.post(
      `${API_URL}/create_admin_user_for_tenant`,
      data,
      getHeaders(),
    );
    return response.data;
  },

  getTenantAdmins: async () => {
    const response = await axios.get(`${API_URL}/tenant-admins`, getHeaders());
    return response.data;
  },

  updateTenantAdminStatus: async (userId, isActive) => {
    const response = await axios.patch(
      `${API_URL}/tenant-admins/${userId}/status`,
      null,
      {
        ...getHeaders(),
        params: { is_active: isActive },
      },
    );
    return response.data;
  },
};

import api from './axios';

export const statsAPI = {
  getAdminProfile: async () => {
    const response = await api.get("/stats/tenant-profile");
    return response.data;
  }
};
import axios from "axios";
import { storage } from "../utils/storage";

const API_URL = "http://localhost:8000/responsible-gaming";

const getHeaders = () => {
  const token = storage.getToken();
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const rgAPI = {
  getLimits: async () => {
    const response = await axios.get(`${API_URL}/limits`, getHeaders());
    return response.data;
  },

  // Admin: Get specific user limits
  getAdminUserLimits: async (userId) => {
    const response = await axios.get(
      `${API_URL}/admin/limits/${userId}`,
      getHeaders(),
    );
    return response.data;
  },

  // Admin: Set specific user limits
  setAdminUserLimits: async (userId, data) => {
    const response = await axios.post(
      `${API_URL}/admin/limits/${userId}`,
      data,
      getHeaders(),
    );
    return response.data;
  },
};

import axios from "axios";
import { storage } from "../utils/storage";

const API_URL = "http://localhost:8000/user";

const getHeaders = () => {
  const token = storage.getToken();
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const userAPI = {
  getProfile: async () => {
    const response = await axios.get(`${API_URL}/profile`, getHeaders());
    return response.data;
  },
  getHistory: async () => {
    const response = await axios.get(`${API_URL}/history`, getHeaders());
    return response.data;
  },
  getActiveSessions: async () => {
    const response = await axios.get(
      `${API_URL}/active-sessions`,
      getHeaders(),
    );
    return response.data;
  },
};

import axios from "axios";
import { storage } from "../utils/storage";

// NOTE: Use the new lobby router
const API_URL = "http://localhost:8000/lobby";

const getHeaders = () => {
  const token = storage.getToken();
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const gameAPI = {
  getAvailableGames: async () => {
    const response = await axios.get(`${API_URL}/games`, getHeaders());
    return response.data;
  },
};

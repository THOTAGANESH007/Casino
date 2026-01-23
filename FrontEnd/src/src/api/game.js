import api from "./axios"

export const gameAPI = {
  getAvailableGames: async () => {
    const response = await api.get("/lobby/games");
    return response.data;
  },
};

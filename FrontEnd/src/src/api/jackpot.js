import api from "./axios";

export const jackpotAPI = {
  getJackpots: async () => {
    const response = await api.get(`/jackpot/current`);
    return response.data;
  },
};

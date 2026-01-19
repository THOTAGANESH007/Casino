import api from "./axios";

export const walletAPI = {
  getWallets: async () => {
    const response = await api.get("/wallet/");
    return response.data;
  },

  getWalletByType: async (walletType) => {
    const response = await api.get(`/wallet/${walletType}`);
    return response.data;
  },

  deposit: async (amount) => {
    const response = await api.post("/wallet/deposit", { amount });
    return response.data;
  },

  withdraw: async (amount) => {
    const response = await api.post("/wallet/withdraw", { amount });
    return response.data;
  },
};

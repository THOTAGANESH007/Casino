import { useState, useEffect, useCallback } from "react";
import { walletAPI } from "../api/wallet";
import { storage } from "../utils/storage";

export const useWallet = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWallets = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await walletAPI.getWallets();
      setWallets(data);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError("Failed to load wallet data");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const getCashBalance = () => {
    if (!wallets || wallets.length === 0) return 0;
    const wallet = wallets.find((w) => w.type_of_wallet === "cash");
    return wallet ? parseFloat(wallet.balance) : 0;
  };

  const getBonusBalance = () => {
    if (!wallets || wallets.length === 0) return 0;
    const wallet = wallets.find((w) => w.type_of_wallet === "bonus");
    return wallet ? parseFloat(wallet.balance) : 0;
  };

  const getPointsBalance = () => {
    if (!wallets || wallets.length === 0) return 0;
    const wallet = wallets.find((w) => w.type_of_wallet === "points");
    return wallet ? parseFloat(wallet.balance) : 0;
  };

  const deposit = async (amount) => {
    try {
      await walletAPI.deposit(amount);
      await fetchWallets();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || "Deposit failed",
      };
    }
  };

  const withdraw = async (amount) => {
    try {
      await walletAPI.withdraw(amount);
      await fetchWallets();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || "Withdrawal failed",
      };
    }
  };

  return {
    wallets,
    loading,
    error,
    fetchWallets,
    getCashBalance,
    getBonusBalance,
    getPointsBalance,
    deposit,
    withdraw,
  };
};

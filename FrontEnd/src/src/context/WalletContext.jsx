import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { walletAPI } from "../api/wallet";
import { storage } from "../utils/storage";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
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
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Balance helper logic
  const getCashBalance = () => {
    const wallet = wallets.find((w) => w.type_of_wallet === "cash");
    return wallet ? parseFloat(wallet.balance) : 0;
  };

  const deposit = async (amount) => {
    try {
      const data = await walletAPI.depositStripe(amount);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return { success: true, redirect: true };
      }
      return { success: false, error: "No checkout URL" };
    } catch (err) {
      return { success: false, error: "Deposit failed" };
    }
  };

  return (
    <WalletContext.Provider value={{ 
      wallets, 
      loading, 
      fetchWallets, 
      getCashBalance, 
      deposit 
    }}>
      {children}
    </WalletContext.Provider>
  );
};

// This is the hook your components will use
export const useWallet = () => useContext(WalletContext);
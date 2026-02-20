import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
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
      const data = await walletAPI.depositStripe(amount);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return { success: true, redirect: true };
      }
      return { success: false, error: "No checkout URL returned" };
    } catch (err) {
      return { success: false, error: "Deposit initialization failed" };
    }
  };

  const withdraw = async (amount) => {
    try {
      await walletAPI.withdrawStripe(amount);
      await fetchWallets();
      return { success: true };
    } catch (err) {
      return { success: false, error: "Withdrawal failed" };
    }
  };

  return (
    <WalletContext.Provider
      value={{
        wallets,
        loading,
        error,
        fetchWallets,
        getCashBalance,
        getBonusBalance,
        getPointsBalance,
        deposit,
        withdraw,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use the shared context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

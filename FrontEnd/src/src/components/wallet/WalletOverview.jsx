import React, { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";

const WalletOverview = () => {
  const {
    wallets,
    loading,
    error,
    getCashBalance,
    getBonusBalance,
    getPointsBalance,
  } = useWallet();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  if (loading) return <Loading message="Loading wallet..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Wallet</h1>
          <p className="text-gray-600">Manage your funds</p>
        </div>
        <div className="flex space-x-4">
          <Button
            onClick={() => setShowDeposit(true)}
            variant="primary"
            size="lg"
          >
            💰 Deposit
          </Button>
          <Button
            onClick={() => setShowWithdraw(true)}
            variant="secondary"
            size="lg"
          >
            💸 Withdraw
          </Button>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Cash Wallet */}
        <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">💵</div>
            <div className="text-right">
              <p className="text-green-100 text-sm font-semibold">
                CASH BALANCE
              </p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-4xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
          <p className="text-green-100 text-sm">Available for play</p>
        </div>

        {/* Bonus Wallet */}
        <div className="bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">🎁</div>
            <div className="text-right">
              <p className="text-purple-100 text-sm font-semibold">
                BONUS BALANCE
              </p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-4xl font-bold">
              {formatCurrency(getBonusBalance())}
            </p>
          </div>
          <p className="text-purple-100 text-sm">Promotional funds</p>
        </div>

        {/* Points Wallet */}
        <div className="bg-linear-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-5xl">⭐</div>
            <div className="text-right">
              <p className="text-yellow-100 text-sm font-semibold">
                POINTS BALANCE
              </p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-4xl font-bold">
              {getPointsBalance().toFixed(0)}
            </p>
          </div>
          <p className="text-yellow-100 text-sm">Loyalty points</p>
        </div>
      </div>

      {/* Wallet Details Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-900">All Wallets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Wallet Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Wallet ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {wallets.map((wallet) => (
                <tr key={wallet.wallet_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`
                      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                      ${wallet.type_of_wallet === "cash" ? "bg-green-100 text-green-800" : ""}
                      ${wallet.type_of_wallet === "bonus" ? "bg-purple-100 text-purple-800" : ""}
                      ${wallet.type_of_wallet === "points" ? "bg-yellow-100 text-yellow-800" : ""}
                    `}
                    >
                      {/* FIXED: Accessed type_of_wallet and added safe check */}
                      {wallet.type_of_wallet
                        ? wallet.type_of_wallet.toUpperCase()
                        : "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900">
                    {wallet.type_of_wallet === "points"
                      ? parseFloat(wallet.balance).toFixed(0)
                      : formatCurrency(wallet.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    #{wallet.wallet_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}

      {showWithdraw && (
        <WithdrawModal
          onClose={() => setShowWithdraw(false)}
          maxAmount={getCashBalance()}
        />
      )}
    </div>
  );
};

export default WalletOverview;

import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import Modal from "../common/Modal";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Input from "../common/Input";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";
import { walletAPI } from "../../api/wallet";

const WithdrawModal = ({ onClose, maxAmount }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { withdraw } = useWallet();
  const { currency } = useAuth();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const fetchSimulation = async () => {
      const val = parseFloat(amount);
      if (!val || val <= 0) {
        setPreview(null);
        return;
      }

      try {
        const data = await walletAPI.simulateWithdrawal(val);
        console.log("Simulation data:", data);
        setPreview(data);
      } catch (err) {
        console.error("Simulation failed");
      }
    };
    const timer = setTimeout(() => {
      fetchSimulation();
    }, 500);

    return () => clearTimeout(timer);
  }, [amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (withdrawAmount > maxAmount) {
      setError(
        `Insufficient balance. Maximum: ${formatCurrency(maxAmount, currency)}`,
      );
      return;
    }

    setLoading(true);
    const result = await withdraw(withdrawAmount);
    setLoading(false);

    if (result.success) {
      setSuccess(
        `Successfully withdrew ${formatCurrency(withdrawAmount, currency)}`,
      );
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Withdraw Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} onClose={() => setError("")} />
        <SuccessMessage message={success} onClose={() => setSuccess("")} />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-blue-800">
            Available Balance
          </span>
          <span className="text-lg font-bold text-blue-900">
            {formatCurrency(maxAmount, currency)}
          </span>
        </div>

        <div>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            max={maxAmount}
            required
          />
        </div>

        <button
          type="button"
          onClick={() => setAmount(maxAmount.toString())}
          className="text-sm text-red-400 hover:text-red-700 font-semibold cursor-pointer"
        >
          Withdraw All
        </button>

        {preview && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 text-sm animate-in fade-in">
            <div className="flex justify-between text-gray-600">
              <span>Requested Amount:</span>
              <span>{formatCurrency(preview.requested_amount, currency)}</span>
            </div>

            <div className="flex justify-between text-red-600">
              <span>Regional Tax ({preview.tax_rate}%):</span>
              <span>- {formatCurrency(preview.tax_amount, currency)}</span>
            </div>

            <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">Net Payout:</span>
              <span className="font-bold text-lg text-green-600">
                {formatCurrency(preview.net_payout, currency)}
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !amount || parseFloat(amount) > maxAmount}
            className="flex-1"
          >
            {loading ? "Processing..." : "Confirm Withdrawal"}
          </Button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-yellow-800">⏱️ Processed in 24-48 hours</p>
          <p className="text-sm text-yellow-800">🔒 Secure transaction</p>
        </div>
      </form>
    </Modal>
  );
};

export default WithdrawModal;

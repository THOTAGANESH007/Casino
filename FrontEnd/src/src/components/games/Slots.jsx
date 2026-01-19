import React, { useState } from "react";
import { slotsAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import { formatCurrency } from "../../utils/helpers";

const Slots = () => {
  const [betAmount, setBetAmount] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const { getCashBalance, fetchWallets } = useWallet();

  const handleSpin = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setLoading(true);
    setSpinning(true);
    setResult(null);

    // Add spinning animation delay
    setTimeout(async () => {
      try {
        const data = await slotsAPI.spin(betAmount);
        setResult(data);
        await fetchWallets();
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to spin");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-green-500 to-teal-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎰 Slots</h1>
            <p className="text-green-100">3x3 slot machine</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Bet Controls */}
        <div className="max-w-md mx-auto mb-8">
          <Input
            label="Bet Amount ($)"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value))}
            min="1"
            step="1"
          />

          <Button
            onClick={handleSpin}
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full mt-4"
          >
            {loading ? "Spinning..." : "🎰 Spin"}
          </Button>
        </div>

        {/* Slot Grid */}
        {result && (
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {result.grid.map((row, rowIdx) =>
                row.map((symbol, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`
                      bg-linear-to-br from-purple-500 to-indigo-600 
                      rounded-xl p-6 text-center text-6xl
                      ${spinning ? "animate-pulse" : "animate-in"}
                    `}
                  >
                    {symbol}
                  </div>
                )),
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !spinning && (
          <div className="text-center">
            {result.wins.length > 0 ? (
              <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 mb-6">
                <h2 className="text-4xl font-bold mb-4">🎉 You Win!</h2>
                <p className="text-3xl font-bold">
                  {formatCurrency(result.payout)}
                </p>
                <p className="text-xl mt-2">
                  Multiplier: {result.total_multiplier}x
                </p>
              </div>
            ) : (
              <div className="bg-linear-to-r from-gray-500 to-gray-600 text-white rounded-xl p-6 mb-6">
                <h2 className="text-3xl font-bold">No Win</h2>
                <p className="text-gray-200 mt-2">Try again!</p>
              </div>
            )}

            {/* Winning Lines */}
            {result.wins.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold mb-2">Winning Lines:</h3>
                <div className="space-y-2">
                  {result.wins.map((win, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center"
                    >
                      <span>
                        {win.symbol} x{win.count} ({win.type})
                      </span>
                      <span className="font-bold text-green-600">
                        {win.multiplier}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="text-center py-12">
            <div className="text-8xl mb-4">🎰</div>
            <p className="text-gray-600 text-lg">Place your bet and spin!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Slots;

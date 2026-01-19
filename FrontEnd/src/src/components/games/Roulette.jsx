import React, { useState, useEffect } from "react";
import { rouletteAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";

const Roulette = () => {
  const [bets, setBets] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableInfo, setTableInfo] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const { getCashBalance, fetchWallets } = useWallet();

  // Roulette numbers with colors
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const blackNumbers = [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ];

  const getNumberColor = (num) => {
    if (num === 0) return "green";
    if (redNumbers.includes(num)) return "red";
    if (blackNumbers.includes(num)) return "black";
    return "green";
  };

  useEffect(() => {
    fetchTableInfo();
  }, []);

  const fetchTableInfo = async () => {
    try {
      const data = await rouletteAPI.getTableInfo();
      setTableInfo(data);
    } catch (err) {
      console.error("Failed to fetch table info");
    }
  };

  const addBet = (betType, betValue, betAmount) => {
    const newBet = {
      bet_type: betType,
      bet_value: betValue,
      bet_amount: parseFloat(betAmount),
    };
    setBets([...bets, newBet]);
  };

  const removeBet = (index) => {
    setBets(bets.filter((_, i) => i !== index));
  };

  const clearBets = () => {
    setBets([]);
  };

  const getTotalBet = () => {
    return bets.reduce((sum, bet) => sum + bet.bet_amount, 0);
  };

  const handleSpin = async () => {
    if (bets.length === 0) {
      setError("Please place at least one bet");
      return;
    }

    if (getTotalBet() > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setLoading(true);
    setSpinning(true);
    setResult(null);

    // Spinning animation delay
    setTimeout(async () => {
      try {
        const data = await rouletteAPI.spin(bets);
        setResult(data);
        await fetchWallets();
        setBets([]);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to spin");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎰 Roulette</h1>
            <p className="text-purple-100">European Roulette (Single Zero)</p>
          </div>
          <div className="text-right">
            <p className="text-purple-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Betting Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Place Your Bets
            </h2>

            {/* Quick Bet Buttons */}
            <div className="space-y-4">
              {/* Outside Bets */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Outside Bets (1:1)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => addBet("red", null, 10)}
                    className="bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                  >
                    RED
                  </button>
                  <button
                    onClick={() => addBet("black", null, 10)}
                    className="bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                  >
                    BLACK
                  </button>
                  <button
                    onClick={() => addBet("even", null, 10)}
                    className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    EVEN
                  </button>
                  <button
                    onClick={() => addBet("odd", null, 10)}
                    className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors font-semibold"
                  >
                    ODD
                  </button>
                  <button
                    onClick={() => addBet("low", null, 10)}
                    className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                  >
                    1-18
                  </button>
                  <button
                    onClick={() => addBet("high", null, 10)}
                    className="bg-teal-500 text-white px-4 py-3 rounded-lg hover:bg-teal-600 transition-colors font-semibold"
                  >
                    19-36
                  </button>
                </div>
              </div>

              {/* Dozens */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Dozens (2:1)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => addBet("dozen1", null, 10)}
                    className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
                  >
                    1st 12
                  </button>
                  <button
                    onClick={() => addBet("dozen2", null, 10)}
                    className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
                  >
                    2nd 12
                  </button>
                  <button
                    onClick={() => addBet("dozen3", null, 10)}
                    className="bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
                  >
                    3rd 12
                  </button>
                </div>
              </div>

              {/* Columns */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Columns (2:1)
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => addBet("column1", null, 10)}
                    className="bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition-colors font-semibold"
                  >
                    Column 1
                  </button>
                  <button
                    onClick={() => addBet("column2", null, 10)}
                    className="bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition-colors font-semibold"
                  >
                    Column 2
                  </button>
                  <button
                    onClick={() => addBet("column3", null, 10)}
                    className="bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition-colors font-semibold"
                  >
                    Column 3
                  </button>
                </div>
              </div>

              {/* Straight Numbers */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Straight Numbers (35:1)
                </h3>
                <div className="grid grid-cols-6 md:grid-cols-9 gap-1">
                  {/* Zero */}
                  <button
                    onClick={() => addBet("straight", 0, 10)}
                    className="bg-green-600 text-white px-2 py-2 rounded hover:bg-green-700 transition-colors font-bold text-sm"
                  >
                    0
                  </button>
                  {/* Numbers 1-36 */}
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => addBet("straight", num, 10)}
                      className={`
                        text-white px-2 py-2 rounded transition-colors font-bold text-sm
                        ${
                          getNumberColor(num) === "red"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gray-900 hover:bg-gray-800"
                        }
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bet Slip & Result */}
        <div className="space-y-6">
          {/* Current Bets */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Bets</h2>

            {bets.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No bets placed</p>
            ) : (
              <div className="space-y-2 mb-4">
                {bets.map((bet, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {bet.bet_type}
                      </p>
                      {bet.bet_value !== null && (
                        <p className="text-sm text-gray-600">
                          Number: {bet.bet_value}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">
                        ${bet.bet_amount}
                      </span>
                      <button
                        onClick={() => removeBet(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Bet:</span>
                <span className="text-primary-600">
                  {formatCurrency(getTotalBet())}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                onClick={handleSpin}
                disabled={loading || bets.length === 0}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {loading ? "Spinning..." : "🎰 Spin"}
              </Button>
              <Button
                onClick={clearBets}
                disabled={loading || bets.length === 0}
                variant="secondary"
                className="w-full"
              >
                Clear Bets
              </Button>
            </div>
          </div>

          {/* Result */}
          {result && !spinning && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Result</h2>

              {/* Winning Number */}
              <div
                className={`
                rounded-full w-24 h-24 mx-auto flex items-center justify-center text-white text-4xl font-bold mb-4
                ${result.color === "red" ? "bg-red-500" : ""}
                ${result.color === "black" ? "bg-gray-900" : ""}
                ${result.color === "green" ? "bg-green-600" : ""}
              `}
              >
                {result.winning_number}
              </div>

              <p className="text-center text-gray-600 mb-4 capitalize">
                {result.color}
              </p>

              {/* Payout */}
              <div
                className={`
                rounded-lg p-4 text-center
                ${
                  result.total_payout > result.total_bet
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }
              `}
              >
                <p className="text-sm text-gray-600 mb-1">Total Payout</p>
                <p className="text-3xl font-bold mb-2">
                  {formatCurrency(result.total_payout)}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    result.total_payout > result.total_bet
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {result.total_payout > result.total_bet ? "+" : ""}
                  {formatCurrency(result.net_result)}
                </p>
              </div>

              {/* Winning Bets */}
              {result.bet_results.some((b) => b.won) && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Winning Bets:
                  </h3>
                  <div className="space-y-2">
                    {result.bet_results
                      .filter((b) => b.won)
                      .map((bet, idx) => (
                        <div
                          key={idx}
                          className="bg-green-50 p-2 rounded flex justify-between text-sm"
                        >
                          <span>{bet.bet_type}</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(bet.payout)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Roulette;

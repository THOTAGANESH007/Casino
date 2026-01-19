import React, { useState, useEffect } from "react";
import { crashAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import { formatCurrency } from "../../utils/helpers";

const Crash = () => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState("");
  const [currentGame, setCurrentGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [userBet, setUserBet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const { getCashBalance, fetchWallets } = useWallet();

  useEffect(() => {
    fetchCurrentGame();
    const interval = setInterval(fetchCurrentGame, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentGame = async () => {
    try {
      const data = await crashAPI.getCurrentGame();
      setCurrentGame(data.game_id);
      if (data.state) {
        setGameState(data.state);
        if (data.state.current_multiplier) {
          setMultiplier(parseFloat(data.state.current_multiplier));
        }
      }
    } catch (err) {
      console.error("Failed to fetch current game");
    }
  };

  const handleJoinGame = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const autoCashoutValue = autoCashout ? parseFloat(autoCashout) : null;
      const data = await crashAPI.joinGame(betAmount, autoCashoutValue);
      setUserBet(data);
      setSuccess("Bet placed! Waiting for game to start...");
      await fetchWallets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!currentGame || !userBet) return;

    setLoading(true);
    try {
      const data = await crashAPI.cashout(currentGame);
      setSuccess(
        `Cashed out at ${data.cashout_multiplier}x! Won ${formatCurrency(
          data.payout,
        )}`,
      );
      setUserBet(null);
      await fetchWallets();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to cashout");
    } finally {
      setLoading(false);
    }
  };

  const getMultiplierColor = () => {
    if (multiplier < 2) return "text-green-600";
    if (multiplier < 5) return "text-yellow-600";
    if (multiplier < 10) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🚀 Crash</h1>
            <p className="text-pink-100">
              Multiplayer crash game - Cash out before it crashes!
            </p>
          </div>
          <div className="text-right">
            <p className="text-pink-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Display */}
        <div className="lg:col-span-2">
          <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-12 text-center">
            {gameState?.started && !gameState?.crashed ? (
              /* Active Game */
              <div className="space-y-6">
                <div className="text-8xl animate-pulse">🚀</div>
                <div>
                  <p className="text-white text-2xl mb-2">Current Multiplier</p>
                  <p className={`text-9xl font-bold ${getMultiplierColor()}`}>
                    {multiplier.toFixed(2)}x
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-white text-lg">
                    Active Players: {gameState.active_players || 0}
                  </p>
                </div>
              </div>
            ) : gameState?.crashed ? (
              /* Crashed */
              <div className="space-y-6">
                <div className="text-8xl">💥</div>
                <div>
                  <p className="text-red-400 text-3xl mb-2">CRASHED!</p>
                  <p className="text-white text-6xl font-bold">
                    {gameState.crash_point?.toFixed(2)}x
                  </p>
                </div>
                <p className="text-gray-400">Waiting for next round...</p>
              </div>
            ) : (
              /* Waiting */
              <div className="space-y-6">
                <div className="text-8xl">⏳</div>
                <div>
                  <p className="text-white text-3xl mb-4">
                    Waiting for Players...
                  </p>
                  <p className="text-gray-400">
                    Place your bet to join the next round
                  </p>
                </div>
                {gameState && (
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-white text-lg">
                      Players Ready: {gameState.players_count || 0}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Game Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              How to Play
            </h3>
            <div className="space-y-2 text-gray-700">
              <p>
                🎮 <strong>Place your bet</strong> before the round starts
              </p>
              <p>
                🚀 <strong>Watch the multiplier</strong> increase from 1.00x
              </p>
              <p>
                💰 <strong>Cash out anytime</strong> to secure your winnings
              </p>
              <p>
                💥 <strong>Don't wait too long</strong> - the game can crash at
                any moment!
              </p>
              <p>
                🤖 <strong>Auto cashout</strong> (optional) - automatically cash
                out at your target multiplier
              </p>
            </div>
          </div>
        </div>

        {/* Betting Panel */}
        <div className="space-y-6">
          {/* Bet Controls */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Place Your Bet
            </h2>

            {!userBet ? (
              <div className="space-y-4">
                <Input
                  label="Bet Amount ($)"
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                  min="1"
                  step="1"
                />

                <Input
                  label="Auto Cashout (optional)"
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  min="1.01"
                  step="0.01"
                  placeholder="e.g., 2.00"
                />

                <Button
                  onClick={handleJoinGame}
                  disabled={
                    loading || (gameState?.started && !gameState?.crashed)
                  }
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  {loading ? "Joining..." : "Place Bet"}
                </Button>

                {gameState?.started && !gameState?.crashed && (
                  <p className="text-sm text-amber-600 text-center">
                    Game in progress. Wait for next round.
                  </p>
                )}
              </div>
            ) : (
              /* Active Bet */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2">Your Bet</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(userBet.bet_amount)}
                  </p>
                  {userBet.auto_cashout && (
                    <p className="text-sm text-green-700 mt-1">
                      Auto cashout: {userBet.auto_cashout}x
                    </p>
                  )}
                </div>

                {gameState?.started && !gameState?.crashed && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-1">
                        Potential Win
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        {formatCurrency(userBet.bet_amount * multiplier)}
                      </p>
                    </div>

                    <Button
                      onClick={handleCashout}
                      disabled={loading}
                      variant="success"
                      size="lg"
                      className="w-full"
                    >
                      {loading ? "Cashing Out..." : "💰 Cash Out"}
                    </Button>
                  </>
                )}

                {!gameState?.started && (
                  <p className="text-center text-gray-600">
                    Waiting for round to start...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Provably Fair */}
          {userBet && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Provably Fair
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Server Seed Hash:</p>
                  <p className="font-mono text-xs break-all text-gray-800">
                    {userBet.server_seed_hash}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This hash proves the crash point was determined before the
                  round started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Crash;

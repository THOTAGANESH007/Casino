import React, { useState } from "react";
import { blackjackAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";

const Blackjack = () => {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { getCashBalance, fetchWallets } = useWallet();

  const startNewGame = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await blackjackAPI.startGame(betAmount);
      setSessionId(data.session_id);
      setGameState(data.game_state);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  const handleHit = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const data = await blackjackAPI.hit(sessionId);
      setGameState(data.game_state);

      if (data.game_state.game_over) {
        await fetchWallets();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to hit");
    } finally {
      setLoading(false);
    }
  };

  const handleStand = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const data = await blackjackAPI.stand(sessionId);
      setGameState(data.game_state);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to stand");
    } finally {
      setLoading(false);
    }
  };

  const handleDouble = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const data = await blackjackAPI.doubleDown(sessionId);
      setGameState(data.game_state);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to double down");
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGameState(null);
    setSessionId(null);
    setError("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-red-500 to-pink-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🃏 Blackjack</h1>
            <p className="text-red-100">Classic 21 card game</p>
          </div>
          <div className="text-right">
            <p className="text-red-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      {!gameState ? (
        /* Bet Setup */
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Place Your Bet
          </h2>

          <div className="max-w-md mx-auto mb-6">
            <label className="label">Bet Amount ($)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              min="1"
              step="1"
              className="input text-center text-2xl"
            />
          </div>

          <Button
            onClick={startNewGame}
            disabled={loading}
            variant="primary"
            size="lg"
            className="px-12"
          >
            {loading ? "Starting..." : "Start Game"}
          </Button>
        </div>
      ) : (
        /* Game Board */
        <div className="space-y-6">
          {/* Dealer's Hand */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Dealer's Hand{" "}
              {gameState.dealer_value && `(${gameState.dealer_value})`}
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {gameState.dealer_hand.map((card, idx) => (
                <div
                  key={idx}
                  className="playing-card w-20 h-28 flex items-center justify-center text-3xl"
                >
                  {card}
                </div>
              ))}
            </div>
          </div>

          {/* Player's Hand */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Your Hand ({gameState.player_value})
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {gameState.player_hand.map((card, idx) => (
                <div
                  key={idx}
                  className="playing-card w-20 h-28 flex items-center justify-center text-3xl animate-in"
                >
                  {card}
                </div>
              ))}
            </div>
          </div>

          {/* Game Result */}
          {gameState.game_over && (
            <div
              className={`
              rounded-xl shadow-lg p-8 text-center text-white text-2xl font-bold
              ${gameState.result === "win" || gameState.result === "blackjack" ? "bg-linear-to-r from-green-500 to-emerald-600" : ""}
              ${gameState.result === "lose" || gameState.result === "bust" ? "bg-linear-to-r from-red-500 to-pink-600" : ""}
              ${gameState.result === "push" ? "bg-linear-to-r from-yellow-500 to-orange-600" : ""}
            `}
            >
              {gameState.result === "blackjack" && "🎉 Blackjack! You Win!"}
              {gameState.result === "win" && "✅ You Win!"}
              {gameState.result === "lose" && "❌ Dealer Wins"}
              {gameState.result === "bust" && "💥 Bust!"}
              {gameState.result === "push" && "🤝 Push (Tie)"}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            {!gameState.game_over ? (
              <>
                <Button
                  onClick={handleHit}
                  disabled={loading}
                  variant="primary"
                  size="lg"
                >
                  Hit
                </Button>
                <Button
                  onClick={handleStand}
                  disabled={loading}
                  variant="warning"
                  size="lg"
                >
                  Stand
                </Button>
                {gameState.player_hand.length === 2 && (
                  <Button
                    onClick={handleDouble}
                    disabled={loading}
                    variant="success"
                    size="lg"
                  >
                    Double Down
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={resetGame}
                variant="primary"
                size="lg"
                className="px-12"
              >
                New Game
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Blackjack;

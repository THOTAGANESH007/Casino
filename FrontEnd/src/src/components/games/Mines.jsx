import React, { useState } from "react";
import { minesAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import { formatCurrency } from "../../utils/helpers";

const Mines = () => {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [numMines, setNumMines] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { getCashBalance, fetchWallets } = useWallet();

  const GRID_SIZE = 25; // 5x5 grid

  const startNewGame = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    if (numMines < 1 || numMines > 24) {
      setError("Number of mines must be between 1 and 24");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await minesAPI.startGame(betAmount, numMines);
      setSessionId(data.session_id);
      setGameState(data.game_state);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  const revealTile = async (position) => {
    if (!sessionId || loading || gameState?.game_over) return;

    setLoading(true);
    try {
      const data = await minesAPI.revealTile(sessionId, position);
      setGameState(data.result);

      if (data.result.game_over) {
        await fetchWallets();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reveal tile");
    } finally {
      setLoading(false);
    }
  };

  const cashout = async () => {
    if (!sessionId || loading) return;

    setLoading(true);
    try {
      const data = await minesAPI.cashout(sessionId);
      setGameState(data.result);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to cashout");
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGameState(null);
    setSessionId(null);
    setError("");
  };

  const isTileRevealed = (position) => {
    return gameState?.revealed?.includes(position);
  };

  const isTileMine = (position) => {
    return gameState?.mine_positions?.includes(position);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-yellow-500 to-orange-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">💣 Mines</h1>
            <p className="text-yellow-100">Reveal tiles and avoid mines!</p>
          </div>
          <div className="text-right">
            <p className="text-yellow-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      {!gameState ? (
        /* Game Setup */
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Setup Game
          </h2>

          <div className="max-w-md mx-auto space-y-6">
            <Input
              label="Bet Amount ($)"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              min="1"
              step="1"
            />

            <div>
              <label className="label">Number of Mines: {numMines}</label>
              <input
                type="range"
                value={numMines}
                onChange={(e) => setNumMines(parseInt(e.target.value))}
                min="1"
                max="24"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>1 mine</span>
                <span>24 mines</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>How to play:</strong> Click tiles to reveal. Avoid mines
                to win! The more tiles you reveal, the higher your multiplier.
              </p>
            </div>

            <Button
              onClick={startNewGame}
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {loading ? "Starting..." : "Start Game"}
            </Button>
          </div>
        </div>
      ) : (
        /* Game Board */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mines Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: GRID_SIZE }, (_, i) => i).map(
                  (position) => {
                    const revealed = isTileRevealed(position);
                    const isMine = isTileMine(position);
                    const showMine = revealed && isMine;
                    const showSafe = revealed && !isMine;

                    return (
                      <button
                        key={position}
                        onClick={() => revealTile(position)}
                        disabled={revealed || gameState.game_over || loading}
                        className={`
                        aspect-square rounded-lg font-bold text-2xl transition-all duration-200
                        ${
                          !revealed && !gameState.game_over
                            ? "bg-linear-to-br from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 shadow-md hover:shadow-lg transform hover:scale-105"
                            : ""
                        }
                        ${
                          showMine
                            ? "bg-linear-to-br from-red-500 to-red-600 text-white"
                            : ""
                        }
                        ${
                          showSafe
                            ? "bg-linear-to-br from-green-500 to-green-600 text-white"
                            : ""
                        }
                        disabled:cursor-not-allowed
                      `}
                      >
                        {showMine && "💣"}
                        {showSafe && "💎"}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Game Info
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bet Amount:</span>
                  <span className="font-bold">{formatCurrency(betAmount)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Mines:</span>
                  <span className="font-bold">{numMines}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revealed:</span>
                  <span className="font-bold">
                    {gameState.revealed?.length || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Safe Tiles Left:</span>
                  <span className="font-bold">
                    {25 - numMines - (gameState.revealed?.length || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Multiplier */}
            <div className="bg-linear-to-br from-primary-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-sm font-semibold mb-2">Current Multiplier</h3>
              <p className="text-5xl font-bold">
                {gameState.multiplier?.toFixed(2)}x
              </p>
              <p className="text-sm mt-2 text-primary-100">
                Potential Win:{" "}
                {formatCurrency(betAmount * gameState.multiplier)}
              </p>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {!gameState.game_over ? (
                <div className="space-y-3">
                  <Button
                    onClick={cashout}
                    disabled={
                      loading || (gameState.revealed?.length || 0) === 0
                    }
                    variant="success"
                    size="lg"
                    className="w-full"
                  >
                    💰 Cash Out
                  </Button>
                  <p className="text-sm text-gray-600 text-center">
                    Click tiles to increase multiplier
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Result */}
                  <div
                    className={`
                    rounded-lg p-4 text-center
                    ${
                      gameState.game_won
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }
                  `}
                  >
                    <p
                      className={`text-3xl font-bold mb-2 ${
                        gameState.game_won ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {gameState.game_won ? "🎉 You Won!" : "💥 Boom!"}
                    </p>
                    {gameState.game_won && (
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(betAmount * gameState.multiplier)}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={resetGame}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    New Game
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mines;

import { useState } from "react";
import { minesAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const Mines = () => {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [numMines, setNumMines] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { getCashBalance, fetchWallets } = useWallet();
  const { currency } = useAuth();

  const GRID_SIZE = 25;

  const startNewGame = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
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
      if (data.result.game_over) await fetchWallets();
    } catch (err) {
      setError("Failed to reveal tile");
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
      setError("Failed to cashout");
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* PROFESSIONAL HEADER */}
      <div className="bg-linear-to-r from-slate-900 to-orange-900 rounded-2xl shadow-2xl p-6 text-white mb-8 border-b-4 border-orange-500 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-3 rounded-xl shadow-lg">
            <span className="text-4xl">💣</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Minesweeper Pro
            </h1>
            <p className="text-orange-300 text-xs font-bold tracking-widest uppercase">
              High Volatility Risk
            </p>
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
          <p className="text-gray-400 text-[10px] uppercase font-black mb-1">
            Total Balance
          </p>
          <p className="text-2xl font-mono font-bold text-green-400 leading-none">
            {formatCurrency(getCashBalance(), currency)}
          </p>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      {!gameState ? (
        /*SETUP & RULES*/
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-700">
          {/* DETAILED RULES */}
          <div className="lg:col-span-2 space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <span className="bg-orange-50 text-orange-600 p-2 rounded-xl text-xl">
                  📜
                </span>
                How to Play & Multipliers
              </h2>

              <div className="prose prose-orange max-w-none text-gray-600 space-y-6">
                <p>
                  Mines is a game of intuition. The 5x5 grid contains{" "}
                  <strong>25 hidden tiles</strong>. Some contain hidden gems,
                  others contain explosive mines.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border-l-4 border-slate-900">
                    <h4 className="font-black text-slate-900 uppercase text-xs mb-2">
                      The Multiplier
                    </h4>
                    <p className="text-sm">
                      Every time you find a{" "}
                      <span className="text-green-600 font-bold">Gem 💎</span>,
                      your win multiplier increases. You can cash out at any
                      time!
                    </p>
                  </div>
                  <div className="bg-orange-50 p-5 rounded-2xl border-l-4 border-orange-500">
                    <h4 className="font-black text-orange-800 uppercase text-xs mb-2">
                      The Risk
                    </h4>
                    <p className="text-sm">
                      If you click a{" "}
                      <span className="text-red-600 font-bold">Mine 💣</span>,
                      the game ends immediately and your wager is lost.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl text-white">
                  <h4 className="font-black text-orange-500 uppercase text-xs mb-4">
                    Risk Adjustment
                  </h4>
                  <p className="text-sm text-gray-300 mb-4">
                    Increasing the number of mines significantly boosts the
                    multiplier growth per tile revealed.
                  </p>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between border-b border-white/10 pb-1">
                      <span>1 Mine</span>{" "}
                      <span className="text-orange-400">
                        Low Risk / Steady Growth
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-white/10 pb-1">
                      <span>5 Mines</span>{" "}
                      <span className="text-orange-400">
                        Medium Risk / Fast Growth
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-white/10 pb-1">
                      <span>20+ Mines</span>{" "}
                      <span className="text-red-500 font-bold">
                        EXTREME Risk / Insane Payouts
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/*STICKY BET SLIP */}
          <div className="lg:col-span-1 lg:sticky lg:top-8">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-900 overflow-hidden">
              <div className="bg-slate-900 p-5 text-white text-center">
                <h3 className="font-black uppercase tracking-widest text-xs">
                  Game Configuration
                </h3>
              </div>

              <div className="p-8 space-y-8">
                {/* Wager Input */}
                <div className="text-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4">
                    Wager Amount
                  </label>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <button
                      onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-200 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) =>
                        setBetAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-center text-2xl font-black text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      onClick={() => setBetAmount(betAmount + 10)}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Mines Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                    <span>Mines Count</span>
                    <span className="text-orange-600">{numMines}</span>
                  </div>
                  <input
                    type="range"
                    value={numMines}
                    onChange={(e) => setNumMines(parseInt(e.target.value))}
                    min="1"
                    max="24"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between gap-1">
                    {[1, 3, 5, 10, 20].map((m) => (
                      <button
                        key={m}
                        onClick={() => setNumMines(m)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${numMines === m ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  disabled={loading || betAmount <= 0}
                  className="w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? "INITIALIZING..." : "START ROUND"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE GAME GRID*/
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in zoom-in duration-500">
          {/* MAIN 5x5 GRID */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-4 md:p-8 rounded-[40px] shadow-2xl border-12 border-slate-800">
              <div className="grid grid-cols-5 gap-2 md:gap-4 aspect-square">
                {Array.from({ length: GRID_SIZE }, (_, i) => i).map(
                  (position) => {
                    const revealed = gameState.revealed?.includes(position);
                    const isMine = gameState.mine_positions?.includes(position);
                    const showMine = revealed && isMine;
                    const showSafe = revealed && !isMine;

                    return (
                      <button
                        key={position}
                        onClick={() => revealTile(position)}
                        disabled={revealed || gameState.game_over || loading}
                        className={`
                        aspect-square rounded-xl md:rounded-2xl text-2xl md:text-4xl flex items-center justify-center transition-all duration-300
                        ${!revealed && !gameState.game_over ? "bg-slate-700 shadow-[inset_0_-4px_0_rgba(0,0,0,0.3)] hover:bg-slate-600 hover:-translate-y-1 active:translate-y-1 active:bg-slate-800" : ""}
                        ${showMine ? "bg-red-500 shadow-lg shadow-red-900/50 scale-95" : ""}
                        ${showSafe ? "bg-linear-to-br from-green-400 to-emerald-600 shadow-lg shadow-emerald-900/50 scale-95" : ""}
                        ${!revealed && gameState.game_over ? "opacity-40 grayscale" : ""}
                      `}
                      >
                        {showMine && "💣"}
                        {showSafe && "💎"}
                        {!revealed && gameState.game_over && isMine && "💣"}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          {/* ACTIVE GAME STATS SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-linear-to-br from-orange-500 to-red-600 rounded-3xl p-8 text-white shadow-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-black italic select-none">
                WIN
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                Current Payout
              </p>
              <p className="text-6xl font-black tracking-tighter mb-2">
                {gameState.multiplier?.toFixed(2)}
                <span className="text-xl">x</span>
              </p>
              <p className="text-xl font-mono font-bold text-orange-100">
                {formatCurrency(betAmount * gameState.multiplier, currency)}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase">
                  Gems Found
                </span>
                <span className="text-emerald-600 font-black">
                  {gameState.revealed?.length || 0} / {25 - numMines}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase">
                  Next Value
                </span>
                <span className="text-slate-800 font-black">---</span>
              </div>

              {!gameState.game_over ? (
                <Button
                  onClick={cashout}
                  disabled={loading || !gameState.revealed?.length}
                  variant="success"
                  size="lg"
                  className="w-full py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-100"
                >
                  💰 CASH OUT
                </Button>
              ) : (
                <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2">
                  <div
                    className={`p-4 rounded-2xl text-center ${gameState.game_won ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                  >
                    <p className="font-black text-xl uppercase tracking-tighter">
                      {gameState.game_won ? "Hand Won!" : "Game Over"}
                    </p>
                    {gameState.game_won && (
                      <p className="font-mono font-bold">
                        +
                        {formatCurrency(
                          betAmount * gameState.multiplier,
                          currency,
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={resetGame}
                    variant="primary"
                    size="lg"
                    className="w-full py-5 rounded-2xl font-black"
                  >
                    NEW ROUND
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

import { useState } from "react";
import { blackjackAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const Blackjack = () => {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { getCashBalance, fetchWallets } = useWallet();
  const { currency } = useAuth();

  // --- API Handlers ---

  const startNewGame = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance to place this bet.");
      return;
    }
    if (betAmount <= 0) {
      setError("Please enter a valid bet amount.");
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
      if (data.game_state.game_over) await fetchWallets();
    } catch (err) {
      setError("Network error during Hit");
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
      setError("Network error during Stand");
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
      setError("Network error during Double Down");
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
      {/* 1. TOP HEADER BAR */}
      <div className="bg-linear-to-r from-slate-900 via-red-900 to-slate-900 rounded-2xl shadow-2xl p-6 text-white mb-8 border-b-4 border-red-600 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-xl shadow-lg">
            <span className="text-4xl">🃏</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Grand Blackjack
            </h1>
            <p className="text-red-300 text-xs font-bold tracking-widest uppercase">
              The Professional's Table
            </p>
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
          <p className="text-gray-400 text-[10px] uppercase font-black mb-1">
            Available Funds
          </p>
          <p className="text-2xl font-mono font-bold text-green-400 leading-none">
            {formatCurrency(getCashBalance(), currency)}
          </p>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      {!gameState ? (
        /* --- MODE: BET PLACEMENT & RULES --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-700">
          {/* A. RULES SECTION (BIG) */}
          <div className="lg:col-span-2 space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <span className="bg-red-50 text-red-600 p-2 rounded-xl text-xl">
                  📜
                </span>
                Table Rules & House Payouts
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="group bg-slate-50 p-5 rounded-2xl border-l-4 border-slate-900 hover:bg-slate-100 transition-colors">
                    <h4 className="font-black text-slate-900 uppercase text-xs mb-2">
                      Standard Win
                    </h4>
                    <p className="text-sm text-gray-600">
                      Beating the dealer hand pays{" "}
                      <strong className="text-slate-900 font-black">1:1</strong>
                      . Double your wager instantly.
                    </p>
                  </div>

                  <div className="group bg-yellow-50 p-5 rounded-2xl border-l-4 border-yellow-500 hover:bg-yellow-100 transition-colors">
                    <h4 className="font-black text-yellow-800 uppercase text-xs mb-2">
                      Blackjack Bonus
                    </h4>
                    <p className="text-sm text-gray-600">
                      A Natural 21 (Ace + Face Card) pays{" "}
                      <strong className="text-yellow-700 font-black">
                        3:2
                      </strong>
                      . A {currency}100 bet returns {currency}250 total.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl text-white">
                  <h4 className="font-black text-red-500 uppercase text-xs mb-4">
                    Table Specifics
                  </h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-500">✔</span> Dealer must
                      stand on All 17s
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-500">✔</span> Double Down on
                      any initial 2 cards
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-500">✔</span> 6 Decks shuffled
                      every round
                    </li>
                    <li className="flex items-center gap-3 text-gray-400">
                      <span className="text-red-500">✖</span> No Surrender / No
                      Insurance
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h4 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">
                How to play
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                The objective is to get a hand total closer to 21 than the
                dealer without exceeding it. Number cards are worth their face
                value, Jacks, Queens, and Kings are worth 10, and Aces are 1 or
                11.
              </p>
            </div>
          </div>

          {/* B. STICKY BET SLIP (SMALL) */}
          <div className="lg:col-span-1 lg:sticky lg:top-8">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-900 overflow-hidden">
              <div className="bg-slate-900 p-5 text-white text-center">
                <h3 className="font-black uppercase tracking-widest text-xs">
                  Place Your Bet
                </h3>
              </div>

              <div className="p-8 space-y-8">
                <div className="text-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-4">
                    Wager Amount
                  </label>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <button
                      onClick={() => setBetAmount(Math.max(1, betAmount - 10))}
                      className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center font-bold hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      -
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) =>
                          setBetAmount(parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-center text-3xl font-black text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setBetAmount(betAmount + 10)}
                      className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-200 flex items-center justify-center font-bold hover:bg-green-50 hover:text-green-600 transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                    <span>Potential Return</span>
                    <span className="text-green-600 font-mono text-sm">
                      {formatCurrency(betAmount * 2, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                    <span>Blackjack Pay</span>
                    <span className="text-yellow-600 font-mono text-sm">
                      {formatCurrency(betAmount * 2.5, currency)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  disabled={loading || betAmount <= 0}
                  className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 shadow-red-200"
                  }`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "DEAL CARDS"
                  )}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-6 font-medium uppercase tracking-widest">
              Secured by RSA-2048 Encryption
            </p>
          </div>
        </div>
      ) : (
        /* --- MODE: ACTIVE GAME BOARD --- */
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500 pb-20">
          {/* THE FELT TABLE */}
          <div className="bg-emerald-900 p-8 md:p-16 rounded-[100px] shadow-inner border-16 border-amber-900 relative overflow-hidden">
            {/* Subtle table texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>

            {/* Dealer Section */}
            <div className="relative z-10 mb-20 text-center">
              <div className="inline-block bg-black/30 backdrop-blur-sm px-4 py-1 rounded-full mb-6 border border-white/5">
                <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">
                  Dealer{" "}
                  {gameState.dealer_value && `(${gameState.dealer_value})`}
                </h3>
              </div>
              <div className="flex justify-center gap-4">
                {gameState.dealer_hand.map((card, idx) => (
                  <div
                    key={idx}
                    className="bg-white text-slate-900 w-20 h-28 rounded-xl shadow-2xl flex items-center justify-center text-3xl font-black border-2 border-gray-200 transform hover:-translate-y-2 transition-transform duration-300"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Section */}
            <div className="relative z-10 text-center">
              <div className="flex justify-center gap-4 mb-8">
                {gameState.player_hand.map((card, idx) => (
                  <div
                    key={idx}
                    className="bg-white text-blue-600 w-20 h-28 rounded-xl shadow-2xl flex items-center justify-center text-3xl font-black border-4 border-blue-400 transform -rotate-2 hover:rotate-0 transition-all duration-300"
                  >
                    {card}
                  </div>
                ))}
              </div>
              <div className="inline-block bg-blue-600 px-8 py-2 rounded-full shadow-2xl border-2 border-blue-400">
                <h3 className="text-white font-black text-lg uppercase italic tracking-tighter">
                  Your Count: {gameState.player_value}
                </h3>
              </div>
            </div>

            {/* Center Table Text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <p className="text-white text-6xl font-black border-4 border-white px-8 py-2 rounded-full">
                BLACKJACK
              </p>
            </div>
          </div>

          {/* Result Overlay */}
          {gameState.game_over && (
            <div className="text-center space-y-4 animate-in slide-in-from-top-10 duration-500">
              <h2 className="text-6xl font-black text-gray-900 italic uppercase drop-shadow-sm">
                {gameState.result === "win" && "You Won!"}
                {gameState.result === "lose" && "Dealer Wins"}
                {gameState.result === "blackjack" && "BLACKJACK!"}
                {gameState.result === "bust" && "You Busted"}
                {gameState.result === "push" && "Push (Tie)"}
              </h2>
              <Button
                onClick={resetGame}
                variant="danger"
                size="lg"
                className="px-16 py-4 text-xl shadow-xl shadow-red-200"
              >
                PLAY ANOTHER HAND
              </Button>
            </div>
          )}

          {/* Gameplay Controls */}
          {!gameState.game_over && (
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button
                onClick={handleHit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl transition-transform active:scale-95 uppercase tracking-tighter"
              >
                Hit
              </button>
              <button
                onClick={handleStand}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-12 py-5 rounded-2xl shadow-xl transition-transform active:scale-95 uppercase tracking-tighter"
              >
                Stand
              </button>
              {gameState.player_hand.length === 2 && (
                <button
                  onClick={handleDouble}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl transition-transform active:scale-95 uppercase tracking-tighter"
                >
                  Double
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Blackjack;

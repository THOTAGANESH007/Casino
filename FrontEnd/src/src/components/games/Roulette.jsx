import { useState, useEffect } from "react";
import { rouletteAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const Roulette = () => {
  const [bets, setBets] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [chipSize, setChipSize] = useState(10); // Current selected bet amount per click

  const { getCashBalance, fetchWallets } = useWallet();
  const { currency } = useAuth();

  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];

  const getNumberColor = (num) => {
    if (num === 0) return "bg-green-600";
    if (redNumbers.includes(num)) return "bg-red-600";
    return "bg-slate-900";
  };

  const addBet = (type, value) => {
    if (spinning) return;
    const newBet = {
      bet_type: type,
      bet_value: value,
      bet_amount: parseFloat(chipSize),
    };
    setBets([...bets, newBet]);
  };

  const removeBet = (index) => {
    if (spinning) return;
    setBets(bets.filter((_, i) => i !== index));
  };

  const getTotalBet = () => bets.reduce((sum, bet) => sum + bet.bet_amount, 0);

  const handleSpin = async () => {
    if (bets.length === 0) {
      setError("Please place at least one bet on the table.");
      return;
    }
    if (getTotalBet() > getCashBalance()) {
      setError("Insufficient balance.");
      return;
    }

    setError("");
    setLoading(true);
    setSpinning(true);
    setResult(null);

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
      {/* 1. PROFESSIONAL HEADER */}
      <div className="bg-linear-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl p-6 text-white mb-8 border-b-4 border-purple-500 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-3 rounded-xl shadow-lg">
            <span className="text-4xl">🎰</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Royal Roulette
            </h1>
            <p className="text-purple-300 text-xs font-bold tracking-widest uppercase">
              European Single Zero
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/*TABLE & RULES*/}
        <div className="lg:col-span-2 space-y-6">
          {/* SPINNING VISUALIZER */}
          {spinning && (
            <div className="bg-slate-900 p-12 rounded-3xl text-center border-4 border-purple-500/30 animate-pulse">
              <div className="w-24 h-24 border-8 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-white font-black tracking-widest uppercase italic">
                The wheel is spinning...
              </h2>
            </div>
          )}

          {/* LATEST RESULT */}
          {result && !spinning && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-purple-600 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in">
              <div className="flex items-center gap-6">
                <div
                  className={`${getNumberColor(result.winning_number)} w-24 h-24 rounded-full flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white/20`}
                >
                  {result.winning_number}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic">
                    {result.color} wins!
                  </h3>
                  <p className="text-slate-400 text-sm font-bold">
                    The ball landed on {result.winning_number}
                  </p>
                </div>
              </div>
              <div
                className={`text-right p-4 rounded-2xl ${result.total_payout > 0 ? "bg-green-50" : "bg-slate-50"}`}
              >
                <p className="text-[10px] font-black text-gray-400 uppercase">
                  Payout
                </p>
                <p
                  className={`text-3xl font-black ${result.total_payout > 0 ? "text-green-600" : "text-slate-400"}`}
                >
                  {formatCurrency(result.total_payout, currency)}
                </p>
              </div>
            </div>
          )}

          {/* THE BETTING TABLE */}
          <div className="bg-emerald-800 p-6 md:p-10 rounded-[40px] shadow-2xl border-12 border-slate-900 relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>

            <div className="relative z-10 space-y-8">
              {/* Inside Bets (Numbers) */}
              <div className="grid grid-cols-12 border-2 border-white/30 rounded-lg overflow-hidden shadow-2xl">
                {/* Zero */}
                <button
                  onClick={() => addBet("straight", 0)}
                  className="col-span-1 bg-green-600 hover:bg-green-500 text-white font-black text-xl border-r-2 border-white/30 p-4 transition-colors"
                >
                  0
                </button>
                {/* 1-36 Grid */}
                <div className="col-span-11 grid grid-cols-12">
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => addBet("straight", num)}
                      className={`${getNumberColor(num)} hover:opacity-80 text-white font-bold text-sm h-12 border border-white/10 transition-all flex items-center justify-center relative`}
                    >
                      {num}
                      {/* Show mini chip if bet is placed on this number */}
                      {bets.some((b) => b.bet_value === num) && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border border-black text-[8px] flex items-center justify-center text-black font-black">
                          !
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outside Bets */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <button
                  onClick={() => addBet("low", null)}
                  className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase"
                >
                  1-18
                </button>
                <button
                  onClick={() => addBet("even", null)}
                  className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase"
                >
                  Even
                </button>
                <button
                  onClick={() => addBet("red", null)}
                  className="bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase shadow-lg"
                >
                  Red
                </button>
                <button
                  onClick={() => addBet("black", null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase shadow-lg"
                >
                  Black
                </button>
                <button
                  onClick={() => addBet("odd", null)}
                  className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase"
                >
                  Odd
                </button>
                <button
                  onClick={() => addBet("high", null)}
                  className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl border border-white/20 text-xs uppercase"
                >
                  19-36
                </button>
              </div>

              {/* Dozens */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addBet("dozen1", null)}
                  className="bg-black/20 hover:bg-black/40 text-white/80 font-bold py-2 rounded-lg border border-white/10 text-[10px] uppercase"
                >
                  1st 12 (2:1)
                </button>
                <button
                  onClick={() => addBet("dozen2", null)}
                  className="bg-black/20 hover:bg-black/40 text-white/80 font-bold py-2 rounded-lg border border-white/10 text-[10px] uppercase"
                >
                  2nd 12 (2:1)
                </button>
                <button
                  onClick={() => addBet("dozen3", null)}
                  className="bg-black/20 hover:bg-black/40 text-white/80 font-bold py-2 rounded-lg border border-white/10 text-[10px] uppercase"
                >
                  3rd 12 (2:1)
                </button>
              </div>
            </div>
          </div>

          {/* RULES SECTION */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h4 className="font-black text-slate-900 uppercase text-xs mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-600 rounded-full"></span>{" "}
              Payout Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-bold text-gray-400">
              <div className="bg-slate-50 p-3 rounded-xl">
                STRAIGHT UP{" "}
                <span className="block text-slate-800 text-sm">35:1</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                DOZENS/COLS{" "}
                <span className="block text-slate-800 text-sm">2:1</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                RED/BLACK{" "}
                <span className="block text-slate-800 text-sm">1:1</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                EVEN/ODD{" "}
                <span className="block text-slate-800 text-sm">1:1</span>
              </div>
            </div>
          </div>
        </div>

        {/*STICKY BET SLIP*/}
        <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
          {/* CHIP SELECTOR */}
          <div className="bg-slate-900 p-4 rounded-3xl shadow-xl flex justify-between items-center border border-white/10">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-2">
              Chip Size
            </span>
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => setChipSize(val)}
                  className={`w-10 h-10 rounded-full font-black text-[10px] transition-all border-2 ${chipSize === val ? "bg-purple-600 border-white text-white scale-110 shadow-lg" : "bg-slate-800 border-white/10 text-gray-500 hover:text-white"}`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-900 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white text-center">
              <h3 className="font-black uppercase tracking-widest text-xs">
                Active Wagers
              </h3>
            </div>

            <div className="p-6">
              {bets.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-300 text-4xl mb-2">📥</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Click table to place bets
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2">
                  {bets.map((bet, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-gray-100 group"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-purple-600 uppercase">
                          {bet.bet_type}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {bet.bet_value !== null
                            ? `Number ${bet.bet_value}`
                            : "Outside Bet"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700">
                          {formatCurrency(bet.bet_amount, currency)}
                        </span>
                        <button
                          onClick={() => removeBet(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-gray-200 pt-6 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">
                      Total Wager
                    </p>
                    <p className="text-3xl font-black text-slate-900 leading-none">
                      {formatCurrency(getTotalBet(), currency)}
                    </p>
                  </div>
                  <Button
                    onClick={() => setBets([])}
                    variant="secondary"
                    size="sm"
                    className="text-[10px] h-8"
                  >
                    Clear
                  </Button>
                </div>

                <button
                  onClick={handleSpin}
                  disabled={loading || bets.length === 0 || spinning}
                  className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center bg-purple-600 hover:bg-purple-700 shadow-purple-200`}
                >
                  {spinning ? "SPINNING..." : "SPIN WHEEL"}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-tighter">
            Ball outcomes are server-generated and audited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Roulette;

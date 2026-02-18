import { useState, useEffect } from "react";
import { diceAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import { formatCurrency, generateRandomSeed } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const Dice = () => {
  const [betAmount, setBetAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [rollOver, setRollOver] = useState(true);
  const [multiplier, setMultiplier] = useState(1.98);
  const [winChance, setWinChance] = useState(50);
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { getCashBalance, fetchWallets } = useWallet();
  const { currency } = useAuth();

  useEffect(() => {
    setClientSeed(generateRandomSeed());
  }, []);

  useEffect(() => {
    calculateMultiplier();
  }, [target, rollOver]);

  const calculateMultiplier = async () => {
    try {
      const data = await diceAPI.calculateMultiplier(target, rollOver);
      setMultiplier(data.multiplier);
      setWinChance(data.win_chance);
    } catch (err) {
      console.error("Failed to calculate multiplier");
    }
  };

  const handleRoll = async () => {
    if (betAmount > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await diceAPI.roll(
        betAmount,
        target,
        rollOver,
        clientSeed,
        nonce,
      );
      setResult(data);
      setNonce(nonce + 1);
      await fetchWallets();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to roll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* PROFESSIONAL HEADER */}
      <div className="bg-linear-to-r from-slate-900 to-cyan-900 rounded-xl shadow-2xl p-6 text-white mb-8 border-b-4 border-cyan-500">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🎲</span>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">
                Ultimate Dice
              </h1>
              <p className="text-cyan-300 text-xs font-bold tracking-widest uppercase">
                100% Provably Fair
              </p>
            </div>
          </div>
          <div className="text-right bg-black/30 p-3 rounded-lg border border-white/10">
            <p className="text-gray-400 text-[10px] uppercase font-bold">
              Balance
            </p>
            <p className="text-2xl font-mono font-bold text-green-400">
              {formatCurrency(getCashBalance(), currency)}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/*RULES & VERIFICATION*/}
        <div className="lg:col-span-2 space-y-8">
          {/*DISPLAY (Only shows when a roll happened) */}
          {result && (
            <div
              className={`p-8 rounded-2xl shadow-xl text-white animate-in zoom-in duration-300 ${result.won ? "bg-linear-to-br from-green-500 to-emerald-600" : "bg-linear-to-br from-red-500 to-rose-600"}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase opacity-70">
                    Roll Result
                  </p>
                  <h2 className="text-7xl font-black">{result.roll_result}</h2>
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-black italic uppercase">
                    {result.won ? "You Win!" : "House Wins"}
                  </h3>
                  {result.won && (
                    <p className="text-2xl font-mono">
                      +{formatCurrency(result.payout, currency)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="bg-cyan-100 p-2 rounded-lg">📜</span> Game
              Mechanics & Fairness
            </h2>

            <div className="prose prose-cyan max-w-none text-gray-600 space-y-6">
              <section>
                <h4 className="text-gray-900 font-bold mb-2">How to Play</h4>
                <p className="text-sm">
                  Choose a <strong>Target Number</strong> and whether you want
                  to roll <strong>Over</strong> or <strong>Under</strong> that
                  number. The more difficult the target, the higher the
                  multiplier!
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h5 className="font-bold text-gray-800 text-xs uppercase mb-2">
                    The Multiplier Math
                  </h5>
                  <p className="text-xs">
                    We apply a tiny <strong>1% House Edge</strong>. Multipliers
                    are calculated as:
                    <br />
                    <code className="bg-gray-200 px-1 rounded">
                      99 / Win Probability
                    </code>
                  </p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-xl">
                  <h5 className="font-bold text-cyan-800 text-xs uppercase mb-2">
                    Instant Payouts
                  </h5>
                  <p className="text-xs">
                    Wins are credited to your cash wallet the moment the hash is
                    verified on the server.
                  </p>
                </div>
              </section>

              <section className="pt-6 border-t border-gray-100">
                <h4 className="text-gray-900 font-bold mb-4">
                  Provably Fair Implementation
                </h4>
                <p className="text-sm mb-4">
                  Each roll is determined by three variables: a Server Seed, a
                  Client Seed, and a Nonce. This ensures the house cannot change
                  the result after you bet.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Client Seed (Your Secret)"
                    type="text"
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    label="Current Nonce"
                    type="number"
                    value={nonce}
                    readOnly
                    className="bg-gray-50 text-xs"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic text-center">
                  Note: Nonce increases by 1 after every roll to ensure unique
                  outcomes.
                </p>
              </section>
            </div>
          </div>
        </div>

        {/*COMPACT BET SLIP*/}
        <div className="lg:col-span-1 sticky top-8">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden">
            <div className="bg-slate-900 p-4 text-white text-center">
              <h3 className="font-bold uppercase tracking-widest text-sm">
                Place Your Bet
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Bet Amount */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">
                  Wager
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) =>
                      setBetAmount(parseFloat(e.target.value) || 0)
                    }
                    className="flex-1 text-2xl font-black text-slate-800 border-b-2 border-gray-100 focus:border-cyan-500 outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBetAmount(betAmount / 2)}
                      className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold hover:bg-gray-200"
                    >
                      1/2
                    </button>
                    <button
                      onClick={() => setBetAmount(betAmount * 2)}
                      className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold hover:bg-gray-200"
                    >
                      X2
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                  <span>Target: {target.toFixed(2)}</span>
                  <span>{rollOver ? "Roll Over" : "Roll Under"}</span>
                </div>
                <input
                  type="range"
                  value={target}
                  onChange={(e) => setTarget(parseFloat(e.target.value))}
                  min="2"
                  max="98"
                  step="1"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                />
                <select
                  value={rollOver}
                  onChange={(e) => setRollOver(e.target.value === "true")}
                  className="w-full bg-gray-50 border-none text-xs font-bold p-2 rounded-lg"
                >
                  <option value="true">Roll Over &gt; {target}</option>
                  <option value="false">Roll Under &lt; {target}</option>
                </select>
              </div>

              {/* Stats Summary */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">
                    Multiplier
                  </span>
                  <span className="font-mono font-bold text-cyan-600">
                    {multiplier}x
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">
                    Win Chance
                  </span>
                  <span className="font-mono font-bold text-cyan-600">
                    {winChance.toFixed(2)}%
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">
                    Profit on Win
                  </span>
                  <span className="font-mono font-bold text-green-600">
                    +
                    {formatCurrency(
                      betAmount * multiplier - betAmount,
                      currency,
                    )}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleRoll}
                disabled={loading || betAmount <= 0}
                variant="primary"
                size="lg"
                className="w-full py-4 shadow-lg shadow-cyan-100 bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? "ROLLING..." : "ROLL DICE"}
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-4">
            Encrypted with SHA-256 technology for your protection.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dice;

import React, { useState, useEffect } from "react";
import { jackpotAPI } from "../../api/jackpot";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const JackpotTicker = () => {
  const [jackpots, setJackpots] = useState([]);
  const { currency } = useAuth();

  useEffect(() => {
    fetchJackpots();
    const interval = setInterval(fetchJackpots, 60000); // Update every 1hr
    return () => clearInterval(interval);
  }, []);

  const fetchJackpots = async () => {
    try {
      const data = await jackpotAPI.getJackpots();
      setJackpots(data);
    } catch (err) {
      console.error("Failed to fetch jackpots");
    }
  };

  if (jackpots.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 border-b-2 border-yellow-500 shadow-xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-center md:justify-between items-center gap-4">
        {/* Label */}
        <div className="flex items-center gap-2 animate-pulse">
          <span className="text-2xl">🎰</span>
          <span className="text-yellow-400 font-black tracking-widest uppercase text-sm md:text-base">
            Live Progressive Jackpots
          </span>
        </div>

        {/* Pots */}
        <div className="flex gap-6 md:gap-12">
          {jackpots.map((jp) => (
            <div key={jp.jackpot_id} className="text-center">
              <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {jp.name}
              </h3>
              <p className="text-white text-xl md:text-2xl font-mono font-bold text-shadow-glow">
                {formatCurrency(jp.current_amount, currency)}
              </p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="hidden md:block text-xs text-slate-500">
          Bet &gt; 100 to qualify
        </div>
      </div>
    </div>
  );
};

export default JackpotTicker;

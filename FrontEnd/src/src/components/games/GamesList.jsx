import React from "react";
import { Link } from "react-router-dom";
import { GAMES } from "../../utils/constants";
import { useWallet } from "../../hooks/useWallet";
import { formatCurrency } from "../../utils/helpers";

const GamesList = () => {
  const { getCashBalance } = useWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          🎮 Casino Games
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Choose your game and start playing!
        </p>
        <div className="inline-block bg-linear-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl shadow-lg">
          <p className="text-sm font-semibold mb-1">Your Balance</p>
          <p className="text-3xl font-bold">
            {formatCurrency(getCashBalance())}
          </p>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Link key={game.id} to={game.route} className="group">
            <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              {/* Game Header with linear */}
              <div className={`bg-linear-to-br ${game.color} p-6 text-white`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-6xl">{game.icon}</div>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                    RTP: {game.rtp}
                  </span>
                </div>
                <h3 className="text-2xl font-bold">{game.name}</h3>
              </div>

              {/* Game Info */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">{game.description}</p>
                <button className="w-full btn-primary py-3 text-lg">
                  Play Now →
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default GamesList;

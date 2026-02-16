import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { gameAPI } from "../../api/game";
import Loading from "../common/Loading";
import JackpotTicker from "../common/JackpotTicker";

const GamesList = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const data = await gameAPI.getAvailableGames();
        setGames(data);
      } catch (err) {
        console.error("Failed to fetch games");
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  const getGameMeta = (gameName) => {
    const meta = {
      Blackjack: {
        route: "/games/blackjack",
        icon: "🃏",
        color: "from-red-500 to-pink-600",
      },
      Roulette: {
        route: "/games/roulette",
        icon: "🎰",
        color: "from-purple-500 to-indigo-600",
      },
      Slots: {
        route: "/games/slots",
        icon: "🍒",
        color: "from-green-500 to-teal-600",
      },
      Mines: {
        route: "/games/mines",
        icon: "💣",
        color: "from-yellow-500 to-orange-600",
      },
      Crash: {
        route: "/games/crash",
        icon: "🚀",
        color: "from-pink-500 to-rose-600",
      },
      Dice: {
        route: "/games/dice",
        icon: "🎲",
        color: "from-blue-500 to-cyan-600",
      },
      "Fantasy Cricket": {
        route: "/games/fantasy-cricket",
        icon: "🏏",
        color: "from-indigo-500 to-purple-600",
      },
      "Real Fantasy Cricket": {
        route: "/games/real-fantasy",
        icon: "🌍",
        color: "from-blue-600 to-cyan-700",
      },
    };
    return (
      meta[gameName] || {
        route: "#",
        icon: "🎮",
        color: "from-gray-500 to-gray-600",
      }
    );
  };

  if (loading) return <Loading message="Loading your casino floor..." />;

  return (
    <div>
      <JackpotTicker />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-xl shadow">
              <h2 className="text-2xl text-gray-400 font-bold">
                No games available currently.
              </h2>
              <p className="text-gray-500 mt-2">
                Your casino admin hasn't added any games yet.
              </p>
            </div>
          ) : (
            games.map((game) => {
              const meta = getGameMeta(game.game_name);
              return (
                <Link key={game.game_id} to={meta.route} className="group">
                  <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <div
                      className={`bg-linear-to-br ${meta.color} p-6 text-white`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-6xl">{meta.icon}</div>
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                          {game.provider_name}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold">{game.game_name}</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <span>RTP</span>
                        <span className="font-bold text-green-600">
                          {game.rtp_percent}%
                        </span>
                      </div>
                      <button className="w-full btn-primary py-3 text-lg">
                        Play Now →
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GamesList;

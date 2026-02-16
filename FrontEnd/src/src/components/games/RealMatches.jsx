import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { realFantasyAPI } from "../../api/real_fantasy";
import { useAuth } from "../../hooks/useAuth";

const RealMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currency } = useAuth();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await realFantasyAPI.getMatches();
      setMatches(response.data);
    } catch (error) {
      console.error("Error fetching real matches:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-linear-to-r from-blue-800 to-indigo-900 rounded-xl p-8 mb-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">🏏 Real Fantasy Cricket</h1>
        <p className="text-blue-200">
          Daily contests based on real-world match outcomes. Data synced live
          via Cricbuzz.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => navigate("/my-teams")}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50"
        >
          View My Teams
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          No upcoming matches available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div
              key={match.match_id}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
            >
              {/* Status Header */}
              <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    match.status === "LIVE"
                      ? "bg-red-100 text-red-600"
                      : match.status === "COMPLETED"
                        ? "bg-gray-200 text-gray-600"
                        : "bg-green-100 text-green-600"
                  }`}
                >
                  {match.status}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(match.match_date).toLocaleString()}
                </span>
              </div>

              {/* Teams */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-center w-1/3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-800 font-bold">
                      {match.team_a.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-bold text-gray-800 line-clamp-1">
                      {match.team_a}
                    </div>
                  </div>
                  <div className="text-gray-400 font-bold text-xs">VS</div>
                  <div className="text-center w-1/3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-800 font-bold">
                      {match.team_b.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-bold text-gray-800 line-clamp-1">
                      {match.team_b}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Entry</p>
                    <p className="font-bold text-green-600 text-lg">
                      {match.entry_fee} {currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase">
                      Prize Pool
                    </p>
                    <p className="font-bold text-indigo-600 text-lg">
                      {match.prize_pool} {currency}
                    </p>
                  </div>
                </div>

                {match.is_active &&
                !match.teams_locked &&
                match.status === "UPCOMING" ? (
                  <button
                    onClick={() =>
                      navigate(`/games/real-fantasy/create/${match.match_id}`)
                    }
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Create Team
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/leaderboard/${match.match_id}`)}
                    className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                  >
                    {match.teams_locked
                      ? "View Leaderboard"
                      : "Match Not Active"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RealMatches;

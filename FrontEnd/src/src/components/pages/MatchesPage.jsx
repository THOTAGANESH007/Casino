import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState("all"); // all, live, upcoming
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/matches`);
      setMatches(response.data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    if (filter === "all") return match.is_active;
    if (filter === "live") return match.status === "live" && match.is_active;
    if (filter === "upcoming")
      return match.status === "upcoming" && match.is_active;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cricket Matches</h1>
          <p className="text-gray-600 mt-1">
            Create your fantasy team and compete!
          </p>
        </div>
        <div className="flex gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === "live"}
            onClick={() => setFilter("live")}
          >
            🔴 Live
          </FilterButton>
          <FilterButton
            active={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
          >
            📅 Upcoming
          </FilterButton>
        </div>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">No matches available</p>
          <p className="text-gray-400 text-sm mt-2">
            Check back later for upcoming contests
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.match_id}
              match={match}
              onCreateTeam={() => navigate(`/create-team/${match.match_id}`)}
              onViewLeaderboard={() =>
                navigate(`/leaderboard/${match.match_id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
    }`}
  >
    {children}
  </button>
);

const MatchCard = ({ match, onCreateTeam, onViewLeaderboard }) => {
  const isLive = match.status === "live";
  const isUpcoming = match.status === "upcoming";
  const isCompleted = match.status === "completed";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Status Badge */}
      <div
        className={`px-4 py-2 text-sm font-semibold ${
          isLive
            ? "bg-red-500 text-white"
            : isUpcoming
              ? "bg-green-500 text-white"
              : "bg-gray-500 text-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <span>
            {isLive ? "🔴 LIVE" : isUpcoming ? "📅 UPCOMING" : "✓ COMPLETED"}
          </span>
          <span className="text-xs">{match.match_type.toUpperCase()}</span>
        </div>
      </div>

      {/* Match Info */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">
          {match.match_name}
        </h3>

        {/* Teams */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">
                  {match.team_a.substring(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="font-semibold text-gray-800">
                {match.team_a}
              </span>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm font-medium">
            VS
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">
                  {match.team_b.substring(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="font-semibold text-gray-800">
                {match.team_b}
              </span>
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="text-sm text-gray-600 mb-4">
          <span className="font-medium">📍 {match.venue}</span>
        </div>

        {/* Match Date */}
        {match.match_date && (
          <div className="text-sm text-gray-500 mb-4">
            🕐 {new Date(match.match_date).toLocaleString()}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!match.teams_locked && (
            <button
              onClick={onCreateTeam}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105"
            >
              Create Team
            </button>
          )}

          <button
            onClick={onViewLeaderboard}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View Leaderboard
          </button>

          {match.teams_locked && (
            <div className="text-center text-sm text-orange-600 font-medium">
              🔒 Team creation locked
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;

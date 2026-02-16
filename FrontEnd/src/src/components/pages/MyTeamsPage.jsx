import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MyTeamsPage = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const navigate = useNavigate();

  // Replace with actual user ID from auth context
  const userId = 1;

  useEffect(() => {
    fetchUserTeams();
  }, []);

  const fetchUserTeams = async () => {
    try {
      setLoading(true);
      // Fetch all matches first
      const matchesRes = await axios.get(`${API_URL}/admin/matches`);
      const matches = matchesRes.data;

      // Fetch teams for each match
      const allTeams = [];
      for (const match of matches) {
        try {
          const teamsRes = await axios.get(
            `${API_URL}/teams/user/${userId}/match/${match.match_id}`,
          );

          const teamsWithMatch = teamsRes.data.map((team) => ({
            ...team,
            match: match,
          }));

          allTeams.push(...teamsWithMatch);
        } catch (error) {
          // No teams for this match
          continue;
        }
      }

      setTeams(allTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewTeamDetails = async (teamId) => {
    try {
      const response = await axios.get(`${API_URL}/teams/${teamId}`);
      setSelectedTeam(response.data);
    } catch (error) {
      console.error("Error fetching team details:", error);
      alert("Failed to load team details");
    }
  };

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
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Teams</h1>
        <p className="text-gray-600">
          View and manage your fantasy cricket teams
        </p>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🏏</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Teams Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first fantasy team to get started!
          </p>
          <button
            onClick={() => navigate("/matches")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Browse Matches
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.team_id}
              team={team}
              onViewDetails={() => viewTeamDetails(team.team_id)}
              onViewLeaderboard={() =>
                navigate(`/leaderboard/${team.match.match_id}`)
              }
            />
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
};

const TeamCard = ({ team, onViewDetails, onViewLeaderboard }) => {
  const match = team.match;
  const isLive = match?.status === "live";
  const isCompleted = match?.status === "completed";

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Match Info Header */}
      <div
        className={`px-4 py-3 ${
          isLive ? "bg-red-500" : isCompleted ? "bg-gray-500" : "bg-blue-500"
        } text-white`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {isLive ? "🔴 LIVE" : isCompleted ? "✓ COMPLETED" : "📅 UPCOMING"}
          </span>
          <span className="text-xs">{match?.match_type?.toUpperCase()}</span>
        </div>
      </div>

      {/* Team Info */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {team.team_name}
        </h3>

        {match && (
          <p className="text-sm text-gray-600 mb-4">
            {match.team_a} vs {match.team_b}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {team.total_points?.toFixed(1) || "0.0"}
            </div>
            <div className="text-xs text-gray-500">Points</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {team.rank || "-"}
            </div>
            <div className="text-xs text-gray-500">Rank</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {team.total_credits?.toFixed(1) || "0.0"}
            </div>
            <div className="text-xs text-gray-500">Credits</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              team.status === "submitted"
                ? "bg-green-100 text-green-800"
                : team.status === "locked"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {team.status?.toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onViewDetails}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            View Team Details
          </button>

          {match && (
            <button
              onClick={onViewLeaderboard}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              View Leaderboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TeamDetailsModal = ({ team, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{team.team_name}</h2>
              <p className="text-blue-100">
                Total Points: {team.total_points?.toFixed(2)} | Rank: #
                {team.rank || "-"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="p-6">
          <div className="space-y-3">
            {team.players?.map((player, idx) => (
              <PlayerRow key={player.player_id} player={player} index={idx} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Credits Used: {team.total_credits?.toFixed(1)}/100
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerRow = ({ player, index }) => {
  const roleColors = {
    WK: "bg-purple-100 text-purple-700 border-purple-300",
    BAT: "bg-blue-100 text-blue-700 border-blue-300",
    AR: "bg-green-100 text-green-700 border-green-300",
    BOWL: "bg-red-100 text-red-700 border-red-300",
  };

  const performance = player.performance;

  return (
    <div
      className={`border rounded-lg p-4 ${
        player.is_captain
          ? "border-green-500 bg-green-50"
          : player.is_vice_captain
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Player Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500 font-semibold w-6">
              #{index + 1}
            </span>
            <h4 className="font-bold text-gray-900">{player.name}</h4>
            {player.is_captain && (
              <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                C (2x)
              </span>
            )}
            {player.is_vice_captain && (
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                VC (1.5x)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`px-2 py-1 rounded border ${roleColors[player.role]}`}
            >
              {player.role}
            </span>
            <span className="text-gray-600">{player.team}</span>
            <span className="text-yellow-600 font-semibold">
              {player.credits} cr
            </span>
          </div>

          {/* Performance Stats */}
          {performance && (
            <div className="mt-2 flex gap-4 text-xs text-gray-600">
              {performance.runs > 0 && (
                <span>
                  Runs: <strong>{performance.runs}</strong>
                </span>
              )}
              {performance.wickets > 0 && (
                <span>
                  Wickets: <strong>{performance.wickets}</strong>
                </span>
              )}
              {performance.fantasy_points > 0 && (
                <span className="text-green-600 font-semibold">
                  Base Points: {performance.fantasy_points}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Points */}
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {player.points?.toFixed(1) || "0.0"}
          </div>
          <div className="text-xs text-gray-500">Points</div>
        </div>
      </div>
    </div>
  );
};

export default MyTeamsPage;

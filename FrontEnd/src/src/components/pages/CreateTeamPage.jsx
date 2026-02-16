import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CreateTeamPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [filter, setFilter] = useState("all"); // all, wk, bat, ar, bowl
  const [teamFilter, setTeamFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMatchAndPlayers();
  }, [matchId]);

  const fetchMatchAndPlayers = async () => {
    try {
      setLoading(true);

      // Fetch match details
      const matchRes = await axios.get(`${API_URL}/admin/matches/${matchId}`);
      setMatch(matchRes.data);

      // Fetch players
      const playersRes = await axios.get(
        `${API_URL}/admin/matches/${matchId}/players`,
      );
      setPlayers(playersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load match data");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (player) => {
    const isSelected = selectedPlayers.find(
      (p) => p.player_id === player.player_id,
    );

    if (isSelected) {
      setSelectedPlayers(
        selectedPlayers.filter((p) => p.player_id !== player.player_id),
      );
      if (captain?.player_id === player.player_id) setCaptain(null);
      if (viceCaptain?.player_id === player.player_id) setViceCaptain(null);
    } else {
      if (selectedPlayers.length < 11) {
        setSelectedPlayers([...selectedPlayers, player]);
      }
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (selectedPlayers.length !== 11) {
      alert("Please select exactly 11 players");
      return;
    }

    if (!captain || !viceCaptain) {
      alert("Please select captain and vice-captain");
      return;
    }

    if (captain.player_id === viceCaptain.player_id) {
      alert("Captain and vice-captain must be different");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await axios.post(
        `${API_URL}/teams/create`,
        {
          match_id: parseInt(matchId),
          team_name: teamName || `Team ${Date.now()}`,
          player_ids: selectedPlayers.map((p) => p.player_id),
          captain_id: captain.player_id,
          vice_captain_id: viceCaptain.player_id,
        },
        {
          params: { user_id: 1 }, // Replace with actual user ID from auth
        },
      );

      alert("Team created successfully!");
      navigate("/my-teams");
    } catch (error) {
      setError(error.response?.data?.detail || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate stats
  const totalCredits = selectedPlayers.reduce(
    (sum, p) => sum + parseFloat(p.credits),
    0,
  );
  const roleCounts = selectedPlayers.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
  const teamCounts = selectedPlayers.reduce((acc, p) => {
    acc[p.team] = (acc[p.team] || 0) + 1;
    return acc;
  }, {});

  // Filter players
  const filteredPlayers = players.filter((p) => {
    if (filter !== "all" && p.role.toLowerCase() !== filter) return false;
    if (teamFilter !== "all" && p.team !== teamFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isValid =
    selectedPlayers.length === 11 &&
    captain &&
    viceCaptain &&
    totalCredits <= 100;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/matches")}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        ← Back to Matches
      </button>

      {/* Match Info */}
      {match && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {match.match_name}
          </h2>
          <div className="flex items-center gap-4 text-gray-600">
            <span>
              {match.team_a} vs {match.team_b}
            </span>
            <span>•</span>
            <span>{match.match_type.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Team Name Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Name
        </label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Players"
          value={`${selectedPlayers.length}/11`}
          color={selectedPlayers.length === 11 ? "green" : "blue"}
        />
        <StatCard
          label="Credits"
          value={`${totalCredits.toFixed(1)}/100`}
          color={totalCredits > 100 ? "red" : "green"}
        />
        <StatCard
          label="WK"
          value={`${roleCounts["wk"] || 0}`}
          color={(roleCounts["wk"] || 0) >= 1 ? "green" : "gray"}
        />
        <StatCard
          label="BAT"
          value={`${roleCounts["bat"] || 0}`}
          color={(roleCounts["bat"] || 0) >= 3 ? "green" : "gray"}
        />
        <StatCard
          label="BOWL"
          value={`${roleCounts["bowl"] || 0}`}
          color={(roleCounts["bowl"] || 0) >= 1 ? "green" : "gray"}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All Players
          </FilterChip>
          <FilterChip active={filter === "wk"} onClick={() => setFilter("wk")}>
            WK
          </FilterChip>
          <FilterChip
            active={filter === "bat"}
            onClick={() => setFilter("bat")}
          >
            BAT
          </FilterChip>
          <FilterChip active={filter === "ar"} onClick={() => setFilter("ar")}>
            AR
          </FilterChip>
          <FilterChip
            active={filter === "bowl"}
            onClick={() => setFilter("bowl")}
          >
            BOWL
          </FilterChip>

          {match && (
            <>
              <div className="w-px bg-gray-300 mx-2"></div>
              <FilterChip
                active={teamFilter === "all"}
                onClick={() => setTeamFilter("all")}
              >
                Both Teams
              </FilterChip>
              <FilterChip
                active={teamFilter === match.team_a}
                onClick={() => setTeamFilter(match.team_a)}
              >
                {match.team_a}
              </FilterChip>
              <FilterChip
                active={teamFilter === match.team_b}
                onClick={() => setTeamFilter(match.team_b)}
              >
                {match.team_b}
              </FilterChip>
            </>
          )}
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => (
          <PlayerCard
            key={player.player_id}
            player={player}
            isSelected={
              !!selectedPlayers.find((p) => p.player_id === player.player_id)
            }
            isCaptain={captain?.player_id === player.player_id}
            isViceCaptain={viceCaptain?.player_id === player.player_id}
            onToggle={() => togglePlayer(player)}
            onSetCaptain={() => setCaptain(player)}
            onSetViceCaptain={() => setViceCaptain(player)}
          />
        ))}
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="container mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              isValid && !submitting
                ? "bg-linear-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 transform hover:scale-105"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {submitting ? "Creating Team..." : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};

const FilterChip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);

const PlayerCard = ({
  player,
  isSelected,
  isCaptain,
  isViceCaptain,
  onToggle,
  onSetCaptain,
  onSetViceCaptain,
}) => {
  const roleColors = {
    wk: "bg-purple-100 text-purple-700",
    bat: "bg-blue-100 text-blue-700",
    ar: "bg-green-100 text-green-700",
    bowl: "bg-red-100 text-red-700",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all ${
        isSelected ? "border-blue-500 shadow-lg" : "border-transparent"
      }`}
    >
      <div className="p-4">
        {/* Player Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{player.name}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${roleColors[player.role.toLowerCase()]}`}
              >
                {player.role.toUpperCase()}
              </span>
              <span className="text-xs text-gray-600">{player.team}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600">
              {player.credits}
            </div>
            <div className="text-xs text-gray-500">credits</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onToggle}
            className={`w-full py-2 rounded-lg font-medium transition-colors ${
              isSelected
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isSelected ? "Remove" : "Select"}
          </button>

          {isSelected && (
            <div className="flex gap-2">
              <button
                onClick={onSetCaptain}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isCaptain
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isCaptain ? "✓ Captain (2x)" : "Captain"}
              </button>
              <button
                onClick={onSetViceCaptain}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isViceCaptain
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isViceCaptain ? "✓ VC (1.5x)" : "VC"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTeamPage;

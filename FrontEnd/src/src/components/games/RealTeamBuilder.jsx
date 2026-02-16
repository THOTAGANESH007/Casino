import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { realFantasyAPI } from "../../api/real_fantasy";
import { useAuth } from "../../hooks/useAuth";

const RealTeamBuilder = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await realFantasyAPI.getPlayersForMatch(matchId);
        setPlayers(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load players. Is the match activated by admin?");
        navigate("/games/real-fantasy");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [matchId]);

  const togglePlayer = (player) => {
    if (selectedPlayers.find((p) => p.player_id === player.player_id)) {
      // Remove
      setSelectedPlayers((prev) =>
        prev.filter((p) => p.player_id !== player.player_id),
      );
      if (captain?.player_id === player.player_id) setCaptain(null);
      if (viceCaptain?.player_id === player.player_id) setViceCaptain(null);
    } else {
      // Add (Limit 11)
      if (selectedPlayers.length < 11) {
        setSelectedPlayers((prev) => [...prev, player]);
      }
    }
  };

  const handleSubmit = async () => {
    // Basic Validation
    if (selectedPlayers.length !== 11) {
      alert("Select exactly 11 Players");
      return;
    }
    if (!captain || !viceCaptain) {
      alert("Select Captain & Vice-Captain");
      return;
    }
    if (!teamName) {
      alert("Enter a Team Name");
      return;
    }
    if (captain.player_id === viceCaptain.player_id) {
      alert("Captain and Vice-Captain must be different");
      return;
    }

    try {
      const data = {
        match_id: parseInt(matchId),
        team_name: teamName,
        player_ids: selectedPlayers.map((p) => p.player_id),
        captain_id: captain.player_id,
        vice_captain_id: viceCaptain.player_id,
      };
      await realFantasyAPI.createTeam(data);
      alert("Team Created Successfully! Entry fee deducted.");
      navigate("/my-teams");
    } catch (err) {
      alert(err.response?.data?.detail || "Team creation failed");
    }
  };

  // Stats for UI
  const totalCredits = selectedPlayers.reduce((sum, p) => sum + p.credits, 0);
  const roleCounts = selectedPlayers.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});

  const filteredPlayers = players.filter(
    (p) => roleFilter === "ALL" || p.role === roleFilter,
  );

  if (loading)
    return <div className="text-center p-10">Loading Players...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      {/* Header Stats */}
      <div className="bg-white sticky top-0 z-10 shadow p-4 rounded-xl mb-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Create Your Team</h2>
          <input
            className="border p-2 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          <div
            className={`p-2 rounded ${selectedPlayers.length === 11 ? "bg-green-100 text-green-700" : "bg-gray-100"}`}
          >
            <div className="font-bold">{selectedPlayers.length}/11</div>
            <div className="text-xs">Players</div>
          </div>
          <div
            className={`p-2 rounded ${totalCredits <= 100 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
          >
            <div className="font-bold">{totalCredits.toFixed(1)}/100</div>
            <div className="text-xs">Credits</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-bold">{roleCounts["BAT"] || 0}</div>
            <div className="text-xs">BAT</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-bold">{roleCounts["BOWL"] || 0}</div>
            <div className="text-xs">BOWL</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-bold">
              {(roleCounts["WK"] || 0) + (roleCounts["AR"] || 0)}
            </div>
            <div className="text-xs">WK/AR</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {["ALL", "WK", "BAT", "AR", "BOWL"].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${roleFilter === role ? "bg-black text-white" : "bg-gray-200 text-gray-700"}`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Player List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => {
          const isSelected = selectedPlayers.find(
            (p) => p.player_id === player.player_id,
          );
          return (
            <div
              key={player.player_id}
              onClick={() => togglePlayer(player)}
              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "bg-indigo-50 border-indigo-600"
                  : "bg-white border-transparent shadow-xs"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                    {player.role}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{player.name}</h4>
                    <p className="text-xs text-gray-500">{player.team}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">
                    {player.credits}
                  </span>
                  <span className="text-xs block text-gray-400">Cr</span>
                </div>
              </div>

              {isSelected && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-indigo-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptain(player);
                    }}
                    className={`flex-1 py-1 text-xs font-bold rounded ${captain?.player_id === player.player_id ? "bg-yellow-400 text-black" : "bg-white border border-gray-300"}`}
                  >
                    C (2x)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViceCaptain(player);
                    }}
                    className={`flex-1 py-1 text-xs font-bold rounded ${viceCaptain?.player_id === player.player_id ? "bg-gray-800 text-white" : "bg-white border border-gray-300"}`}
                  >
                    VC (1.5x)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-2xl">
        <button
          onClick={handleSubmit}
          disabled={selectedPlayers.length !== 11}
          className={`w-full max-w-7xl mx-auto block py-4 rounded-lg font-bold text-lg text-white ${
            selectedPlayers.length === 11
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {selectedPlayers.length !== 11
            ? `Select ${11 - selectedPlayers.length} more players`
            : "Submit Team & Pay Entry"}
        </button>
      </div>
    </div>
  );
};

export default RealTeamBuilder;

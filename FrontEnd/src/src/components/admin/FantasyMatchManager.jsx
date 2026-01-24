import React, { useState, useEffect } from "react";
import { fantasyCricketAPI, fantasyAdminAPI } from "../../api/games";
import Button from "../common/Button";
import Input from "../common/Input";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Badge from "../common/Badge";

const FantasyMatchManager = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [view, setView] = useState("list"); // list, create, roster, stats

  // --- CREATE MATCH FORM STATE ---
  const [newMatch, setNewMatch] = useState({
    match_id: "",
    team1: "",
    team2: "",
    entry_fee: 10,
    max_budget: 100,
  });

  // --- ROSTER / STATS STATE ---
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [matchPlayers, setMatchPlayers] = useState([]);

  // Add Player State
  const [newPlayer, setNewPlayer] = useState({
    player_id: "",
    name: "",
    role: "batsman",
    team: "",
    base_price: 9.0,
  });

  // Update Stats State
  const [playerStats, setPlayerStats] = useState({
    player_id: "",
    runs_scored: 0,
    wickets_taken: 0,
    catches: 0,
    run_outs: 0,
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  // --- FETCHERS ---
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await fantasyCricketAPI.getMatches();
      setMatches(data.matches || []);
    } catch (err) {
      setError("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async (matchId) => {
    try {
      const data = await fantasyCricketAPI.getMatchPlayers(matchId);
      setMatchPlayers(data.players || []);
    } catch (err) {
      setError("Failed to fetch players");
    }
  };

  // --- ACTIONS ---

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await fantasyAdminAPI.createMatch(newMatch);
      setSuccess("Match created successfully!");
      fetchMatches();
      setView("list");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create match");
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      // Ensure player_id is int
      const payload = {
        ...newPlayer,
        player_id: parseInt(newPlayer.player_id),
      };
      await fantasyAdminAPI.addPlayerToMatch(selectedMatchId, payload);
      setSuccess(`Player ${newPlayer.name} added!`);
      // Reset some fields
      setNewPlayer({
        ...newPlayer,
        player_id: parseInt(newPlayer.player_id) + 1,
        name: "",
      });
      fetchPlayers(selectedMatchId); // Refresh list
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add player");
    }
  };

  const handleUpdateStats = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...playerStats,
        player_id: parseInt(playerStats.player_id),
      };
      await fantasyAdminAPI.updatePlayerStats(selectedMatchId, payload);
      setSuccess("Stats updated successfully");
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed");
    }
  };

  const handleStartMatch = async (matchId) => {
    if (
      !window.confirm(
        "Start match? Users won't be able to create teams anymore.",
      )
    )
      return;
    try {
      await fantasyAdminAPI.startMatch(matchId);
      setSuccess("Match Started!");
      fetchMatches();
    } catch (err) {
      setError("Failed to start match");
    }
  };

  const handleSettleMatch = async (matchId) => {
    if (
      !window.confirm(
        "Settle match? This will distribute prizes based on current stats.",
      )
    )
      return;
    try {
      await fantasyAdminAPI.settleMatch(matchId);
      setSuccess("Match Settled & Prizes Distributed!");
      fetchMatches();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to settle match");
    }
  };

  // --- UI HELPERS ---
  const openRoster = (match) => {
    setSelectedMatchId(match.match_id);
    setNewPlayer({ ...newPlayer, team: match.team1 }); // Default to team 1
    fetchPlayers(match.match_id);
    setView("roster");
  };

  const openStats = (match) => {
    setSelectedMatchId(match.match_id);
    fetchPlayers(match.match_id);
    setView("stats");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Fantasy Cricket Manager
        </h2>
        {view !== "list" && (
          <Button variant="secondary" onClick={() => setView("list")}>
            ← Back to Matches
          </Button>
        )}
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* --- VIEW: LIST --- */}
      {view === "list" && (
        <div className="space-y-4">
          <Button onClick={() => setView("create")}>+ Create New Match</Button>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pool
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {matches.map((m) => (
                  <tr key={m.match_id}>
                    <td className="px-6 py-4 font-bold">
                      {m.team1} vs {m.team2}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="info">{m.status}</Badge>
                    </td>
                    <td className="px-6 py-4">${m.prize_pool}</td>
                    <td className="px-6 py-4 space-x-2">
                      {m.status === "upcoming" && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openRoster(m)}
                          >
                            Add Players
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleStartMatch(m.match_id)}
                          >
                            Start Match
                          </Button>
                        </>
                      )}
                      {m.status === "live" && (
                        <>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => openStats(m)}
                          >
                            Update Stats
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSettleMatch(m.match_id)}
                          >
                            Settle & Pay
                          </Button>
                        </>
                      )}
                      {m.status === "completed" && (
                        <span className="text-gray-500 text-sm">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- VIEW: CREATE MATCH --- */}
      {view === "create" && (
        <div className="bg-white p-6 rounded-lg shadow max-w-lg">
          <h3 className="text-lg font-bold mb-4">Create Match</h3>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <Input
              label="Match ID"
              value={newMatch.match_id}
              onChange={(e) =>
                setNewMatch({ ...newMatch, match_id: e.target.value })
              }
              placeholder="e.g. IPL_01"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Team 1"
                value={newMatch.team1}
                onChange={(e) =>
                  setNewMatch({ ...newMatch, team1: e.target.value })
                }
                placeholder="IND"
                required
              />
              <Input
                label="Team 2"
                value={newMatch.team2}
                onChange={(e) =>
                  setNewMatch({ ...newMatch, team2: e.target.value })
                }
                placeholder="AUS"
                required
              />
            </div>
            <Input
              label="Entry Fee ($)"
              type="number"
              value={newMatch.entry_fee}
              onChange={(e) =>
                setNewMatch({ ...newMatch, entry_fee: e.target.value })
              }
              required
            />
            <Button type="submit">Create Match</Button>
          </form>
        </div>
      )}

      {/* --- VIEW: ROSTER MANAGEMENT --- */}
      {view === "roster" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Add Player to Match</h3>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <Input
                label="Player ID (Unique)"
                type="number"
                value={newPlayer.player_id}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, player_id: e.target.value })
                }
                required
              />
              <Input
                label="Name"
                value={newPlayer.name}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, name: e.target.value })
                }
                required
              />
              <div>
                <label className="block text-sm font-bold mb-1">Role</label>
                <select
                  className="input w-full"
                  value={newPlayer.role}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, role: e.target.value })
                  }
                >
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all_rounder">All Rounder</option>
                  <option value="wicket_keeper">Wicket Keeper</option>
                </select>
              </div>
              <Input
                label="Team Code"
                value={newPlayer.team}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, team: e.target.value })
                }
                required
              />
              <Input
                label="Price (Credits)"
                type="number"
                step="0.5"
                value={newPlayer.base_price}
                onChange={(e) =>
                  setNewPlayer({ ...newPlayer, base_price: e.target.value })
                }
                required
              />
              <Button type="submit">Add Player</Button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow max-h-125 overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">
              Current Roster ({matchPlayers.length})
            </h3>
            <ul className="space-y-2">
              {matchPlayers.map((p) => (
                <li
                  key={p.player_id}
                  className="border-b pb-2 text-sm flex justify-between"
                >
                  <span>
                    {p.name} ({p.team})
                  </span>
                  <span className="font-mono">{p.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* --- VIEW: UPDATE STATS --- */}
      {view === "stats" && (
        <div className="bg-white p-6 rounded-lg shadow max-w-xl">
          <h3 className="text-lg font-bold mb-4">Update Player Performance</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select a player and input their match stats. Do this for all active
            players before settling.
          </p>

          <form onSubmit={handleUpdateStats} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                Select Player
              </label>
              <select
                className="input w-full"
                value={playerStats.player_id}
                onChange={(e) =>
                  setPlayerStats({ ...playerStats, player_id: e.target.value })
                }
                required
              >
                <option value="">-- Choose Player --</option>
                {matchPlayers.map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Runs Scored"
                type="number"
                value={playerStats.runs_scored}
                onChange={(e) =>
                  setPlayerStats({
                    ...playerStats,
                    runs_scored: parseInt(e.target.value),
                  })
                }
              />
              <Input
                label="Wickets Taken"
                type="number"
                value={playerStats.wickets_taken}
                onChange={(e) =>
                  setPlayerStats({
                    ...playerStats,
                    wickets_taken: parseInt(e.target.value),
                  })
                }
              />
              <Input
                label="Catches"
                type="number"
                value={playerStats.catches}
                onChange={(e) =>
                  setPlayerStats({
                    ...playerStats,
                    catches: parseInt(e.target.value),
                  })
                }
              />
              <Input
                label="Run Outs"
                type="number"
                value={playerStats.run_outs}
                onChange={(e) =>
                  setPlayerStats({
                    ...playerStats,
                    run_outs: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Update Stats
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FantasyMatchManager;

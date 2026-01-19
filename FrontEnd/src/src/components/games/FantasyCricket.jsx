import React, { useState, useEffect } from "react";
import { fantasyCricketAPI } from "../../api/games";
import { useWallet } from "../../hooks/useWallet";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { formatCurrency } from "../../utils/helpers";

const FantasyCricket = () => {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [view, setView] = useState("matches"); // matches, team-builder, leaderboard
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { getCashBalance, fetchWallets } = useWallet();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await fantasyCricketAPI.getMatches();
      setMatches(data.matches || []);
    } catch (err) {
      setError("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  const selectMatch = async (match) => {
    setSelectedMatch(match);
    setView("team-builder");

    try {
      setLoading(true);
      const data = await fantasyCricketAPI.getMatchPlayers(match.match_id);
      setPlayers(data.players || []);
    } catch (err) {
      setError("Failed to fetch players");
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (player) => {
    if (selectedPlayers.find((p) => p.player_id === player.player_id)) {
      setSelectedPlayers(
        selectedPlayers.filter((p) => p.player_id !== player.player_id),
      );
      if (captain === player.player_id) setCaptain(null);
      if (viceCaptain === player.player_id) setViceCaptain(null);
    } else {
      if (selectedPlayers.length >= 11) {
        setError("Maximum 11 players allowed");
        return;
      }
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const getTotalCost = () => {
    return selectedPlayers.reduce(
      (sum, p) => sum + parseFloat(p.base_price),
      0,
    );
  };

  const submitTeam = async () => {
    if (selectedPlayers.length !== 11) {
      setError("You must select exactly 11 players");
      return;
    }

    if (!captain || !viceCaptain) {
      setError("Please select captain and vice-captain");
      return;
    }

    if (captain === viceCaptain) {
      setError("Captain and vice-captain must be different");
      return;
    }

    if (getTotalCost() > selectedMatch.max_budget) {
      setError(`Total cost exceeds budget of ${selectedMatch.max_budget}`);
      return;
    }

    if (selectedMatch.entry_fee > getCashBalance()) {
      setError("Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      const playerIds = selectedPlayers.map((p) => p.player_id);
      await fantasyCricketAPI.createTeam(
        selectedMatch.match_id,
        playerIds,
        captain,
        viceCaptain,
      );
      setSuccess("Team created successfully!");
      await fetchWallets();
      setTimeout(() => {
        setSuccess("");
        viewLeaderboard(selectedMatch);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const viewLeaderboard = async (match) => {
    try {
      setLoading(true);
      const data = await fantasyCricketAPI.getLeaderboard(match.match_id);
      setLeaderboard(data.leaderboard || []);
      setSelectedMatch(match);
      setView("leaderboard");
    } catch (err) {
      setError("Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      batsman: "🏏",
      bowler: "⚡",
      all_rounder: "⭐",
      wicket_keeper: "🧤",
    };
    return icons[role] || "👤";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🏏 Fantasy Cricket</h1>
            <p className="text-indigo-100">
              Build your dream team and compete!
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm mb-1">Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(getCashBalance())}
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* View Tabs */}
      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setView("matches")}
            className={`px-6 py-4 font-semibold transition-colors ${
              view === "matches"
                ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            📋 Matches
          </button>
          {selectedMatch && (
            <>
              <button
                onClick={() => setView("team-builder")}
                className={`px-6 py-4 font-semibold transition-colors ${
                  view === "team-builder"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                👥 Team Builder
              </button>
              <button
                onClick={() => viewLeaderboard(selectedMatch)}
                className={`px-6 py-4 font-semibold transition-colors ${
                  view === "leaderboard"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                🏆 Leaderboard
              </button>
            </>
          )}
        </div>
      </div>

      {/* Matches View */}
      {view === "matches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <div className="text-6xl mb-4">🏏</div>
              <p className="text-gray-600 text-lg">
                No matches available at the moment
              </p>
            </div>
          ) : (
            matches.map((match) => (
              <div
                key={match.match_id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {match.team1} vs {match.team2}
                    </h3>
                    <Badge
                      variant={
                        match.status === "upcoming"
                          ? "info"
                          : match.status === "live"
                            ? "warning"
                            : "success"
                      }
                    >
                      {match.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Entry Fee</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(match.entry_fee)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prize Pool:</span>
                    <span className="font-bold">
                      {formatCurrency(match.prize_pool)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Teams Joined:</span>
                    <span className="font-bold">{match.teams_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Budget:</span>
                    <span className="font-bold">
                      {match.max_budget} credits
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => selectMatch(match)}
                  variant="primary"
                  className="w-full"
                  disabled={match.status !== "upcoming"}
                >
                  {match.status === "upcoming" ? "Create Team" : "View Match"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Team Builder View */}
      {view === "team-builder" && selectedMatch && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Select Players
              </h2>

              <div className="space-y-2">
                {players.map((player) => {
                  const isSelected = selectedPlayers.find(
                    (p) => p.player_id === player.player_id,
                  );

                  return (
                    <div
                      key={player.player_id}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer
                        ${
                          isSelected
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }
                      `}
                      onClick={() => togglePlayer(player)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getRoleIcon(player.role)}
                        </span>
                        <div>
                          <p className="font-bold text-gray-900">
                            {player.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {player.team} • {player.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-lg">
                          {player.base_price}
                        </span>
                        {isSelected && (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaptain(player.player_id);
                              }}
                              className={`px-3 py-1 rounded text-sm font-semibold ${
                                captain === player.player_id
                                  ? "bg-yellow-500 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              C
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViceCaptain(player.player_id);
                              }}
                              className={`px-3 py-1 rounded text-sm font-semibold ${
                                viceCaptain === player.player_id
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              VC
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Team Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Your Team
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span
                    className={`font-bold ${
                      selectedPlayers.length === 11
                        ? "text-green-600"
                        : "text-gray-900"
                    }`}
                  >
                    {selectedPlayers.length}/11
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits Used:</span>
                  <span
                    className={`font-bold ${
                      getTotalCost() > selectedMatch.max_budget
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {getTotalCost().toFixed(1)}/{selectedMatch.max_budget}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Captain:</span>
                  <span
                    className={`font-bold ${
                      captain ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {captain ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vice Captain:</span>
                  <span
                    className={`font-bold ${
                      viceCaptain ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {viceCaptain ? "✓" : "✗"}
                  </span>
                </div>
              </div>

              <Button
                onClick={submitTeam}
                disabled={
                  loading ||
                  selectedPlayers.length !== 11 ||
                  !captain ||
                  !viceCaptain
                }
                variant="primary"
                size="lg"
                className="w-full"
              >
                {loading
                  ? "Submitting..."
                  : `Submit Team (${formatCurrency(selectedMatch.entry_fee)})`}
              </Button>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Scoring:</strong> Captain gets 2x points, Vice Captain
                  gets 1.5x points
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard View */}
      {view === "leaderboard" && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🏆 Leaderboard
          </h2>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏏</div>
              <p className="text-gray-600">
                No teams yet. Be the first to join!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Team ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Prize
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, idx) => (
                    <tr
                      key={entry.team_id}
                      className={idx < 3 ? "bg-yellow-50" : ""}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-2xl">
                          {entry.rank === 1 && "🥇"}
                          {entry.rank === 2 && "🥈"}
                          {entry.rank === 3 && "🥉"}
                          {entry.rank > 3 && `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        #{entry.team_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-primary-600">
                        {entry.total_points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                        {formatCurrency(entry.prize_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FantasyCricket;

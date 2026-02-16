import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const LeaderboardPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    fetchMatchDetails();
    fetchLeaderboard();
    fetchTopPerformers();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/matches/${matchId}`);
      setMatch(response.data);
    } catch (error) {
      console.error("Error fetching match:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/leaderboard/match/${matchId}`,
      );
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/leaderboard/match/${matchId}/top-performers`,
      );
      setTopPerformers(response.data);
    } catch (error) {
      console.error("Error fetching top performers:", error);
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/leaderboard/ws/match/${matchId}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message:", data);

      if (
        data.type === "leaderboard_update" ||
        data.type === "initial_leaderboard"
      ) {
        setLeaderboard(data.leaderboard);
        setLastUpdate(new Date());
      }

      if (data.type === "score_update") {
        // Refresh top performers
        fetchTopPerformers();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => connectWebSocket(), 3000);
    };

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    wsRef.current = ws;

    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Leaderboard
            </h1>
            {match && <p className="text-gray-600">{match.match_name}</p>}
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                connected
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm font-medium">
                {connected ? "Live" : "Disconnected"}
              </span>
            </div>

            <button
              onClick={() => navigate("/matches")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Back to Matches
            </button>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            ⭐ Top Performers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topPerformers.slice(0, 5).map((player, idx) => (
              <div
                key={player.player_id}
                className="bg-linear-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-yellow-600">
                    #{idx + 1}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      player.role === "BAT"
                        ? "bg-blue-100 text-blue-700"
                        : player.role === "BOWL"
                          ? "bg-red-100 text-red-700"
                          : player.role === "AR"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {player.role}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {player.name}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Points:</span>
                    <span className="font-bold text-green-600">
                      {player.fantasy_points}
                    </span>
                  </div>
                  {player.runs > 0 && (
                    <div className="flex justify-between">
                      <span>Runs:</span>
                      <span className="font-semibold">{player.runs}</span>
                    </div>
                  )}
                  {player.wickets > 0 && (
                    <div className="flex justify-between">
                      <span>Wickets:</span>
                      <span className="font-semibold">{player.wickets}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Team Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  User
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold">
                  Points
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No teams created yet. Be the first to join!
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, idx) => (
                  <LeaderboardRow
                    key={entry.team_id}
                    entry={entry}
                    isTop3={idx < 3}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LeaderboardRow = ({ entry, isTop3 }) => {
  const rankColors = {
    1: "bg-yellow-100 border-l-4 border-yellow-500",
    2: "bg-gray-100 border-l-4 border-gray-400",
    3: "bg-orange-100 border-l-4 border-orange-500",
  };

  return (
    <tr
      className={`hover:bg-gray-50 transition-colors ${
        isTop3 ? rankColors[entry.rank] : ""
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {entry.rank <= 3 && (
            <span className="text-2xl">
              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
            </span>
          )}
          <span className="text-lg font-bold text-gray-900">#{entry.rank}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="font-semibold text-gray-900">{entry.team_name}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-gray-600">{entry.username}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="text-lg font-bold text-green-600">
          {entry.total_points.toFixed(2)}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
          View Team
        </button>
      </td>
    </tr>
  );
};

export default LeaderboardPage;

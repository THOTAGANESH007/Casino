import React, { useState, useEffect } from "react";
import { realFantasyAPI } from "../../api/real_fantasy";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";

const RealFantasyAdmin = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await realFantasyAPI.getAdminMatches();
      setMatches(response.data);
    } catch (error) {
      setError("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setLoading(true);
    try {
      const res = await realFantasyAPI.scrapeAdminMatches();
      setSuccess(res.data.message);
      fetchMatches();
    } catch (err) {
      setError("Scrape failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, matchId) => {
    setProcessingId(matchId);
    setError("");
    setSuccess("");
    try {
      let res;
      if (action === "activate")
        res = await realFantasyAPI.activateMatch(matchId);
      if (action === "lock") res = await realFantasyAPI.lockMatch(matchId);
      if (action === "start") res = await realFantasyAPI.startMatch(matchId);

      setSuccess(res.data.message);
      fetchMatches();
    } catch (err) {
      setError(err.response?.data?.detail || "Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && matches.length === 0)
    return <Loading message="Loading Real Fantasy Data..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Real Fantasy Manager
          </h2>
          <p className="text-gray-500">
            Sync matches from Cricbuzz/RapidAPI and manage contests.
          </p>
        </div>
        <Button onClick={handleScrape} variant="primary" disabled={loading}>
          {loading ? "Syncing..." : "🔄 Sync New Matches"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Match
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Active?
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Locked?
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.map((match) => (
              <tr key={match.match_id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">
                    {match.match_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {match.team_a} vs {match.team_b}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(match.match_date).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      match.status === "live"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {match.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {match.is_active ? "✅ Yes" : "❌ No"}
                </td>
                <td className="px-6 py-4 text-sm">
                  {match.teams_locked ? "🔒 Yes" : "🔓 No"}
                </td>
                <td className="px-6 py-4 space-x-2">
                  {!match.is_active && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAction("activate", match.match_id)}
                      disabled={processingId === match.match_id}
                    >
                      Activate
                    </Button>
                  )}
                  {match.is_active && !match.teams_locked && (
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => handleAction("lock", match.match_id)}
                      disabled={processingId === match.match_id}
                    >
                      Lock
                    </Button>
                  )}
                  {match.is_active && match.status === "upcoming" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleAction("start", match.match_id)}
                      disabled={processingId === match.match_id}
                    >
                      Start
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RealFantasyAdmin;

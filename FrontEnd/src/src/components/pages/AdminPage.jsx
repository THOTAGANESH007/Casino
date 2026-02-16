import { useState, useEffect } from "react";
import axios from "axios";
import { realFantasyAPI } from "../../api/real_fantasy";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "matches") {
      fetchMatches();
    }
  }, [activeTab]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await realFantasyAPI.getAdminMatches();
      setMatches(response.data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrapeMatches = async () => {
    try {
      setLoading(true);
      const response = await realFantasyAPI.scrapeAdminMatches();
      alert(response.data.message);
      fetchMatches();
    } catch (error) {
      alert("Error scraping matches: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage matches, activate contests, and configure scoring rules
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <TabButton
              active={activeTab === "matches"}
              onClick={() => setActiveTab("matches")}
            >
              Matches
            </TabButton>
            <TabButton
              active={activeTab === "scoring"}
              onClick={() => setActiveTab("scoring")}
            >
              Scoring Rules
            </TabButton>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "matches" && (
            <MatchesTab
              matches={matches}
              loading={loading}
              onScrapeMatches={scrapeMatches}
              onRefresh={fetchMatches}
            />
          )}
          {activeTab === "scoring" && <ScoringRulesTab matches={matches} />}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    }`}
  >
    {children}
  </button>
);

const MatchesTab = ({ matches, loading, onScrapeMatches, onRefresh }) => {
  const [processingId, setProcessingId] = useState(null);

  const activateMatch = async (matchId) => {
    if (
      !confirm(
        "This will fetch squads and activate the match for fantasy contests. Continue?",
      )
    ) {
      return;
    }

    try {
      setProcessingId(matchId);
      const response = await axios.post(
        `${API_URL}/admin/matches/${matchId}/activate`,
      );
      alert(response.data.message);
      onRefresh();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const lockMatch = async (matchId) => {
    if (
      !confirm(
        "This will lock team creation. Users won't be able to create new teams. Continue?",
      )
    ) {
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/matches/${matchId}/lock`);
      alert("Match locked successfully");
      onRefresh();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    }
  };

  const startMatch = async (matchId) => {
    if (
      !confirm(
        "This will mark the match as LIVE and start score updates. Continue?",
      )
    ) {
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/matches/${matchId}/start`);
      alert("Match started successfully");
      onRefresh();
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onScrapeMatches}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "Scraping..." : "🔄 Scrape New Matches"}
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {/* Matches Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Match
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Teams
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Active
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Locked
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {matches.map((match) => (
              <tr key={match.match_id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {match.match_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {match.match_type.toUpperCase()}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {match.team_a} vs {match.team_b}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      match.status === "live"
                        ? "bg-red-100 text-red-800"
                        : match.status === "upcoming"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {match.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4">{match.is_active ? "✅" : "❌"}</td>
                <td className="px-4 py-4">
                  {match.teams_locked ? "🔒" : "🔓"}
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  {!match.is_active && (
                    <button
                      onClick={() => activateMatch(match.match_id)}
                      disabled={processingId === match.match_id}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {processingId === match.match_id
                        ? "Activating..."
                        : "Activate"}
                    </button>
                  )}
                  {match.is_active && !match.teams_locked && (
                    <button
                      onClick={() => lockMatch(match.match_id)}
                      className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                    >
                      Lock
                    </button>
                  )}
                  {match.is_active && match.status === "upcoming" && (
                    <button
                      onClick={() => startMatch(match.match_id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Start
                    </button>
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

const ScoringRulesTab = ({ matches }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [rules, setRules] = useState({
    run_points: 1.0,
    four_points: 1.0,
    six_points: 2.0,
    wicket_points: 25.0,
    catch_points: 8.0,
    stumping_points: 12.0,
    maiden_over_points: 12.0,
  });
  const [saving, setSaving] = useState(false);

  const activeMatches = matches.filter((m) => m.is_active);

  const saveRules = async () => {
    if (!selectedMatch) {
      alert("Please select a match");
      return;
    }

    try {
      setSaving(true);
      await axios.put(
        `${API_URL}/admin/matches/${selectedMatch}/scoring-rules`,
        rules,
      );
      alert("Scoring rules updated successfully!");
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Match
        </label>
        <select
          value={selectedMatch || ""}
          onChange={(e) => setSelectedMatch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Match --</option>
          {activeMatches.map((match) => (
            <option key={match.match_id} value={match.match_id}>
              {match.match_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleInput
          label="Run Points"
          value={rules.run_points}
          onChange={(v) => setRules({ ...rules, run_points: v })}
        />
        <RuleInput
          label="Four Points"
          value={rules.four_points}
          onChange={(v) => setRules({ ...rules, four_points: v })}
        />
        <RuleInput
          label="Six Points"
          value={rules.six_points}
          onChange={(v) => setRules({ ...rules, six_points: v })}
        />
        <RuleInput
          label="Wicket Points"
          value={rules.wicket_points}
          onChange={(v) => setRules({ ...rules, wicket_points: v })}
        />
        <RuleInput
          label="Catch Points"
          value={rules.catch_points}
          onChange={(v) => setRules({ ...rules, catch_points: v })}
        />
        <RuleInput
          label="Stumping Points"
          value={rules.stumping_points}
          onChange={(v) => setRules({ ...rules, stumping_points: v })}
        />
        <RuleInput
          label="Maiden Over Points"
          value={rules.maiden_over_points}
          onChange={(v) => setRules({ ...rules, maiden_over_points: v })}
        />
      </div>

      <button
        onClick={saveRules}
        disabled={saving || !selectedMatch}
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300"
      >
        {saving ? "Saving..." : "Save Scoring Rules"}
      </button>
    </div>
  );
};

const RuleInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      type="number"
      step="0.5"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

export default AdminPage;

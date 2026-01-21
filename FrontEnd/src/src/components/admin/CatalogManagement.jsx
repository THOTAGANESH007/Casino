import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Input from "../common/Input";

const CatalogManagement = () => {
  const [catalog, setCatalog] = useState([]);
  const [providers, setProviders] = useState([]);
  const [baseGames, setBaseGames] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    provider_id: "",
    game_id: "",
    cost_per_play: 0.5,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogData, providersData, gamesData] = await Promise.all([
        ownerAPI.getCatalog(),
        ownerAPI.getProviders(),
        ownerAPI.getBaseGames(),
      ]);
      setCatalog(catalogData);
      setProviders(providersData);
      setBaseGames(gamesData);
    } catch (err) {
      setError("Failed to load catalog data");
    } finally {
      setLoading(false);
    }
  };

  const handleInitGames = async () => {
    try {
      await ownerAPI.initBaseGames();
      setSuccess("Base games initialized (Blackjack, Roulette, etc.)");
      fetchData();
    } catch (err) {
      setError("Failed to initialize games");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await ownerAPI.addToCatalog({
        provider_id: parseInt(formData.provider_id),
        game_id: parseInt(formData.game_id),
        cost_per_play: parseFloat(formData.cost_per_play),
      });
      setSuccess("Game added to Global Catalog successfully");
      setFormData({ provider_id: "", game_id: "", cost_per_play: 0.5 });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add to catalog");
    }
  };

  if (loading) return <Loading message="Loading Catalog..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global Catalog</h2>
          <p className="text-gray-500 text-sm">
            Define which Provider offers which Game and the Cost.
          </p>
        </div>
        <div className="space-x-3">
          {baseGames.length === 0 && (
            <Button onClick={handleInitGames} variant="warning" size="sm">
              Initialize Base Games
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)} variant="primary">
            {showForm ? "Cancel" : "+ Add to Catalog"}
          </Button>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 fade-in">
          <h3 className="text-lg font-semibold mb-4">Link Game to Provider</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            {/* Provider Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Provider
              </label>
              <select
                value={formData.provider_id}
                onChange={(e) =>
                  setFormData({ ...formData, provider_id: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">-- Select Provider --</option>
                {providers.map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.provider_name} {p.is_active ? "" : "(Inactive)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Game Type
              </label>
              <select
                value={formData.game_id}
                onChange={(e) =>
                  setFormData({ ...formData, game_id: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">-- Select Game --</option>
                {baseGames.map((g) => (
                  <option key={g.game_id} value={g.game_id}>
                    {g.game_name} (RTP: {g.rtp_percent}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Input */}
            <Input
              label="Cost Per Play (Charged to Tenant)"
              type="number"
              step="0.01"
              value={formData.cost_per_play}
              onChange={(e) =>
                setFormData({ ...formData, cost_per_play: e.target.value })
              }
              required
            />

            <Button type="submit" variant="primary">
              Add to Catalog
            </Button>
          </form>
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Game
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tenant Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Provider Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {catalog.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                  {item.game_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {item.provider_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-indigo-600">
                  ${item.cost_per_play.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {item.is_active ? "Active" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
            {catalog.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  Catalog is empty. Add games to allow tenants to subscribe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CatalogManagement;

import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import Badge from "../common/Badge";
import { formatDateTime } from "../../utils/helpers";

const GameProviderList = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    provider_name: "",
    api_url: "",
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await ownerAPI.getProviders();
      setProviders(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch game providers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await ownerAPI.addProvider(formData);
      setSuccess("Game provider added successfully");
      setShowForm(false);
      setFormData({ provider_name: "", api_url: "" });
      fetchProviders();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add provider");
    }
  };

  const toggleStatus = async (providerId, currentStatus) => {
    try {
      await ownerAPI.updateProviderStatus(providerId, !currentStatus);
      setSuccess(`Provider ${!currentStatus ? "enabled" : "disabled"}`);
      fetchProviders();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update status");
    }
  };

  if (loading && !providers.length)
    return <Loading message="Loading providers..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Game Providers</h2>
          <p className="text-gray-500 text-sm">
            Manage external game integrations
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? "Cancel" : "+ Add Provider"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* Add Provider Form */}
      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 shadow-inner fade-in">
          <h3 className="text-lg font-semibold mb-4">Add New Provider</h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <Input
              label="Provider Name"
              type="text"
              value={formData.provider_name}
              onChange={(e) =>
                setFormData({ ...formData, provider_name: e.target.value })
              }
              required
              placeholder="e.g., Evolution Gaming"
            />

            <Input
              label="API URL (Optional)"
              type="text"
              value={formData.api_url}
              onChange={(e) =>
                setFormData({ ...formData, api_url: e.target.value })
              }
              placeholder="https://api.provider.com/v1"
            />

            <div className="flex space-x-3 pt-2">
              <Button type="submit" variant="primary">
                Add Provider
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Providers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  API Connection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Added On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No game providers found. Click "Add Provider" to start.
                  </td>
                </tr>
              ) : (
                providers.map((provider) => (
                  <tr key={provider.provider_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{provider.provider_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                      {provider.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {provider.api_url ? (
                        <span
                          className="truncate max-w-50 block"
                          title={provider.api_url}
                        >
                          {provider.api_url}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          Local / Direct
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant={provider.is_active ? "success" : "danger"}
                      >
                        {provider.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(provider.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        onClick={() =>
                          toggleStatus(provider.provider_id, provider.is_active)
                        }
                        variant={provider.is_active ? "danger" : "success"}
                        size="sm"
                        className="min-w-20"
                      >
                        {provider.is_active ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GameProviderList;

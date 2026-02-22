import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";

const RegionManagement = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({
    region_name: "",
    tax_rate: 0,
  });

  const [editingRegion, setEditingRegion] = useState(null);
  const [editTaxRate, setEditTaxRate] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      const data = await ownerAPI.getRegions();
      setRegions(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch regions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await ownerAPI.createRegion({
        region_name: createData.region_name,
        tax_rate: parseFloat(createData.tax_rate),
      });
      setSuccess("Global Region created successfully");
      setShowCreateForm(false);
      setCreateData({ region_name: "", tax_rate: 0 });
      fetchRegions();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create region");
    }
  };

  const handleUpdateTax = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await ownerAPI.updateRegionTax(
        editingRegion.region_id,
        parseFloat(editTaxRate),
      );
      setSuccess(`Tax rate updated for ${editingRegion.region_name}`);
      setEditingRegion(null);
      fetchRegions();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update tax rate");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && regions.length === 0)
    return <Loading message="Loading regions..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Geographic Regions
          </h2>
          <p className="text-gray-500 text-sm">
            Define global jurisdictions and default tax rates
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
        >
          {showCreateForm ? "Cancel" : "+ Create New Region"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 shadow-inner fade-in">
          <h3 className="text-lg font-semibold mb-4">
            Create New Global Region
          </h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-lg">
            <Input
              label="Region Name"
              value={createData.region_name}
              onChange={(e) =>
                setCreateData({ ...createData, region_name: e.target.value })
              }
              placeholder="e.g., India, United Kingdom, Brazil"
              required
            />
            <Input
              label="Default Tax Rate (%)"
              type="number"
              step="0.01"
              value={createData.tax_rate}
              onChange={(e) =>
                setCreateData({ ...createData, tax_rate: e.target.value })
              }
              placeholder="0.00"
            />
            <div className="pt-2">
              <Button type="submit" variant="primary">
                Create Region
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Region Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tax Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {regions.map((region) => (
              <tr
                key={region.region_id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-900">
                  #{region.region_id}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-800">
                  {region.region_name}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-indigo-600">
                  {region.tax_rate}%
                </td>
                <td className="px-6 py-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingRegion(region);
                      setEditTaxRate(region.tax_rate);
                    }}
                  >
                    ✎ Edit Tax
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!editingRegion}
        onClose={() => setEditingRegion(null)}
        title="Update Tax Rate"
      >
        <form onSubmit={handleUpdateTax} className="space-y-4">
          <Input
            label="New Tax Rate (%)"
            type="number"
            step="0.01"
            value={editTaxRate}
            onChange={(e) => setEditTaxRate(e.target.value)}
            required
          />
          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditingRegion(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={updating}
            >
              {updating ? "Updating..." : "Update Rate"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RegionManagement;

import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal"; // Ensure you have this common component

const RegionManagement = () => {
  const [regions, setRegions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({
    tenant_id: "",
    region_name: "",
    tax_rate: 0,
  });

  // Edit Modal State
  const [editingRegion, setEditingRegion] = useState(null); // The region object being edited
  const [editTaxRate, setEditTaxRate] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([fetchRegions(), fetchTenants()]);
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

  const fetchTenants = async () => {
    try {
      const data = await ownerAPI.getTenants();
      setTenants(data);
    } catch (err) {
      console.error("Failed to fetch tenants");
    }
  };

  // --- Create Logic ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await ownerAPI.createRegion({
        tenant_id: parseInt(createData.tenant_id),
        region_name: createData.region_name,
        tax_rate: parseFloat(createData.tax_rate),
      });
      setSuccess("Region created successfully");
      setShowCreateForm(false);
      setCreateData({ tenant_id: "", region_name: "", tax_rate: 0 });
      fetchRegions();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create region");
    }
  };

  // --- Update Logic ---
  const openEditModal = (region) => {
    setEditingRegion(region);
    setEditTaxRate(region.tax_rate); // Pre-fill current rate
    setError("");
  };

  const handleUpdateTax = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError("");

    try {
      await ownerAPI.updateRegionTax(
        editingRegion.region_id,
        parseFloat(editTaxRate),
      );
      setSuccess(`Tax rate updated for ${editingRegion.region_name}`);
      setEditingRegion(null); // Close modal
      fetchRegions(); // Refresh list
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update tax rate");
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
            Region Management
          </h2>
          <p className="text-gray-500 text-sm">
            Define operating regions and tax rates
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
        >
          {showCreateForm ? "Cancel" : "+ Create Region"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* CREATE FORM */}
      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 shadow-inner fade-in">
          <h3 className="text-lg font-semibold mb-4">Create New Region</h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tenant <span className="text-red-600">*</span>
              </label>
              <select
                value={createData.tenant_id}
                onChange={(e) =>
                  setCreateData({ ...createData, tenant_id: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">-- Select Tenant --</option>
                {tenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.tenant_name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Region Name"
              value={createData.region_name}
              onChange={(e) =>
                setCreateData({ ...createData, region_name: e.target.value })
              }
              placeholder="e.g., North America"
              required
            />
            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.01"
              min="0"
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

      {/* DATA TABLE */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{region.region_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tenants.find((t) => t.tenant_id === region.tenant_id)
                      ?.tenant_name || region.tenant_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {region.region_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                    {region.tax_rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditModal(region)}
                    >
                      ✎ Edit Tax
                    </Button>
                  </td>
                </tr>
              ))}
              {regions.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No regions found. Click "Create Region" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TAX MODAL */}
      <Modal
        isOpen={!!editingRegion}
        onClose={() => setEditingRegion(null)}
        title={`Update Tax Rate: ${editingRegion?.region_name}`}
      >
        <form onSubmit={handleUpdateTax} className="space-y-4">
          <Input
            label="New Tax Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={editTaxRate}
            onChange={(e) => setEditTaxRate(e.target.value)}
            required
            autoFocus
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

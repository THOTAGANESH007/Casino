import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import CreateTenantForm from "./CreateTenantForm";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { formatDateTime } from "../../utils/helpers";

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await ownerAPI.getTenants();
      console.log("Fetched tenants:", data);
      setTenants(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (tenantId, currentStatus) => {
    try {
      await ownerAPI.updateTenantStatus(tenantId, !currentStatus);
      setStatusMsg("Tenant status updated");
      fetchTenants();
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setError("Failed to update status");
    }
  };

  if (loading && tenants.length === 0)
    return <Loading message="Loading tenants..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Casino Brands (Tenants)
          </h2>
          <p className="text-gray-500 text-sm">
            Manage casino branches and regional assignments
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? "Hide Form" : "+ Add New Casino Brand"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={statusMsg} onClose={() => setStatusMsg("")} />

      {showForm && (
        <div className="mb-8">
          <CreateTenantForm
            onSuccess={() => {
              setShowForm(false);
              fetchTenants();
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Brand Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Operating Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr
                  key={tenant.tenant_id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    #{tenant.tenant_id}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">
                    {tenant.tenant_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-indigo-600 font-semibold">
                    {/* Assuming backend returns region object or we just show the ID */}
                    {tenant.region_name || `Region ID: ${tenant.region_id}`}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {tenant.default_currency}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={tenant.status ? "success" : "danger"}>
                      {tenant.status ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      onClick={() =>
                        toggleStatus(tenant.tenant_id, tenant.status)
                      }
                      variant={tenant.status ? "danger" : "success"}
                      size="sm"
                    >
                      {tenant.status ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantManagement;

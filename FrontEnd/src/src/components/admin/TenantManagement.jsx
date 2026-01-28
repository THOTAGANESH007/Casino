import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner"; // Switched to ownerAPI
import CreateTenantForm from "./CreateTenantForm"; // Import the separated form
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
      setTenants(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchTenants();
  };

  const toggleStatus = async (tenantId, currentStatus) => {
    try {
      await ownerAPI.updateTenantStatus(tenantId, !currentStatus);
      setStatusMsg("Tenant status updated");
      fetchTenants();
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setError("Failed to update tenant status");
    }
  };

  if (loading && tenants.length === 0)
    return <Loading message="Loading tenants..." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Tenant Management
          </h2>
          <p className="text-gray-500 text-sm">
            Manage casino sites and configurations
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary">
          {showForm ? "Hide Form" : "+ Create Tenant"}
        </Button>
      </div>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={statusMsg} onClose={() => setStatusMsg("")} />

      {/* Render the separated form component */}
      {showForm && (
        <div className="mb-8">
          <CreateTenantForm onSuccess={handleCreateSuccess} />
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timezone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{tenant.tenant_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                    {tenant.tenant_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {tenant.default_timezone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Badge variant={tenant.status ? "success" : "danger"}>
                      {tenant.status ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(tenant.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      onClick={() =>
                        toggleStatus(tenant.tenant_id, tenant.status)
                      }
                      variant={tenant.status ? "danger" : "success"}
                      size="sm"
                      className="min-w-20"
                    >
                      {tenant.status ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No tenants found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantManagement;

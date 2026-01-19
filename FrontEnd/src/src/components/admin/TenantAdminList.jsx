import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { formatDateTime } from "../../utils/helpers";

const TenantAdminList = ({ refreshTrigger }) => {
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminsData, tenantsData] = await Promise.all([
        ownerAPI.getTenantAdmins(),
        ownerAPI.getTenants(),
      ]);

      setAdmins(adminsData);

      const tenantMap = {};
      tenantsData.forEach((t) => {
        tenantMap[t.tenant_id] = t.tenant_name;
      });
      setTenants(tenantMap);

      setError("");
    } catch (err) {
      setError("Failed to fetch tenant admins");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    try {
      await ownerAPI.updateTenantAdminStatus(adminId, !currentStatus);
      setSuccess(
        `Admin ${!currentStatus ? "activated" : "deactivated"} successfully`,
      );

      // Update local state without full reload
      setAdmins((prev) =>
        prev.map((admin) =>
          admin.user_id === adminId
            ? { ...admin, is_active: !currentStatus }
            : admin,
        ),
      );

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update status");
      setTimeout(() => setError(""), 3000);
    }
  };

  if (loading && admins.length === 0)
    return <Loading message="Loading admins..." />;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Existing Tenant Admins
      </h3>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr
                  key={admin.user_id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{admin.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {admin.first_name} {admin.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                    {tenants[admin.tenant_id] || `ID: ${admin.tenant_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Badge variant={admin.is_active ? "success" : "danger"}>
                      {admin.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(admin.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      variant={admin.is_active ? "danger" : "success"}
                      onClick={() =>
                        handleToggleStatus(admin.user_id, admin.is_active)
                      }
                      className="min-w-22.5"
                    >
                      {admin.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No tenant admins found. Use the form above to create one.
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

export default TenantAdminList;

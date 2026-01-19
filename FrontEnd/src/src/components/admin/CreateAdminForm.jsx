import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Button from "../common/Button";
import Input from "../common/Input";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";

const CreateAdminForm = ({ onSuccess }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTenants, setFetchingTenants] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    tenant_id: "",
  });

  // Fetch tenants on mount to populate the dropdown
  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setFetchingTenants(true);
      const data = await ownerAPI.getTenants();
      setTenants(data);
    } catch (err) {
      setError("Failed to load tenants list.");
    } finally {
      setFetchingTenants(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Basic Validation
    if (!formData.tenant_id) {
      setError("Please select a tenant.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        tenant_id: parseInt(formData.tenant_id),
      };

      await ownerAPI.createTenantAdmin(payload);

      setSuccess(`Admin user created for ${formData.email}`);

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        tenant_id: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      // Handle Pydantic array errors or simple string errors
      if (Array.isArray(msg)) {
        setError(msg.map((e) => e.msg).join(", "));
      } else {
        setError(msg || "Failed to create admin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 fade-in">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Create Tenant Admin
      </h3>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
            placeholder="Jane"
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="admin@tenant.com"
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Strong password"
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Assign Tenant <span className="text-red-600">*</span>
          </label>
          <select
            name="tenant_id"
            value={formData.tenant_id}
            onChange={handleChange}
            required
            disabled={fetchingTenants}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">
              {fetchingTenants ? "Loading tenants..." : "-- Select Tenant --"}
            </option>
            {tenants.map((tenant) => (
              <option key={tenant.tenant_id} value={tenant.tenant_id}>
                {tenant.tenant_name} (ID: {tenant.tenant_id})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || fetchingTenants}
            className="w-full md:w-auto"
          >
            {loading ? "Creating..." : "Create Admin"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateAdminForm;

import React, { useState, useEffect } from "react";
import { ownerAPI } from "../../api/owner";
import Button from "../common/Button";
import Input from "../common/Input";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";

// Mapping Timezones to ISO 4217 Currency Codes
const TIMEZONE_CURRENCY_MAP = {
  UTC: "USD",
  GMT: "GBP",
  "America/New_York": "USD",
  "America/Chicago": "USD",
  "America/Denver": "USD",
  "America/Los_Angeles": "USD",
  "America/Toronto": "CAD",
  "America/Vancouver": "CAD",
  "America/Mexico_City": "MXN",
  "America/Sao_Paulo": "BRL",
  "America/Buenos_Aires": "ARS",
  "America/Bogota": "COP",
  "Europe/London": "GBP",
  "Europe/Paris": "EUR",
  "Europe/Berlin": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Rome": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Moscow": "RUB",
  "Europe/Istanbul": "TRY",
  "Asia/Dubai": "AED",
  "Asia/Kolkata": "INR",
  "Asia/Bangkok": "THB",
  "Asia/Singapore": "SGD",
  "Asia/Shanghai": "CNY",
  "Asia/Tokyo": "JPY",
  "Asia/Seoul": "KRW",
  "Asia/Jakarta": "IDR",
  "Asia/Manila": "PHP",
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "Australia/Perth": "AUD",
  "Pacific/Auckland": "NZD",
  "Pacific/Honolulu": "USD",
  "Africa/Cairo": "EGP",
  "Africa/Johannesburg": "ZAR",
  "Africa/Lagos": "NGN",
  "Africa/Nairobi": "KES",
};

const COMMON_TIMEZONES = Object.keys(TIMEZONE_CURRENCY_MAP);

const CreateTenantForm = ({ onSuccess }) => {
  const [regions, setRegions] = useState([]);
  const [formData, setFormData] = useState({
    tenant_name: "",
    region_id: "", // Required field
    default_timezone: "UTC",
    default_currency: "USD",
  });

  const [loading, setLoading] = useState(false);
  const [fetchingRegions, setFetchingRegions] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch available regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setFetchingRegions(true);
        const data = await ownerAPI.getRegions();
        setRegions(data);
      } catch (err) {
        setError(
          "Failed to load regions. Ensure at least one region is created.",
        );
      } finally {
        setFetchingRegions(false);
      }
    };
    fetchRegions();
  }, []);

  const handleTimezoneChange = (e) => {
    const newTimezone = e.target.value;
    const autoCurrency = TIMEZONE_CURRENCY_MAP[newTimezone] || "USD";

    setFormData({
      ...formData,
      default_timezone: newTimezone,
      default_currency: autoCurrency,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.region_id) {
      setError("Please select a valid region for this tenant.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Send data to backend, converting region_id to integer
      await ownerAPI.createTenant({
        ...formData,
        region_id: parseInt(formData.region_id),
      });

      setSuccess(`Tenant "${formData.tenant_name}" created successfully!`);

      // Reset form
      setFormData({
        tenant_name: "",
        region_id: "",
        default_timezone: "UTC",
        default_currency: "USD",
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(
        Array.isArray(msg)
          ? msg.map((d) => d.msg).join(", ")
          : msg || "Failed to create tenant.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 fade-in">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Create New Tenant Brand
      </h3>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {/* Brand Name */}
        <Input
          label="Tenant / Brand Name"
          type="text"
          value={formData.tenant_name}
          onChange={(e) =>
            setFormData({ ...formData, tenant_name: e.target.value })
          }
          required
          placeholder="e.g., LuckySpins Casino"
        />

        {/* Region Selection (Parent) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Assign to Region <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.region_id}
              onChange={(e) =>
                setFormData({ ...formData, region_id: e.target.value })
              }
              required
              disabled={fetchingRegions}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-100"
            >
              <option value="">
                {fetchingRegions ? "Loading regions..." : "-- Select Region --"}
              </option>
              {regions.map((region) => (
                <option key={region.region_id} value={region.region_id}>
                  {region.region_name} (Tax: {region.tax_rate}%)
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This tenant will only be visible to users in this selected region.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Timezone Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Default Timezone
            </label>
            <div className="relative">
              <select
                value={formData.default_timezone}
                onChange={handleTimezoneChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency Input (Editable) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Default Currency
            </label>
            <input
              type="text"
              value={formData.default_currency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  default_currency: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              placeholder="e.g. USD"
              maxLength={3}
              required
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || fetchingRegions}
            className="w-full md:w-auto"
          >
            {loading ? "Creating..." : "Create Tenant"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTenantForm;

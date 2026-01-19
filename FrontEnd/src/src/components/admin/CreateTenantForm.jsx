import React, { useState } from "react";
import { ownerAPI } from "../../api/owner";
import Button from "../common/Button";
import Input from "../common/Input";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";

// Mapping Timezones to ISO 4217 Currency Codes
const TIMEZONE_CURRENCY_MAP = {
  UTC: "USD",
  GMT: "GBP",
  // North America
  "America/New_York": "USD",
  "America/Chicago": "USD",
  "America/Denver": "USD",
  "America/Los_Angeles": "USD",
  "America/Toronto": "CAD",
  "America/Vancouver": "CAD",
  "America/Mexico_City": "MXN",
  // South America
  "America/Sao_Paulo": "BRL",
  "America/Buenos_Aires": "ARS",
  "America/Bogota": "COP",
  // Europe
  "Europe/London": "GBP",
  "Europe/Paris": "EUR",
  "Europe/Berlin": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Rome": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Moscow": "RUB",
  "Europe/Istanbul": "TRY",
  // Asia
  "Asia/Dubai": "AED",
  "Asia/Kolkata": "INR",
  "Asia/Bangkok": "THB",
  "Asia/Singapore": "SGD",
  "Asia/Shanghai": "CNY",
  "Asia/Tokyo": "JPY",
  "Asia/Seoul": "KRW",
  "Asia/Jakarta": "IDR",
  "Asia/Manila": "PHP",
  // Oceania
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "Australia/Perth": "AUD",
  "Pacific/Auckland": "NZD",
  "Pacific/Honolulu": "USD",
  // Africa
  "Africa/Cairo": "EGP",
  "Africa/Johannesburg": "ZAR",
  "Africa/Lagos": "NGN",
  "Africa/Nairobi": "KES",
};

// Generate options list from the map keys
const COMMON_TIMEZONES = Object.keys(TIMEZONE_CURRENCY_MAP);

const CreateTenantForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    tenant_name: "",
    default_timezone: "UTC",
    default_currency: "USD",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handler: When Timezone changes, Auto-fill Currency
  const handleTimezoneChange = (e) => {
    const newTimezone = e.target.value;

    // Lookup currency, default to current value or USD if not found
    const autoCurrency = TIMEZONE_CURRENCY_MAP[newTimezone] || "USD";

    setFormData({
      ...formData,
      default_timezone: newTimezone,
      default_currency: autoCurrency,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Send data directly (currency is already a string)
      await ownerAPI.createTenant(formData);

      setSuccess("Tenant created successfully");

      // Reset form to defaults
      setFormData({
        tenant_name: "",
        default_timezone: "UTC",
        default_currency: "USD",
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Format Pydantic/FastAPI validation errors
          setError(detail.map((d) => `${d.loc[1]}: ${d.msg}`).join(", "));
        } else {
          setError(detail);
        }
      } else {
        setError("Failed to create tenant. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 fade-in">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Create New Tenant
      </h3>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        <Input
          label="Tenant Name"
          type="text"
          value={formData.tenant_name}
          onChange={(e) =>
            setFormData({ ...formData, tenant_name: e.target.value })
          }
          required
          placeholder="e.g., LuckySpins Casino"
        />

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
                    {tz.replace("_", " ")}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
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
                  default_currency: e.target.value.toUpperCase(), // Force Uppercase
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. USD"
              maxLength={3} // ISO codes are usually 3 chars
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-filled based on timezone, but you can edit it.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
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

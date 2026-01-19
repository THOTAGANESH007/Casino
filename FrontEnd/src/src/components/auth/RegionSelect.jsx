import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../api/auth";
import { adminAPI } from "../../api/admin"; // Or ownerAPI depending on your access control
import { useAuth } from "../../hooks/useAuth";
import ErrorMessage from "../common/ErrorMessage";
import Loading from "../common/Loading";
import Button from "../common/Button";

const RegionSelect = () => {
  // Raw Data
  const [allRegions, setAllRegions] = useState([]);
  const [tenantsMap, setTenantsMap] = useState({}); // Map ID -> Name

  // Form State
  const [selectedRegionName, setSelectedRegionName] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState(""); // This is the final value to submit

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch both Regions and Tenants to link names correctly
      // Note: Ensure your API allows a user without a tenant_id to fetch this list
      const [regionsData, tenantsData] = await Promise.all([
        adminAPI.getRegions(),
        adminAPI.getTenants(), 
      ]);

      setAllRegions(regionsData);

      // Create a lookup map for tenants: { 1: "LuckySpins", 2: "RoyalBet" }
      const tMap = {};
      tenantsData.forEach((t) => {
        tMap[t.tenant_id] = t.tenant_name;
      });
      setTenantsMap(tMap);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load region and tenant data.");
      setLoading(false);
    }
  };

  // 1. Get Unique Region Names for the first dropdown
  const uniqueRegionNames = [
    ...new Set(allRegions.map((r) => r.region_name)),
  ].sort();

  // 2. Filter Tenants based on the selected Region Name
  const availableTenantsForRegion = allRegions.filter(
    (r) => r.region_name === selectedRegionName
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRegionId) {
      setError("Please select a casino tenant");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // We submit the specific region_id which links the User to that specific Tenant & Region configuration
      await authAPI.selectRegion(parseInt(selectedRegionId));
      await refreshUser();
      navigate("/submit-kyc");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to select region");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Loading gaming regions..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Select Your Region
          </h2>
          <p className="mt-2 text-gray-600">
            Choose your location and preferred casino
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorMessage message={error} onClose={() => setError("")} />

          {/* 1. Region Name Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              1. Select Region <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedRegionName}
                onChange={(e) => {
                  setSelectedRegionName(e.target.value);
                  setSelectedRegionId(""); // Reset tenant selection when region changes
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
              >
                <option value="">-- Select Location --</option>
                {uniqueRegionNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          {/* 2. Tenant (Casino) Dropdown - Only appears after region selection */}
          {selectedRegionName && (
            <div className="fade-in">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                2. Select Casino <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                >
                  <option value="">-- Select Casino --</option>
                  {availableTenantsForRegion.map((region) => (
                    <option key={region.region_id} value={region.region_id}>
                      {tenantsMap[region.tenant_id] || `Casino ID: ${region.tenant_id}`}
                      {/* Optional: Show tax rate if relevant */}
                      {region.tax_rate > 0 ? ` (Tax: ${region.tax_rate}%)` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Available casinos in {selectedRegionName}
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting || !selectedRegionId}
            className="w-full"
          >
            {submitting ? "Processing..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegionSelect;
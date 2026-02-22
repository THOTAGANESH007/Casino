import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../api/auth";
import { adminAPI } from "../../api/admin";
import { useAuth } from "../../hooks/useAuth";
import ErrorMessage from "../common/ErrorMessage";
import Loading from "../common/Loading";
import Button from "../common/Button";

const RegionSelect = () => {
  // Raw Data from Backend
  const [regions, setRegions] = useState([]); // List of TenantRegion objects
  const [allTenants, setAllTenants] = useState([]); // List of Tenant objects

  // Form State
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch the global regions and all tenants
      const [regionsRes, tenantsRes] = await Promise.all([
        adminAPI.getRegions(),
        adminAPI.getTenants(),
      ]);

      setRegions(regionsRes.data || regionsRes);
      setAllTenants(tenantsRes.data || tenantsRes);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load region and casino data. Please check your connection.",
      );
      setLoading(false);
    }
  };

  // Logic: Filter tenants based on the selected Region ID
  // In your new schema, every Tenant has a 'region_id' property
  const availableTenants = allTenants.filter(
    (t) => t.region_id === parseInt(selectedRegionId),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRegionId || !selectedTenantId) {
      setError("Please select both a region and a casino brand");
      return;
    }
    const payload = {
      region_id: parseInt(selectedRegionId),
      tenant_id: parseInt(selectedTenantId),
    };
    setSubmitting(true);
    setError("");

    try {
      await authAPI.selectRegion(payload);
      await refreshUser();

      // Move to KYC step
      navigate("/submit-kyc");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save your selection");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Preparing the casino floor..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 to-purple-600 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border-b-8 border-indigo-600">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🌍</div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
            Join the Arena
          </h2>
          <p className="mt-2 text-gray-500 text-sm font-bold uppercase tracking-widest">
            Select Location & Brand
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorMessage message={error} onClose={() => setError("")} />

          {/* 1. REGION SELECTION (PERMANENT) */}
          <div>
            <label className="block text-[10px] font-black text-indigo-600 uppercase mb-2 ml-1">
              Step 1: Your Jurisdiction
            </label>
            <div className="relative">
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setSelectedTenantId(""); // Reset tenant if region changes
                }}
                required
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 appearance-none bg-gray-50 font-bold text-gray-800 transition-all"
              >
                <option value="">-- Select Your Region --</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={r.region_id}>
                    {r.region_name} (Tax: {r.tax_rate}%)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-indigo-600">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 2. TENANT SELECTION (ACTIVE CASINO) */}
          {selectedRegionId && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-[10px] font-black text-indigo-600 uppercase mb-2 ml-1">
                Step 2: Choose Your Casino
              </label>
              <div className="relative">
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-100 rounded-2xl focus:outline-none focus:border-indigo-500 appearance-none bg-indigo-50 font-bold text-indigo-900 transition-all"
                >
                  <option value="">-- Select a Brand --</option>
                  {availableTenants.length > 0 ? (
                    availableTenants.map((t) => (
                      <option key={t.tenant_id} value={t.tenant_id}>
                        🎰 {t.tenant_name} ({t.default_currency})
                      </option>
                    ))
                  ) : (
                    <option disabled>No casinos in this region yet</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-indigo-600">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                Note: You can switch between brands in this region later.
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting || !selectedTenantId}
            className="w-full py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-transform active:scale-95 font-black uppercase tracking-widest"
          >
            {submitting ? "Establishing Connection..." : "Enter Casino"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegionSelect;

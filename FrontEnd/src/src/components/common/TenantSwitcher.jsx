import { useState, useEffect } from "react";
import { authAPI } from "../../api/auth";
import { useAuth } from "../../hooks/useAuth";
import { storage } from "../../utils/storage";

const TenantSwitcher = () => {
  const [tenants, setTenants] = useState([]);
  const [isChanging, setIsChanging] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCasinos = async () => {
      try {
        const res = await authAPI.getAvailableTenants();
        // Accommodate whether your API interceptor returns raw data or the axios response
        const data = res.data || res;
        setTenants(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load available casinos");
        setTenants([]);
      }
    };
    fetchCasinos();
  }, []);

  const handleSwitch = async (e) => {
    const newTenantId = e.target.value;
    if (!newTenantId || Number(newTenantId) === user?.tenant_id) return;

    setIsChanging(true);
    try {
      const data = await authAPI.switchTenant(newTenantId);
      if (data.access_token) {
        // 1. Save new token (triggers auth:change event inside your utility)
        storage.setToken(data.access_token);

        // 2. Update local user object so UI doesn't glitch before reload
        const currentUser = storage.getUser();
        storage.setUser({ ...currentUser, tenant_id: Number(newTenantId) });

        // 3. Reload to fetch new wallet/games data
        window.location.reload();
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Error switching casino.");
      console.error("Switch tenant error:", err);
      setIsChanging(false);
    }
  };

  return (
    // Matches the exact styling of your Navbar Links (Games, Wallet, Profile)
    <div className="flex items-center gap-2 px-4 py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors">
      <span className="text-xs font-bold text-pink-200 uppercase tracking-widest hidden sm:inline-block">
        Casino:
      </span>
      <select
        value={user?.tenant_id || ""}
        onChange={handleSwitch}
        disabled={isChanging}
        className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer"
      >
        {tenants.length === 0 && (
          <option value="" className="text-gray-900">
            Loading...
          </option>
        )}
        {tenants?.map((t) => (
          <option
            key={t.tenant_id}
            value={t.tenant_id}
            className="text-gray-900 bg-white font-semibold"
          >
            {t.tenant_name}
          </option>
        ))}
      </select>

      {/* Loading Spinner */}
      {isChanging && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-1"></div>
      )}
    </div>
  );
};

export default TenantSwitcher;

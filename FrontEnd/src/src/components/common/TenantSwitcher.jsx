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
        setTenants(Array.isArray(res) ? res : []);
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
        storage.setToken(data.access_token);
        const currentUser = storage.getUser();
        storage.setUser({ ...currentUser, tenant_id: Number(newTenantId) });
        localStorage.setItem("token", data.access_token);
        window.location.reload();
      }
    } catch (err) {
      alert("Error switching casino.");
      console.error("Switch tenant error:", err);
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
        Lobby:
      </span>
      <select
        value={user?.tenant_id || ""}
        onChange={handleSwitch}
        disabled={isChanging}
        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-2"
      >
        {tenants?.map((t) => (
          <option key={t.tenant_id} value={t.tenant_id} className="text-black">
            {t.tenant_name}
          </option>
        ))}
      </select>
      {isChanging && (
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      )}
    </div>
  );
};

export default TenantSwitcher;

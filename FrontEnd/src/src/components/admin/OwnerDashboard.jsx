import React, { useState } from "react";
import TenantManagement from "./TenantManagement";
import RegionManagement from "./RegionManagement";
import CreateAdminForm from "./CreateAdminForm";
import GameProviderList from "./GameProviderList";
import TenantAdminList from "./TenantAdminList";

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState("tenants");
  const [refreshAdmins, setRefreshAdmins] = useState(0);

  const tabs = [
    { id: "tenants", label: "Tenants", icon: "🏢" },
    { id: "regions", label: "Regions", icon: "🌍" },
    { id: "providers", label: "Game Providers", icon: "🎮" },
    { id: "createAdmin", label: "Create Admin", icon: "VX" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Casino Owner Dashboard
      </h1>
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-semibold ${activeTab === tab.id ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-600"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === "tenants" && <TenantManagement />}
        {activeTab === "regions" && <RegionManagement />}
        {activeTab === "providers" && <GameProviderList />}
        {activeTab === "createAdmin" && (
          <div className="space-y-8">
            <CreateAdminForm
              onSuccess={() => setRefreshAdmins((prev) => prev + 1)}
            />
            <div className="border-t border-gray-200 pt-8">
              <TenantAdminList refreshTrigger={refreshAdmins} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;

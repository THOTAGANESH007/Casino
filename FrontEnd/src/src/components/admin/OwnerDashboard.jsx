import React, { useState } from "react";
import TenantManagement from "./TenantManagement";
import RegionManagement from "./RegionManagement";
import CreateAdminForm from "./CreateAdminForm";
import GameProviderList from "./GameProviderList";
import TenantAdminList from "./TenantAdminList";
import CatalogManagement from "./CatalogManagement";
import OwnerProfile from "../user/OwnerProfile";

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState("stats");
  const [refreshAdmins, setRefreshAdmins] = useState(0);

  const tabs = [
    { id: "stats", label: "Platform Overview", icon: "📈" },
    { id: "tenants", label: "Tenants", icon: "🏢" },
    { id: "regions", label: "Regions", icon: "🌍" },
    { id: "providers", label: "Game Providers", icon: "🎮" },
    { id: "catalog", label: "Catalog", icon: "📚" },
    { id: "createAdmin", label: "Create Admin", icon: "🛡️" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
        Casino Owner Dashboard
      </h1>

      {/* Tabs Navigation - Made Responsive */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex overflow-x-auto border-b hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-3 md:px-6 md:py-4 font-semibold whitespace-nowrap transition-colors
                ${
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-600 hover:bg-gray-50"
                }
              `}
            >
              <span className="text-lg md:text-xl">{tab.icon}</span>
              <span className="text-sm md:text-base">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Responsive padding & overflow hidden to prevent table spillage */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 overflow-hidden">
        {activeTab === "stats" && <OwnerProfile />}
        {activeTab === "tenants" && <TenantManagement />}
        {activeTab === "regions" && <RegionManagement />}
        {activeTab === "providers" && <GameProviderList />}
        {activeTab === "catalog" && <CatalogManagement />}
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

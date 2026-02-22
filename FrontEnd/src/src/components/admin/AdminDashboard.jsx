import React, { useState } from "react";
import KYCApproval from "./KYCApproval";
import UserManagement from "./UserManagement";
import GameMarketplace from "./GameMarketplace";
import FantasyMatchManager from "./FantasyMatchManager";
import AdminStats from "../user/AdminStats";
import RealFantasyAdmin from "./RealFantasyAdmin";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("stats");

  const tabs = [
    { id: "stats", label: "Overview", icon: "📊", component: AdminStats },
    { id: "users", label: "My Players", icon: "👥", component: UserManagement },
    {
      id: "marketplace",
      label: "Game Marketplace",
      icon: "🏪",
      component: GameMarketplace,
    },
    { id: "kyc", label: "KYC Approval", icon: "📄", component: KYCApproval },
    {
      id: "fantasy",
      label: "Fantasy Cricket",
      icon: "🏏",
      component: FantasyMatchManager,
    },
    {
      id: "real-fantasy",
      label: "Real Fantasy (Auto)",
      icon: "🌍",
      component: RealFantasyAdmin,
    },
  ];

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
        Tenant Admin Dashboard
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
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default AdminDashboard;

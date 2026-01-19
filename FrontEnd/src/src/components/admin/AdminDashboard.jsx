import React, { useState } from "react";
import KYCApproval from "./KYCApproval";
import UserManagement from "./UserManagement";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("kyc");

  const tabs = [
    { id: "kyc", label: "KYC Approval", icon: "📄", component: KYCApproval },
    { id: "users", label: "My Players", icon: "👥", component: UserManagement },
  ];

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Tenant Admin Dashboard
      </h1>
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-6 py-4 font-semibold transition-colors
                ${
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};
export default AdminDashboard;

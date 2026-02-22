import { useState, useEffect } from "react";
import { statsAPI } from "../../api/stats";
import { userAPI } from "../../api/user";
import { formatCurrency } from "../../utils/helpers";
import Loading from "../common/Loading";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import Badge from "../common/Badge";
import SuccessMessage from "../common/SuccessMessage";
import ErrorMessage from "../common/ErrorMessage";

const AdminProfile = () => {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, profileRes] = await Promise.all([
          statsAPI.getAdminProfile(),
          userAPI.getProfile(),
        ]);
        setStats(statsRes);
        setProfile(profileRes);
      } catch (err) {
        console.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);
      await userAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setSuccess("Password updated successfully!");
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 h-32 w-full relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 border-2 border-white">
                {profile?.full_name?.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {profile?.full_name}
            </h1>
            <p className="text-gray-500 font-medium">{profile?.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="info">Tenant Administrator</Badge>
              <Badge variant="success">Account Active</Badge>
            </div>
          </div>
          <Button variant="primary" onClick={() => setShowPasswordModal(true)}>
            🔒 Update Security
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal & Managed Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
              Management Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoItem
                label="Managing Branch"
                value={profile?.tenant_name}
                icon="🏢"
              />
              <InfoItem
                label="Operating Region"
                value={profile?.region_name || "Global / Not Assigned"}
                icon="🌍"
              />
              <InfoItem
                label="Default Currency"
                value={profile?.currency}
                icon="💰"
              />
              <InfoItem
                label="Management Level"
                value="Level 2 (Full Access)"
                icon="🛡️"
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
              Account Permissions
            </h3>
            <div className="space-y-4">
              <PermissionToggle label="Manage Player Wallets" active={true} />
              <PermissionToggle label="Approve/Reject KYC" active={true} />
              <PermissionToggle label="Modify Table Rules" active={true} />
              <PermissionToggle
                label="Access Financial Reports"
                active={true}
              />
              <PermissionToggle label="Create Sub-Admins" active={false} />
            </div>
          </div>
        </div>

        {/* Right Column: Performance Summary (Minimized) */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
              Branch Snapshot (NGR)
            </h3>
            <p className="text-4xl font-black text-white mb-2">
              {formatCurrency(stats?.ngr)}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-green-400">
              <span className="p-1 rounded bg-green-400/20 text-[8px]">
                ▲ 12.5%
              </span>
              <span className="text-gray-400">Since last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Managed Users
            </h3>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {stats?.active_users_30d}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Monthly Active
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">
                  {stats?.active_users_24h}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  In Last 24h
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal remains the same */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Security Settings"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
          />
          <hr className="border-gray-100" />
          <Input
            label="New Password"
            type="password"
            required
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                confirmPassword: e.target.value,
              })
            }
          />
          <div className="pt-4 flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={passwordLoading}
            >
              {passwordLoading ? "Processing..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* --- Helper Sub-components --- */

const InfoItem = ({ label, value, icon }) => (
  <div className="flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg shadow-sm border border-gray-100">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
        {label}
      </p>
      <p className="text-sm font-bold text-gray-800">{value || "N/A"}</p>
    </div>
  </div>
);

const PermissionToggle = ({ label, active }) => (
  <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
    <span className="text-sm font-bold text-gray-700">{label}</span>
    <div
      className={`w-3 h-3 rounded-full ${active ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-gray-300"}`}
    ></div>
  </div>
);

export default AdminProfile;

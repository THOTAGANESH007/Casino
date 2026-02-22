import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userAPI } from "../../api/user";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";
import Badge from "../common/Badge";
import { formatCurrency, formatDateTime } from "../../utils/helpers";
import Modal from "../common/Modal";
import Input from "../common/Input";
import SuccessMessage from "../common/SuccessMessage";

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'history'
  const [success, setSuccess] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileData, historyData, activeData] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getHistory(),
        userAPI.getActiveSessions(),
      ]);

      setProfile(profileData);
      setHistory(historyData);
      setActiveSessions(activeData);
    } catch (err) {
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;

    if (!passwordRegex.test(passwordData.newPassword)) {
      setError(
        "Password must be at least 8 characters and include a letter, number, and special character",
      );
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

  const handleResumeGame = (gameName) => {
    // Map game names to frontend routes
    const routes = {
      Blackjack: "/games/blackjack",
      Roulette: "/games/roulette",
      Slots: "/games/slots",
      Crash: "/games/crash",
      Mines: "/games/mines",
      Dice: "/games/dice",
    };

    const route = routes[gameName];
    if (route) {
      navigate(route);
    } else {
      alert("Game route not found");
    }
  };

  if (loading) return <Loading message="Loading profile..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {/* 1. Profile Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* User Card */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-linear-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile?.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.full_name}
              </h2>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tenant:</span>
              <span className="font-semibold">{profile?.tenant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">KYC Status:</span>
              <Badge variant={profile?.kyc_status ? "success" : "warning"}>
                {profile?.kyc_status ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Currency:</span>
              <span className="font-semibold">{profile?.currency}</span>
            </div>
            {/* Change Password Button */}
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setShowPasswordModal(true)}
              >
                🔒 Change Password
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
            <p className="text-blue-100 text-sm font-semibold mb-1">
              Total Wagered
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(profile?.stats.total_wagered)}
            </p>
          </div>
          <div className="bg-linear-to-br from-green-500 to-emerald-600 rounded-xl shadow-md p-6 text-white">
            <p className="text-green-100 text-sm font-semibold mb-1">
              Total Won
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(profile?.stats.total_payout)}
            </p>
          </div>
          <div
            className={`rounded-xl shadow-md p-6 text-white ${profile?.stats.net_profit >= 0 ? "bg-linear-to-br from-indigo-500 to-purple-600" : "bg-linear-to-br from-red-500 to-pink-600"}`}
          >
            <p className="text-white/80 text-sm font-semibold mb-1">
              Net Profit
            </p>
            <p className="text-3xl font-bold">
              {profile?.stats.net_profit > 0 ? "+" : ""}
              {formatCurrency(profile?.stats.net_profit)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden min-h-100">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === "active"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Running Games ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === "history"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Game History
          </button>
        </div>

        <div className="p-6">
          {/* Active Sessions Tab */}
          {activeTab === "active" && (
            <div>
              {activeSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🎮</div>
                  <p>No active games found.</p>
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => navigate("/games")}
                  >
                    Browse Games
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-900">
                          {session.game_name}
                        </h3>
                        <Badge variant="warning">In Progress</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Started: {formatDateTime(session.started_at)}
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleResumeGame(session.game_name)}
                      >
                        Resume Game →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Game
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Wager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((game) => (
                    <tr key={game.session_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {game.game_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(game.ended_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(game.total_bet)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(game.total_payout)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            game.status === "won"
                              ? "success"
                              : game.status === "lost"
                                ? "danger"
                                : "default"
                          }
                        >
                          {game.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No game history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* CHANGE PASSWORD MODAL */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Update Security"
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
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./src/context/AuthContext.jsx";
import ProtectedRoute from "./src/components/common/ProtectedRoute.jsx";
import Navbar from "./src/components/common/Navbar.jsx";

// Auth Components
import Signup from "./src/components/auth/Signup";
import Login from "./src/components/auth/Login";
import RegionSelect from "./src/components/auth/RegionSelect";
import KYCSubmit from "./src/components/auth/KYCSubmit";
import PendingVerification from "./src/components/auth/PendingVerification";

// Admin Components
import AdminDashboard from "./src/components/admin/AdminDashboard";
import OwnerDashboard from "./src/components/admin/OwnerDashboard";

// Wallet Components
import WalletOverview from "./src/components/wallet/WalletOverview";

// Game Components
import GamesList from "./src/components/games/GamesList";
import Blackjack from "./src/components/games/Blackjack";
import Dice from "./src/components/games/Dice";
import Slots from "./src/components/games/Slots";
import Roulette from "./src/components/games/Roulette";
import FantasyCricket from "./src/components/games/FantasyCricket";
import Crash from "./src/components/games/Crash";
import Mines from "./src/components/games/Mines";
import ForgotPassword from "./src/components/auth/ForgotPassword.jsx";
import UserProfile from "./src/components/user/UserProfile.jsx";
import ResponsibleGaming from "./src/components/user/ResponsibleGaming.jsx";
import { useAuth } from "./src/hooks/useAuth.js";
import AdminProfile from "./src/components/user/AdminProfile.jsx";
import OwnerProfile from "./src/components/user/OwnerProfile.jsx";
import RealMatches from "./src/components/games/RealMatches.jsx";
import RealTeamBuilder from "./src/components/games/RealTeamBuilder.jsx";
import MyTeamsPage from "./src/components/pages/MyTeamsPage.jsx";
import LeaderboardPage from "./src/components/pages/LeaderboardPage.jsx";
import { WalletProvider } from "./src/hooks/useWallet.jsx";

const RoleBasedRedirect = () => {
  const { isAuthenticated, isAdmin, isCasinoOwner } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isCasinoOwner) {
    return <Navigate to="/owner-dashboard" replace />;
  }

  // Default for regular users
  return <Navigate to="/games" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<RoleBasedRedirect />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Onboarding Routes */}
                <Route
                  path="/select-region"
                  element={
                    <ProtectedRoute>
                      <RegionSelect />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/submit-kyc"
                  element={
                    <ProtectedRoute>
                      <KYCSubmit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pending-verification"
                  element={<PendingVerification />}
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin-profile"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminProfile />
                    </ProtectedRoute>
                  }
                />

                {/* Casino Owner Route */}
                <Route
                  path="/owner-dashboard"
                  element={
                    <ProtectedRoute ownerOnly>
                      <OwnerDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/owner-profile"
                  element={
                    <ProtectedRoute ownerOnly>
                      <OwnerProfile />
                    </ProtectedRoute>
                  }
                />
                {/* User Routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/responsible-gaming"
                  element={
                    <ProtectedRoute>
                      <ResponsibleGaming />
                    </ProtectedRoute>
                  }
                />

                {/* Wallet Routes */}
                <Route
                  path="/wallet"
                  element={
                    <ProtectedRoute>
                      <WalletOverview />
                    </ProtectedRoute>
                  }
                />

                {/* Game Routes */}
                <Route
                  path="/games"
                  element={
                    <ProtectedRoute>
                      <GamesList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/blackjack"
                  element={
                    <ProtectedRoute>
                      <Blackjack />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/dice"
                  element={
                    <ProtectedRoute>
                      <Dice />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/slots"
                  element={
                    <ProtectedRoute>
                      <Slots />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/games/roulette"
                  element={
                    <ProtectedRoute>
                      <Roulette />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/games/fantasy-cricket"
                  element={
                    <ProtectedRoute>
                      <FantasyCricket />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/games/crash"
                  element={
                    <ProtectedRoute>
                      <Crash />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/games/mines"
                  element={
                    <ProtectedRoute>
                      <Mines />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/real-fantasy"
                  element={
                    <ProtectedRoute>
                      <RealMatches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games/real-fantasy/create/:matchId"
                  element={
                    <ProtectedRoute>
                      <RealTeamBuilder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-teams"
                  element={
                    <ProtectedRoute>
                      <MyTeamsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard/:matchId"
                  element={
                    <ProtectedRoute>
                      <LeaderboardPage />
                    </ProtectedRoute>
                  }
                />
                {/* 404 - Redirect to games */}
                <Route path="*" element={<Navigate to="/games" replace />} />
              </Routes>
            </main>
          </div>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

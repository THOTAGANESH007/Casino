import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Loading from "./Loading";

const ProtectedRoute = ({ children, adminOnly = false, ownerOnly = false }) => {
  const { isAuthenticated, loading, isAdmin, user, isCasinoOwner, isPlayer } =
    useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (ownerOnly && !isCasinoOwner) return <Navigate to="/games" replace />;

  // --- PLAYER ONBOARDING LOGIC ---
  if (isPlayer) {
    // 1. REGION CHECK: Must have Tenant ID
    if (!user?.tenant_id) {
      if (location.pathname !== "/select-region") {
        return <Navigate to="/select-region" replace />;
      }
      return children;
    }

    // 2. KYC CHECK: Not Uploaded the KYC Documents
    if (!user?.kyc_id) {
      if (location.pathname !== "/submit-kyc") {
        return <Navigate to="/submit-kyc" replace />;
      }
      return children;
    }

    // KYC Uploaded but Not Verified
    if (user?.kyc_id && !user?.is_kyc_verified) {
      if (location.pathname !== "/pending-verification") {
        return <Navigate to="/pending-verification" replace />;
      }
      return children;
    }

    // 3. If Blocked by the Tenant Admin
    if (user?.is_active === false) {
      if (location.pathname !== "/suspended-account") {
        return <Navigate to="/suspended-account" replace />;
      }
      return children;
    }
  }

  return children;
};

export default ProtectedRoute;
